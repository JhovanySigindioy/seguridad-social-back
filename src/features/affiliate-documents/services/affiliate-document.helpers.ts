import { extname } from 'path';
import type { AffiliateDocumentListItem } from '../types/affiliate-document.types.js';

const DOCUMENT_WRITE_ROLES = new Set(['admin', 'office_manager']);
const DOCUMENT_READ_ROLES = new Set(['admin', 'office_manager', 'viewer']);

export const assertCanReadDocuments = (role: string): void => {
  if (!DOCUMENT_READ_ROLES.has(role)) {
    throw Object.assign(new Error('No tienes permisos para consultar documentos.'), { status: 403 });
  }
};

export const assertCanWriteDocuments = (role: string): void => {
  if (!DOCUMENT_WRITE_ROLES.has(role)) {
    throw Object.assign(new Error('No tienes permisos para subir documentos.'), { status: 403 });
  }
};

export const buildOfficeScope = (role: string, userId: number, officeColumn: string) => {
  if (role === 'admin') {
    return { condition: '', params: [] as number[] };
  }

  return {
    condition: ` AND ${officeColumn} IN (SELECT office_id FROM user_offices WHERE user_id = ?)`,
    params: [userId],
  };
};

export const mapAffiliateDocumentRow = (row: any): AffiliateDocumentListItem => ({
  id: row.id,
  client_id: row.client_id,
  affiliation_id: row.affiliation_id,
  monthly_payment_id: row.monthly_payment_id,
  document_type: row.document_type,
  display_name: row.display_name,
  original_name: row.original_name,
  mime_type: row.mime_type,
  size_bytes: Number(row.size_bytes),
  source: row.source,
  is_visible_to_affiliate: Boolean(row.is_visible_to_affiliate),
  created_at: row.created_at,
  client_name: row.client_name,
  client_identification: row.client_identification,
  office_name: row.office_name,
  payment_month: row.payment_month ?? null,
  payment_year: row.payment_year ?? null,
  download_url: `/api/affiliate-documents/${row.id}/download`,
});

export const sanitizeStorageSegment = (value: string): string => {
  const base = value
    .normalize('NFD')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return base || 'archivo';
};

export const buildAffiliateDocumentStorageKey = (params: {
  agencyId: number;
  clientId: number;
  affiliationId?: number;
  monthlyPaymentId?: number;
  originalName: string;
  displayName?: string;
  uniqueSuffix: string;
}): string => {
  const extension = extname(params.originalName).toLowerCase();
  const baseName = sanitizeStorageSegment(params.displayName || params.originalName.replace(/\.[^.]+$/, ''));
  const segments = [
    'affiliate-documents',
    `agency-${params.agencyId}`,
    `client-${params.clientId}`,
  ];

  if (params.affiliationId) {
    segments.push(`affiliation-${params.affiliationId}`);
  }

  if (params.monthlyPaymentId) {
    segments.push(`payment-${params.monthlyPaymentId}`);
  }

  segments.push(`${baseName}-${params.uniqueSuffix}${extension}`);

  return segments.join('/');
};

export const buildAffiliateDocumentSelect = () => `
  SELECT
    d.id,
    d.client_id,
    d.affiliation_id,
    d.monthly_payment_id,
    d.document_type,
    d.display_name,
    d.original_name,
    d.mime_type,
    d.size_bytes,
    d.source,
    d.is_visible_to_affiliate,
    d.created_at,
    d.storage_key,
    CONCAT_WS(' ', c.first_name, c.second_name, c.first_lastname, c.second_lastname) AS client_name,
    c.identification AS client_identification,
    o.name AS office_name,
    mp.month AS payment_month,
    mp.year AS payment_year
  FROM affiliate_documents d
  INNER JOIN clients c ON c.id = d.client_id
  INNER JOIN offices o ON o.id = c.office_id
  LEFT JOIN monthly_payments mp ON mp.id = d.monthly_payment_id
`;
