import puppeteer, { Browser } from 'puppeteer';
import pool from '../../../config/database.js';
import logger from '../../../shared/utils/logger.js';
import { resolve } from 'path';
import { readFileSync } from 'fs';

let browserInstance: Browser | null = null;

async function getBrowserInstance() {
  if (browserInstance && !browserInstance.connected) {
    browserInstance = null;
  }
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
  }
  return browserInstance;
}

export class GenerateInvoicePdfService {
  async execute(affiliationId: number, month: number, year: number, agencyId: number): Promise<Buffer> {
    logger.info('Generating invoice PDF', { affiliationId, month, year, agencyId });

    // 1. Fetch affiliation details
    const sql = `
      SELECT
        a.id,
        ce.client_id,
        CONCAT_WS(' ', c.first_name, c.second_name, c.first_lastname, c.second_lastname) AS client_name,
        c.identification   AS client_identification,
        co.name            AS company_name,
        a.start_date,
        mp.month,
        mp.year,
        mp.value,
        COALESCE(e.name, '—') AS eps_name,
        COALESCE(ar.name, '—') AS arl_name,
        COALESCE(cc.name, '—') AS ccf_name,
        COALESCE(p.name, '—')  AS pension_name,
        a.risk_level,
        mp.payment_status,
        mp.payment_method,
        a.observation,
        o.name             AS office_name,
        o.address          AS office_address,
        o.logo_url         AS logo_url,
        ag.name            AS agency_name
      FROM affiliations a
        INNER JOIN client_employers ce ON ce.id = a.client_employer_id
        INNER JOIN clients          c  ON c.id  = ce.client_id
        INNER JOIN companies        co ON co.id = ce.company_id
        INNER JOIN offices          o  ON o.id  = ce.office_id
        INNER JOIN agencies         ag ON ag.id = co.agency_id
        LEFT  JOIN eps_list         e  ON e.id  = a.eps_id
        LEFT  JOIN arl_list         ar ON ar.id = a.arl_id
        LEFT  JOIN ccf_list         cc ON cc.id = a.ccf_id
        LEFT  JOIN pension_fund_list p ON p.id  = a.pension_id
        LEFT  JOIN monthly_payments mp ON mp.affiliation_id = a.id AND mp.month = ? AND mp.year = ?
      WHERE a.id = ? AND co.agency_id = ?
    `;

    const [rows]: any = await pool.query(sql, [month, year, affiliationId, agencyId]);
    
    if (!rows || rows.length === 0) {
      throw Object.assign(new Error('Afiliación o pago no encontrado para el periodo seleccionado.'), { status: 404 });
    }

    const data = rows[0];

    if (data.payment_status !== 'Pagado') {
      throw Object.assign(new Error('Solo se puede generar la factura si el estado es Pagado.'), { status: 400 });
    }

    // 3. Generate HTML
    const html = this.generateHtml(data);

    // 4. Convert to PDF using puppeteer
    const browser = await getBrowserInstance();
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
      printBackground: true
    });
    
    await page.close();

    return Buffer.from(pdfBuffer);
  }

  private generateHtml(data: any): string {
    const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val || 0);
    };

    const formatDate = () => {
      const d = new Date();
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const getMonthName = (m: number) => {
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return months[m - 1] || m;
    };

    const invoiceNumber = `${data.year}-${String(data.month).padStart(2, '0')}-${String(data.id).padStart(4, '0')}`;
    
    let logoHtml = `<div class="logo-placeholder"><span>${data.office_name.charAt(0).toUpperCase()}</span></div>`;
    if (data.logo_url) {
      try {
        const cleanPath = data.logo_url.replace(/^\//, '');
        // Usamos path relativo al cwd del backend. Esto asume que el frontend y backend están en carpetas hermanas
        const logoPath = resolve(process.cwd(), '../seguridad-social-front/public', cleanPath);
        const ext = cleanPath.split('.').pop() || 'png';
        const base64 = readFileSync(logoPath, 'base64');
        logoHtml = `<img src="data:image/${ext};base64,${base64}" alt="Logo Agencia" class="logo">`;
      } catch (err) {
        logger.warn('No se pudo cargar el logo como base64', { err: err instanceof Error ? err.message : String(err) });
      }
    }

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Factura No. ${invoiceNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --primary: #2563eb;
                --primary-dark: #1d4ed8;
                --primary-light: #eff6ff;
                --accent: #f59e0b;
                --text-main: #0f172a;
                --text-muted: #64748b;
                --border: #e2e8f0;
                --bg-main: #ffffff;
                --bg-subtle: #f8fafc;
            }

            * {
                box-sizing: border-box;
                -webkit-font-smoothing: antialiased;
            }

            body {
                font-family: 'Outfit', sans-serif;
                font-size: 13px;
                margin: 0;
                padding: 0;
                color: var(--text-main);
                background-color: var(--bg-subtle);
                line-height: 1.5;
            }

            .page-container {
                width: 210mm;
                min-height: 297mm;
                background: var(--bg-main);
                margin: 0 auto;
                padding: 50px 40px;
                position: relative;
                box-shadow: 0 0 20px rgba(0,0,0,0.05);
            }

            /* Decoración superior */
            .top-bar {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 8px;
                background: linear-gradient(90deg, var(--primary) 0%, #3b82f6 100%);
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 40px;
                padding-bottom: 30px;
                border-bottom: 2px solid var(--primary-light);
            }

            .header-left {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .logo {
                max-width: 140px;
                max-height: 70px;
                object-fit: contain;
            }

            .logo-placeholder {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, var(--primary), var(--primary-dark));
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 24px;
                font-weight: bold;
                box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
            }

            .company-details h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 700;
                color: var(--text-main);
                letter-spacing: -0.5px;
            }

            .company-details p {
                margin: 4px 0 0 0;
                color: var(--text-muted);
                font-size: 13px;
            }

            .invoice-title {
                text-align: right;
            }

            .invoice-title h2 {
                margin: 0;
                font-size: 32px;
                font-weight: 700;
                color: var(--primary);
                letter-spacing: -1px;
                text-transform: uppercase;
            }

            .invoice-title .invoice-no {
                font-size: 16px;
                font-weight: 600;
                color: var(--text-muted);
                margin-top: 5px;
            }

            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 40px;
            }

            .info-box {
                background: var(--bg-subtle);
                border-radius: 12px;
                padding: 20px;
                border: 1px solid var(--border);
            }

            .info-box h3 {
                margin: 0 0 12px 0;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: var(--primary);
                font-weight: 700;
            }

            .info-box p {
                margin: 6px 0;
                display: flex;
                justify-content: space-between;
                border-bottom: 1px dashed var(--border);
                padding-bottom: 6px;
            }
            .info-box p:last-child {
                border-bottom: none;
                padding-bottom: 0;
            }

            .info-box strong {
                color: var(--text-muted);
                font-weight: 500;
            }

            .info-box span {
                font-weight: 600;
                color: var(--text-main);
                text-align: right;
            }

            table.items {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                margin-bottom: 30px;
                border: 1px solid var(--border);
                border-radius: 12px;
                overflow: hidden;
            }

            table.items thead {
                background: var(--primary-light);
            }

            table.items th {
                padding: 14px 20px;
                text-align: left;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--primary-dark);
                font-weight: 600;
                border-bottom: 2px solid var(--border);
            }

            table.items th:last-child {
                text-align: right;
            }

            table.items td {
                padding: 16px 20px;
                border-bottom: 1px solid var(--border);
                vertical-align: top;
            }

            table.items tr:last-child td {
                border-bottom: none;
            }

            .item-name {
                font-weight: 600;
                color: var(--text-main);
                font-size: 14px;
                margin-bottom: 4px;
            }

            .item-desc {
                color: var(--text-muted);
                font-size: 12px;
            }

            .item-price {
                text-align: right;
                font-weight: 600;
                font-size: 15px;
                color: var(--text-main);
            }

            .totals {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 40px;
            }

            .totals-box {
                width: 300px;
                background: var(--primary-light);
                border-radius: 12px;
                padding: 20px;
                border: 1px solid rgba(37, 99, 235, 0.2);
            }

            .total-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
            }

            .total-row.final {
                border-top: 2px dashed rgba(37, 99, 235, 0.3);
                margin-top: 10px;
                padding-top: 15px;
            }

            .total-row.final span:first-child {
                font-weight: 700;
                color: var(--primary-dark);
                font-size: 16px;
            }

            .total-amount {
                font-size: 24px;
                font-weight: 800;
                color: var(--primary-dark);
            }

            .footer-info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-top: auto;
                padding-top: 30px;
                border-top: 2px solid var(--border);
            }

            .payment-details h4 {
                margin: 0 0 10px 0;
                color: var(--text-main);
                font-size: 14px;
            }

            .payment-details p {
                margin: 4px 0;
                color: var(--text-muted);
            }

            .status-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                background: #dcfce7;
                color: #166534;
            }
            .status-badge.pending {
                background: #fef9c3;
                color: #854d0e;
            }
            .status-badge.cancelled {
                background: #fee2e2;
                color: #991b1b;
            }

            .watermark {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 120px;
                font-weight: 800;
                color: rgba(0,0,0,0.02);
                z-index: 0;
                pointer-events: none;
                white-space: nowrap;
            }
        </style>
    </head>
    <body>
        <div class="page-container">
            <div class="top-bar"></div>
            
            <div class="watermark">${data.payment_status?.toUpperCase() || 'COMPROBANTE'}</div>

            <div class="header" style="position: relative; z-index: 1;">
                <div class="header-left">
                    ${logoHtml}
                    <div class="company-details">
                        <h1>${data.office_name || 'Agencia de Seguridad Social'}</h1>
                        <p>Sede Principal: ${data.agency_name || 'Principal'}</p>
                        ${data.office_address ? `<p>${data.office_address}</p>` : ''}
                    </div>
                </div>
                <div class="invoice-title">
                    <h2>COMPROBANTE</h2>
                    <div class="invoice-no">NO. ${invoiceNumber}</div>
                    <div style="margin-top: 15px;">
                        <span class="status-badge ${data.payment_status === 'Pagado' ? '' : data.payment_status === 'Pendiente' ? 'pending' : 'cancelled'}">
                            ESTADO: ${data.payment_status?.toUpperCase() || 'PENDIENTE'}
                        </span>
                    </div>
                </div>
            </div>

            <div class="info-grid" style="position: relative; z-index: 1;">
                <div class="info-box">
                    <h3>Facturar A</h3>
                    <p><strong>Cliente:</strong> <span>${data.client_name}</span></p>
                    <p><strong>Identificación:</strong> <span>${data.client_identification}</span></p>
                    <p><strong>Vinculado A:</strong> <span>${data.company_name || 'N/A'}</span></p>
                </div>
                <div class="info-box">
                    <h3>Detalles del Documento</h3>
                    <p><strong>Fecha de Emisión:</strong> <span>${formatDate()}</span></p>
                    <p><strong>Periodo Cubierto:</strong> <span>${getMonthName(data.month)} ${data.year}</span></p>
                    <p><strong>Método de Pago:</strong> <span>${data.payment_method || 'Por Definir'}</span></p>
                </div>
            </div>

            <table class="items" style="position: relative; z-index: 1;">
                <thead>
                    <tr>
                        <th>Descripción del Servicio</th>
                        <th>Entidad Asignada</th>
                        <th>Importe</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <div class="item-name">Aportes a Seguridad Social Integral</div>
                            <div class="item-desc">Pago correspondiente al periodo de ${getMonthName(data.month)} ${data.year}. Incluye administración y gestión.</div>
                            ${data.observation ? `<div class="item-desc" style="margin-top: 8px; color: var(--accent);"><strong>Nota:</strong> ${data.observation}</div>` : ''}
                        </td>
                        <td>
                            <div class="item-desc"><strong>EPS:</strong> ${data.eps_name}</div>
                            <div class="item-desc"><strong>ARL:</strong> ${data.arl_name} (Riesgo ${data.risk_level || 'N/A'})</div>
                            <div class="item-desc"><strong>AFP:</strong> ${data.pension_name}</div>
                            <div class="item-desc"><strong>CCF:</strong> ${data.ccf_name}</div>
                        </td>
                        <td class="item-price">
                            ${formatCurrency(data.value)}
                        </td>
                    </tr>
                </tbody>
            </table>

            <div class="totals" style="position: relative; z-index: 1;">
                <div class="totals-box">
                    <div class="total-row">
                        <span style="color: var(--text-muted); font-weight: 500;">Subtotal</span>
                        <span style="font-weight: 600;">${formatCurrency(data.value)}</span>
                    </div>
                    <div class="total-row">
                        <span style="color: var(--text-muted); font-weight: 500;">Impuestos (0%)</span>
                        <span style="font-weight: 600;">$0</span>
                    </div>
                    <div class="total-row final">
                        <span>TOTAL A PAGAR</span>
                        <span class="total-amount">${formatCurrency(data.value)}</span>
                    </div>
                </div>
            </div>

            <div class="footer-info" style="position: relative; z-index: 1;">
                <div class="payment-details">
                    <h4>Términos y Condiciones</h4>
                    <p>Este comprobante certifica la gestión de pago de los aportes al sistema general de seguridad social integral. Los pagos a las entidades correspondientes se realizan en los plazos establecidos por la ley.</p>
                </div>
                <div style="text-align: right;">
                    <h4 style="margin: 0 0 10px 0; color: var(--text-main);">Gracias por preferir nuestros servicios</h4>
                    <p style="margin: 0; color: var(--text-muted);">Generado automáticamente el ${formatDate()}</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}
