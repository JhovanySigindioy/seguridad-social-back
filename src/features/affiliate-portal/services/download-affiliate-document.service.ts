import db from '../../../config/database.js';
import { storageService } from '../../../shared/storage/storage.service.js';

export class DownloadAffiliatePortalDocumentService {
  async execute(documentId: number, clientId: number, agencyId: number) {
    const [rows]: any = await db.query(
      `SELECT id, original_name, mime_type, storage_key
       FROM affiliate_documents
       WHERE id = ?
         AND client_id = ?
         AND agency_id = ?
         AND is_visible_to_affiliate = 1
       LIMIT 1`,
      [documentId, clientId, agencyId]
    );

    if (!rows.length) {
      throw Object.assign(new Error('Documento no encontrado para este afiliado.'), { status: 404 });
    }

    const row = rows[0];
    const buffer = await storageService.provider.getObjectBuffer(row.storage_key);

    return {
      buffer,
      originalName: row.original_name as string,
      mimeType: row.mime_type as string,
    };
  }
}
