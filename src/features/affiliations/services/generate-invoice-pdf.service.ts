import PDFDocument from 'pdfkit';
import pool from '../../../config/database.js';
import logger from '../../../shared/utils/logger.js';
import { resolve } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInvoiceFilePath(affiliationId: number, month: number, year: number): string {
  return resolve(process.cwd(), 'uploads', 'invoices', `invoice-${affiliationId}-${year}-${String(month).padStart(2, '0')}.pdf`);
}

function ensureInvoicesDir(): void {
  const dir = resolve(process.cwd(), 'uploads', 'invoices');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(val || 0);
}

function getMonthName(m: number): string {
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return months[m - 1] ?? String(m);
}

function formatDate(): string {
  return new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class GenerateInvoicePdfService {
  /**
   * Serves the invoice PDF.
   * If already on disk → serves instantly.
   * If not → generates lazily, saves, then serves.
   */
  async execute(affiliationId: number, month: number, year: number, agencyId: number): Promise<Buffer> {
    const filePath = getInvoiceFilePath(affiliationId, month, year);

    if (existsSync(filePath)) {
      logger.info('Serving existing invoice PDF from disk', { affiliationId, month, year });
      return readFileSync(filePath);
    }

    logger.info('Invoice not on disk, generating lazily', { affiliationId, month, year });
    return this.generateAndSave(affiliationId, month, year, agencyId);
  }

  /**
   * Checks if invoice exists, if not generates it. Returns true if it already existed.
   */
  async executeWithCheck(affiliationId: number, month: number, year: number, agencyId: number): Promise<boolean> {
    const filePath = getInvoiceFilePath(affiliationId, month, year);

    if (existsSync(filePath)) {
      return true;
    }

    await this.generateAndSave(affiliationId, month, year, agencyId);
    return false;
  }

  /**
   * Generates and persists the invoice PDF.
   * Called automatically on status change to "En Proceso"/"Pagado".
   */
  async generateAndSave(affiliationId: number, month: number, year: number, agencyId: number): Promise<Buffer> {
    logger.info('Generating invoice PDF', { affiliationId, month, year, agencyId });

    const data = await this.fetchAffiliationData(affiliationId, month, year, agencyId);
    const pdfBuffer = await this.buildPdf(data);

    ensureInvoicesDir();
    const filePath = getInvoiceFilePath(affiliationId, month, year);
    writeFileSync(filePath, pdfBuffer);
    logger.info('Invoice PDF saved', { filePath });

    return pdfBuffer;
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private async fetchAffiliationData(affiliationId: number, month: number, year: number, agencyId: number): Promise<any> {
    const sql = `
      SELECT
        a.id,
        CONCAT_WS(' ', c.first_name, c.second_name, c.first_lastname, c.second_lastname) AS client_name,
        c.identification   AS client_identification,
        co.name            AS company_name,
        a.start_date,
        mp.month,
        mp.year,
        mp.value,
        COALESCE(e.name,  '—') AS eps_name,
        COALESCE(ar.name, '—') AS arl_name,
        COALESCE(cc.name, '—') AS ccf_name,
        COALESCE(p.name,  '—') AS pension_name,
        a.risk_level,
        mp.payment_status,
        mp.payment_method,
        a.observation,
        o.name             AS office_name,
        o.address          AS office_address,
        o.logo_url         AS logo_url,
        ag.name            AS agency_name
      FROM affiliations a
        INNER JOIN client_employers  ce ON ce.id  = a.client_employer_id
        INNER JOIN clients           c  ON c.id   = ce.client_id
        INNER JOIN companies         co ON co.id  = ce.company_id
        INNER JOIN offices           o  ON o.id   = ce.office_id
        INNER JOIN agencies          ag ON ag.id  = co.agency_id
        LEFT  JOIN eps_list          e  ON e.id   = a.eps_id
        LEFT  JOIN arl_list          ar ON ar.id  = a.arl_id
        LEFT  JOIN ccf_list          cc ON cc.id  = a.ccf_id
        LEFT  JOIN pension_fund_list p  ON p.id   = a.pension_id
        LEFT  JOIN monthly_payments  mp ON mp.affiliation_id = a.id AND mp.month = ? AND mp.year = ?
      WHERE a.id = ? AND co.agency_id = ?
    `;

    const [rows]: any = await pool.query(sql, [month, year, affiliationId, agencyId]);

    if (!rows || rows.length === 0) {
      throw Object.assign(new Error('Afiliación o pago no encontrado para el periodo seleccionado.'), { status: 404 });
    }

    const data = rows[0];

    if (!['En Proceso', 'Pagado'].includes(data.payment_status)) {
      throw Object.assign(new Error('Solo se puede generar la factura si el estado es En Proceso o Pagado.'), { status: 400 });
    }

    return data;
  }

  private buildPdf(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 0,
          info: {
            Title: `Comprobante ${data.year}-${String(data.month).padStart(2, '0')}-${String(data.id).padStart(4, '0')}`,
            Author: data.agency_name || 'Seguridad Social',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.renderPdf(doc, data);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private renderPdf(doc: PDFKit.PDFDocument, data: any): void {
    const W = 595.28;   // A4 width in points
    const H = 841.89;   // A4 height in points
    const margin = 40;
    const contentWidth = W - margin * 2;

    // ── Colour palette ──────────────────────────────────────────────────────
    const BLUE        = '#2563EB';
    const BLUE_DARK   = '#1D4ED8';
    const BLUE_LIGHT  = '#EFF6FF';
    const GRAY_800    = '#1E293B';
    const GRAY_500    = '#64748B';
    const GRAY_200    = '#E2E8F0';
    const GREEN       = '#166534';
    const GREEN_BG    = '#DCFCE7';
    const AMBER       = '#92400E';
    const AMBER_BG    = '#FEF9C3';
    const WHITE       = '#FFFFFF';

    // ── Top accent bar ───────────────────────────────────────────────────────
    doc.rect(0, 0, W, 8).fill(BLUE);

    // ── Background ───────────────────────────────────────────────────────────
    doc.rect(0, 8, W, H - 8).fill('#F8FAFC');

    // ── White card area ───────────────────────────────────────────────────────
    doc.roundedRect(margin - 10, 28, W - (margin - 10) * 2, H - 56, 12)
      .fill(WHITE);

    let y = 48;

    // ── Logo / agency name ────────────────────────────────────────────────────
    let logoLoaded = false;
    if (data.logo_url) {
      try {
        const cleanPath = data.logo_url.replace(/^\//, '');
        const logoPath = resolve(process.cwd(), '../seguridad-social-front/public', cleanPath);
        doc.image(logoPath, margin, y, { height: 50, fit: [120, 50] });
        logoLoaded = true;
      } catch {
        // fallback below
      }
    }

    if (!logoLoaded) {
      // Placeholder square with initial
      doc.roundedRect(margin, y, 50, 50, 8).fill(BLUE);
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(22)
        .text((data.office_name || 'S').charAt(0).toUpperCase(), margin, y + 13, { width: 50, align: 'center' });
    }

    // Agency / office info
    doc.fillColor(GRAY_800).font('Helvetica-Bold').fontSize(16)
      .text(data.office_name || 'Seguridad Social', margin + 64, y + 6, { width: contentWidth - 260 });

    // Invoice label + number (right side)
    const invoiceNumber = `${data.year}-${String(data.month).padStart(2, '0')}-${String(data.id).padStart(4, '0')}`;
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(22)
      .text('COMPROBANTE', margin, y + 2, { width: contentWidth, align: 'right' });
    doc.fillColor(GRAY_500).font('Helvetica').fontSize(11)
      .text(`No. ${invoiceNumber}`, margin, y + 28, { width: contentWidth, align: 'right' });

    // Status badge
    const statusColor  = data.payment_status === 'Pagado' ? GREEN : AMBER;
    const statusBg     = data.payment_status === 'Pagado' ? GREEN_BG : AMBER_BG;
    const statusText   = `ESTADO: ${(data.payment_status || '').toUpperCase()}`;
    const badgeW = 160; const badgeH = 22;
    const badgeX = W - margin - badgeW;
    doc.roundedRect(badgeX, y + 50, badgeW, badgeH, 11).fill(statusBg);
    doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(9)
      .text(statusText, badgeX, y + 56, { width: badgeW, align: 'center' });

    y += 90;

    // ── Divider ────────────────────────────────────────────────────────────────
    doc.moveTo(margin, y).lineTo(W - margin, y).strokeColor(BLUE_LIGHT).lineWidth(2).stroke();
    y += 16;

    // ── Info boxes ─────────────────────────────────────────────────────────────
    const boxW = (contentWidth - 16) / 2;
    const drawInfoBox = (x: number, bY: number, title: string, rows: [string, string][]) => {
      const bH = 22 + rows.length * 22 + 14;
      doc.roundedRect(x, bY, boxW, bH, 8).fill(BLUE_LIGHT);
      doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(9)
        .text(title.toUpperCase(), x + 14, bY + 10, { width: boxW - 28, characterSpacing: 0.8 });
      rows.forEach(([label, value], i) => {
        const rowY = bY + 26 + i * 22;
        doc.fillColor(GRAY_500).font('Helvetica').fontSize(10).text(label, x + 14, rowY, { width: 90 });
        doc.fillColor(GRAY_800).font('Helvetica-Bold').fontSize(10).text(value || '—', x + 108, rowY, { width: boxW - 122 });
        if (i < rows.length - 1) {
          doc.moveTo(x + 14, rowY + 18).lineTo(x + boxW - 14, rowY + 18).strokeColor(GRAY_200).lineWidth(0.5).stroke();
        }
      });
      return bH;
    };

    const leftH = drawInfoBox(margin, y, 'Facturar A', [
      ['Cliente:',        data.client_name || '—'],
      ['Identificación:', data.client_identification || '—'],
      ['Empresa:',        data.company_name || '—'],
    ]);

    const rightH = drawInfoBox(margin + boxW + 16, y, 'Detalles del Documento', [
      ['Emisión:',   formatDate()],
      ['Periodo:',   `${getMonthName(data.month)} ${data.year}`],
      ['Método:',    data.payment_method || 'Por Definir'],
    ]);

    y += Math.max(leftH, rightH) + 20;

    // ── Items table ────────────────────────────────────────────────────────────
    const colDesc = margin;
    const colEnt  = margin + 220;
    const colVal  = W - margin - 120;
    const colValW = 120;

    // Header
    doc.roundedRect(margin, y, contentWidth, 28, 6).fill(BLUE_LIGHT);
    doc.fillColor(BLUE_DARK).font('Helvetica-Bold').fontSize(9)
      .text('DESCRIPCIÓN DEL SERVICIO', colDesc + 10, y + 9, { width: colEnt - colDesc - 10, characterSpacing: 0.5 })
      .text('ENTIDADES ASIGNADAS',      colEnt,       y + 9, { width: colVal - colEnt - 10,  characterSpacing: 0.5 })
      .text('IMPORTE',                  colVal,        y + 9, { width: colValW, align: 'right', characterSpacing: 0.5 });
    y += 36;

    // Row bg
    const rowH = 88;
    doc.roundedRect(margin, y - 6, contentWidth, rowH, 6).fill(WHITE)
      .roundedRect(margin, y - 6, contentWidth, rowH, 6).strokeColor(GRAY_200).lineWidth(1).stroke();

    doc.fillColor(GRAY_800).font('Helvetica-Bold').fontSize(11)
      .text('Aportes a Seguridad Social Integral', colDesc + 10, y + 4, { width: colEnt - colDesc - 20 });
    doc.fillColor(GRAY_500).font('Helvetica').fontSize(9)
      .text(`Periodo: ${getMonthName(data.month)} ${data.year}`, colDesc + 10, y + 22, { width: colEnt - colDesc - 20 })
      .text('Incluye gestión y administración.', colDesc + 10, y + 34, { width: colEnt - colDesc - 20 });

    const services = [
      ['EPS', data.eps_name], ['AFP', data.pension_name],
      ['ARL', `${data.arl_name}${data.risk_level ? ' (Riesgo ' + data.risk_level + ')' : ''}`],
      ['CCF', data.ccf_name],
    ];
    let currentY = y + 4;
    services.forEach(([label, val]) => {
      doc.fillColor(GRAY_500).font('Helvetica').fontSize(9)
        .text(`${label}:`, colEnt, currentY, { width: 30 });
      
      doc.fillColor(GRAY_800).font('Helvetica-Bold');
      const valStr = val || '—';
      const textHeight = doc.heightOfString(valStr, { width: colVal - colEnt - 35 });
      
      doc.text(valStr, colEnt + 30, currentY, { width: colVal - colEnt - 35 });
      
      currentY += textHeight + 4;
    });

    doc.fillColor(BLUE_DARK).font('Helvetica-Bold').fontSize(14)
      .text(formatCurrency(data.value), colVal, y + 28, { width: colValW, align: 'right' });

    y += rowH + 20;

    // ── Totals ─────────────────────────────────────────────────────────────────
    const totalsX = W - margin - 220;
    const totalsW = 220;
    doc.roundedRect(totalsX, y, totalsW, 84, 8).fill(BLUE_LIGHT);

    const drawTotalRow = (label: string, value: string, tY: number, bold = false) => {
      doc.fillColor(bold ? BLUE_DARK : GRAY_500)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 10)
        .text(label, totalsX + 14, tY, { width: 100 });
      doc.fillColor(bold ? BLUE_DARK : GRAY_800)
        .font('Helvetica-Bold').fontSize(bold ? 14 : 10)
        .text(value, totalsX + 14, tY, { width: totalsW - 28, align: 'right' });
    };

    drawTotalRow('Subtotal',     formatCurrency(data.value), y + 14);
    doc.moveTo(totalsX + 14, y + 36).lineTo(totalsX + totalsW - 14, y + 36)
      .strokeColor(BLUE_DARK).lineWidth(0.5).stroke();
    drawTotalRow('Impuestos (0%)', '$0',                      y + 42);
    doc.moveTo(totalsX + 14, y + 62).lineTo(totalsX + totalsW - 14, y + 62)
      .strokeColor(BLUE_DARK).lineWidth(1).dash(4, { space: 3 }).stroke();
    drawTotalRow('TOTAL A PAGAR', formatCurrency(data.value), y + 66, true);

    y += 104;

    // ── Footer ─────────────────────────────────────────────────────────────────
    doc.moveTo(margin, y).lineTo(W - margin, y).strokeColor(GRAY_200).undash().lineWidth(1).stroke();
    y += 14;

    doc.fillColor(GRAY_800).font('Helvetica-Bold').fontSize(10)
      .text('Términos y Condiciones', margin, y);
    doc.fillColor(GRAY_500).font('Helvetica').fontSize(9)
      .text(
        'Este comprobante certifica la gestión de pago de los aportes al sistema general de seguridad social integral. '
        + 'Los pagos a las entidades se realizan en los plazos establecidos por la ley.',
        margin, y + 14, { width: contentWidth * 0.58 }
      );

    doc.fillColor(GRAY_800).font('Helvetica-Bold').fontSize(10)
      .text('Gracias por preferir nuestros servicios', margin + contentWidth * 0.62, y, { width: contentWidth * 0.38, align: 'right' });
    doc.fillColor(GRAY_500).font('Helvetica').fontSize(8)
      .text(`Generado automáticamente el ${formatDate()}`, margin + contentWidth * 0.62, y + 14, { width: contentWidth * 0.38, align: 'right' });
  }
}
