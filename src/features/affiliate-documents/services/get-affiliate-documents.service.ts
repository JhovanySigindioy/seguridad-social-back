import db from '../../../config/database.js';
import { assertCanReadDocuments, buildAffiliateDocumentSelect, buildOfficeScope, mapAffiliateDocumentRow } from './affiliate-document.helpers.js';
import type { AffiliateDocumentListFilters } from '../types/affiliate-document.types.js';

export class GetAffiliateDocumentsService {
  async execute(agencyId: number, userId: number, role: string, filters: AffiliateDocumentListFilters) {
    assertCanReadDocuments(role);

    const officeScope = buildOfficeScope(role, userId, 'c.office_id');
    const conditions = ['d.agency_id = ?'];
    const params: Array<number | string> = [agencyId, ...officeScope.params];

    if (officeScope.condition) {
      conditions.push(officeScope.condition.replace(/^ AND /, ''));
    }

    if (filters.client_id) {
      conditions.push('d.client_id = ?');
      params.push(filters.client_id);
    }

    if (filters.affiliation_id) {
      conditions.push('d.affiliation_id = ?');
      params.push(filters.affiliation_id);
    }

    if (filters.monthly_payment_id) {
      conditions.push('d.monthly_payment_id = ?');
      params.push(filters.monthly_payment_id);
    }

    const [rows]: any = await db.query(
      `${buildAffiliateDocumentSelect()}
       WHERE ${conditions.join(' AND ')}
       ORDER BY d.created_at DESC, d.id DESC
       LIMIT 500`,
      params
    );

    return rows.map(mapAffiliateDocumentRow);
  }
}
