import db from '../../../config/database.js';
import { storageService } from '../../../shared/storage/storage.service.js';
import { assertCanReadDocuments, buildAffiliateDocumentSelect, buildOfficeScope, mapAffiliateDocumentRow } from './affiliate-document.helpers.js';

export class DownloadAffiliateDocumentService {
  async execute(documentId: number, agencyId: number, userId: number, role: string) {
    assertCanReadDocuments(role);

    const officeScope = buildOfficeScope(role, userId, 'c.office_id');
    const conditions = ['d.id = ?', 'd.agency_id = ?'];
    const params: Array<number | string> = [documentId, agencyId, ...officeScope.params];

    if (officeScope.condition) {
      conditions.push(officeScope.condition.replace(/^ AND /, ''));
    }

    const [rows]: any = await db.query(
      `${buildAffiliateDocumentSelect()}
       WHERE ${conditions.join(' AND ')}
       LIMIT 1`,
      params
    );

    if (!rows.length) {
      throw Object.assign(new Error('Documento no encontrado o fuera del alcance del usuario.'), { status: 404 });
    }

    const document = mapAffiliateDocumentRow(rows[0]);
    const buffer = await storageService.provider.getObjectBuffer(rows[0].storage_key);

    return {
      document,
      originalName: rows[0].original_name as string,
      mimeType: rows[0].mime_type as string,
      buffer,
    };
  }
}
