import { createHash } from 'crypto';
import PDFDocument from 'pdfkit';
import bcryptjs from 'bcryptjs';
import db from '../config/database.js';
import { storageService } from '../shared/storage/storage.service.js';
import { buildAffiliateDocumentStorageKey } from '../features/affiliate-documents/services/affiliate-document.helpers.js';

interface DemoAccountSeed {
  clientId: number;
  officeId: number;
  agencyId: number;
  uploaderUserId: number;
  email: string;
  password: string;
}

const DEMO_ACCOUNTS: DemoAccountSeed[] = [
  {
    clientId: 3142,
    officeId: 11,
    agencyId: 1,
    uploaderUserId: 12,
    email: 'anderson.afiliado@demo.local',
    password: 'Afiliado3142!',
  },
  {
    clientId: 3502,
    officeId: 11,
    agencyId: 1,
    uploaderUserId: 12,
    email: 'martin.afiliado@demo.local',
    password: 'Afiliado3502!',
  },
  {
    clientId: 3676,
    officeId: 14,
    agencyId: 1,
    uploaderUserId: 15,
    email: 'marcos.afiliado@demo.local',
    password: 'Afiliado3676!',
  },
];

const TARGET_PERIODS = [
  { month: 6, year: 2026, type: 'certificado', title: 'Certificado de afiliacion' },
  { month: 7, year: 2026, type: 'factura', title: 'Factura del periodo' },
  { month: 8, year: 2026, type: 'incapacidad', title: 'Soporte de incapacidad' },
] as const;

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  throw new Error('El seed demo esta bloqueado en produccion. Define ALLOW_DEMO_SEED=true solo de forma explicita.');
}

