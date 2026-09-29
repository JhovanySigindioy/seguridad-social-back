import db from '../../../config/database.js';

export class GetAffiliatePortalDocumentsService {
  async execute(clientId: number, agencyId: number) {
    const [rows]: any = await db.query(
      `SELECT
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
         mp.id AS monthly_payment_id,
         mp.month AS payment_month,
         mp.year AS payment_year,
         '/api/affiliate/documents/' AS base_download_url
        FROM affiliate_documents d
        LEFT JOIN monthly_payments mp ON mp.id = d.monthly_payment_id
        LEFT JOIN affiliations linked_a ON linked_a.id = d.affiliation_id
       WHERE d.client_id = ?
         AND d.agency_id = ?
          AND d.is_visible_to_affiliate = 1
          AND (d.affiliation_id IS NULL OR linked_a.decision_status = 'Confirmada')
       ORDER BY COALESCE(mp.year, 0) DESC, COALESCE(mp.month, 0) DESC, d.created_at DESC, d.id DESC`,
      [clientId, agencyId]
    );

    return rows.map((row: any) => ({
      id: Number(row.id),
      client_id: Number(row.client_id),
      affiliation_id: row.affiliation_id ? Number(row.affiliation_id) : null,
      monthly_payment_id: row.monthly_payment_id ? Number(row.monthly_payment_id) : null,
      document_type: row.document_type,
      display_name: row.display_name,
      original_name: row.original_name,
      mime_type: row.mime_type,
      size_bytes: Number(row.size_bytes),
      source: row.source,
      is_visible_to_affiliate: Boolean(row.is_visible_to_affiliate),
      created_at: row.created_at,
      payment_month: row.payment_month ? Number(row.payment_month) : null,
      payment_year: row.payment_year ? Number(row.payment_year) : null,
      download_url: `/api/affiliate/documents/${row.id}/download`,
    }));
  }
}