const buildPdfBuffer = async (data: {
  fullName: string;
  identification: string;
  month: number;
  year: number;
  title: string;
  documentType: string;
  email: string;
}) => {
  const doc = new PDFDocument({ margin: 48 });
  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('Portal de Afiliados - Documento de prueba');
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Tipo: ${data.title}`);
    doc.text(`Documento interno: ${data.documentType}`);
    doc.text(`Afiliado: ${data.fullName}`);
    doc.text(`Identificacion: ${data.identification}`);
    doc.text(`Periodo: ${String(data.month).padStart(2, '0')}/${data.year}`);
    doc.text(`Cuenta de acceso: ${data.email}`);
    doc.moveDown();
    doc.text('Este archivo fue generado automaticamente para pruebas locales del portal de afiliados.');
    doc.text('Se encuentra almacenado en Cloudflare R2 y relacionado con la base de datos local.');
    doc.moveDown();
    doc.text(`Generado: ${new Date().toISOString()}`);
    doc.end();
  });
};

const ensureAffiliateAccount = async (seed: DemoAccountSeed) => {
  const passwordHash = await bcryptjs.hash(seed.password, 10);

  await db.query(
    `INSERT INTO affiliate_accounts (
       agency_id, client_id, office_id, email, password_hash, status, must_change_password, created_by_user_id
     ) VALUES (?, ?, ?, ?, ?, 'active', 0, ?)
     ON DUPLICATE KEY UPDATE
       agency_id = VALUES(agency_id),
       office_id = VALUES(office_id),
       email = VALUES(email),
       password_hash = VALUES(password_hash),
       status = 'active',
       must_change_password = 0,
       created_by_user_id = VALUES(created_by_user_id)`,
    [seed.agencyId, seed.clientId, seed.officeId, seed.email, passwordHash, seed.uploaderUserId]
  );
};

const getClientInfo = async (clientId: number) => {
  const [rows]: any = await db.query(
    `SELECT
       c.id,
       c.identification,
       CONCAT_WS(' ', c.first_name, c.second_name, c.first_lastname, c.second_lastname) AS full_name
     FROM clients c
     WHERE c.id = ?
     LIMIT 1`,
    [clientId]
  );

  if (!rows.length) {
    throw new Error(`No se encontro el cliente ${clientId}`);
  }

  return rows[0] as { id: number; identification: string; full_name: string };
};

const getLatestAffiliation = async (clientId: number) => {
  const [rows]: any = await db.query(
    `SELECT a.id, ce.office_id
     FROM affiliations a
     INNER JOIN client_employers ce ON ce.id = a.client_employer_id
     WHERE ce.client_id = ?
     ORDER BY a.start_date DESC, a.id DESC
     LIMIT 1`,
    [clientId]
  );

  if (!rows.length) {
    throw new Error(`No se encontro una afiliacion para el cliente ${clientId}`);
  }

  return rows[0] as { id: number; office_id: number };
};

const ensureMonthlyPayment = async (clientId: number, uploaderUserId: number, month: number, year: number) => {
  const [existingRows]: any = await db.query(
    `SELECT
       mp.id,
       mp.affiliation_id,
       mp.value,
       mp.payment_status
     FROM monthly_payments mp
     INNER JOIN affiliations a ON a.id = mp.affiliation_id
     INNER JOIN client_employers ce ON ce.id = a.client_employer_id
     WHERE ce.client_id = ? AND mp.month = ? AND mp.year = ?
     ORDER BY mp.id DESC
     LIMIT 1`,
    [clientId, month, year]
  );

  if (existingRows.length) {
    return existingRows[0] as { id: number; affiliation_id: number; value: string; payment_status: string };
  }

  const latestAffiliation = await getLatestAffiliation(clientId);

  const [latestPaymentRows]: any = await db.query(
    `SELECT value, payment_method
     FROM monthly_payments
     WHERE affiliation_id = ?
     ORDER BY year DESC, month DESC, id DESC
     LIMIT 1`,
    [latestAffiliation.id]
  );

  const baseValue = latestPaymentRows.length ? latestPaymentRows[0].value : 120000;
  const paymentMethod = latestPaymentRows.length ? latestPaymentRows[0].payment_method : 'Transferencia';

  const [result]: any = await db.query(
    `INSERT INTO monthly_payments (
       affiliation_id, month, year, value, payment_status, payment_method, created_by, gov_record_at
     ) VALUES (?, ?, ?, ?, 'Pagado', ?, ?, CURRENT_TIMESTAMP(6))`,
    [latestAffiliation.id, month, year, baseValue, paymentMethod, uploaderUserId]
  );

  return {
    id: Number(result.insertId),
    affiliation_id: latestAffiliation.id,
    value: String(baseValue),
    payment_status: 'Pagado',
  };
};

const upsertDemoDocument = async (params: {
  seed: DemoAccountSeed;
  clientInfo: { id: number; identification: string; full_name: string };
  paymentId: number;
  affiliationId: number;
  month: number;
  year: number;
  type: string;
  title: string;
}) => {
  const displayName = `${params.title} ${String(params.month).padStart(2, '0')}/${params.year}`;
  const originalName = `${params.type}-${params.clientInfo.identification}-${params.year}-${String(params.month).padStart(2, '0')}.pdf`;
  const storageKey = buildAffiliateDocumentStorageKey({
    agencyId: params.seed.agencyId,
    clientId: params.seed.clientId,
    affiliationId: params.affiliationId,
    monthlyPaymentId: params.paymentId,
    originalName,
    displayName,
    uniqueSuffix: `demo-${params.year}-${String(params.month).padStart(2, '0')}-${params.type}`,
  });

  const buffer = await buildPdfBuffer({
    fullName: params.clientInfo.full_name,
    identification: params.clientInfo.identification,
    month: params.month,
    year: params.year,
    title: params.title,
    documentType: params.type,
    email: params.seed.email,
  });

  await storageService.provider.putObject({
    key: storageKey,
    body: buffer,
    contentType: 'application/pdf',
    metadata: {
      seed: 'affiliate-demo',
      clientId: String(params.seed.clientId),
      paymentId: String(params.paymentId),
      period: `${params.year}-${String(params.month).padStart(2, '0')}`,
      type: params.type,
    },
  });

  const [existingRows]: any = await db.query(
    `SELECT id
     FROM affiliate_documents
     WHERE client_id = ? AND monthly_payment_id = ? AND document_type = ?
     LIMIT 1`,
    [params.seed.clientId, params.paymentId, params.type]
  );

  if (existingRows.length) {
    await db.query(
      `UPDATE affiliate_documents
       SET affiliation_id = ?,
           uploaded_by_user_id = ?,
           display_name = ?,
           source = 'system',
           original_name = ?,
           storage_key = ?,
           mime_type = 'application/pdf',
           size_bytes = ?,
            sha256 = ?,
           is_visible_to_affiliate = 1,
           updated_at = CURRENT_TIMESTAMP()
       WHERE id = ?`,
      [
        params.affiliationId,
        params.seed.uploaderUserId,
        displayName,
        originalName,
        storageKey,
        buffer.length,
         createHash('sha256').update(buffer).digest('hex'),
        existingRows[0].id,
      ]
    );
    return;
  }

  await db.query(
    `INSERT INTO affiliate_documents (
       agency_id, client_id, affiliation_id, monthly_payment_id, uploaded_by_user_id,
       document_type, display_name, source, original_name, storage_key,
       mime_type, size_bytes, sha256, is_visible_to_affiliate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'system', ?, ?, 'application/pdf', ?, ?, 1)`,
    [
      params.seed.agencyId,
      params.seed.clientId,
      params.affiliationId,
      params.paymentId,
      params.seed.uploaderUserId,
      params.type,
      displayName,
      originalName,
      storageKey,
      buffer.length,
       createHash('sha256').update(buffer).digest('hex'),
    ]
  );
};

const main = async () => {
  const createdAccounts: Array<{ email: string; password: string; clientId: number }> = [];

  for (const seed of DEMO_ACCOUNTS) {
    await ensureAffiliateAccount(seed);
    const clientInfo = await getClientInfo(seed.clientId);

    for (const period of TARGET_PERIODS) {
      const payment = await ensureMonthlyPayment(seed.clientId, seed.uploaderUserId, period.month, period.year);

      await upsertDemoDocument({
        seed,
        clientInfo,
        paymentId: Number(payment.id),
        affiliationId: Number(payment.affiliation_id),
        month: period.month,
        year: period.year,
        type: period.type,
        title: period.title,
      });
    }

    createdAccounts.push({ email: seed.email, password: seed.password, clientId: seed.clientId });
  }

  console.log('Demo affiliate accounts ready:');
  for (const account of createdAccounts) {
    console.log(`- client ${account.clientId}: ${account.email} / ${account.password}`);
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.end();
  });
