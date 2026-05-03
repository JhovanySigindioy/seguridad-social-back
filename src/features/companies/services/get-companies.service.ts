import db from '../../../config/database.js';

export class GetCompaniesService {
  async execute(agencyId: number) {
    const [rows]: any = await db.query(
      'SELECT id, name, nit, email, is_active FROM companies WHERE agency_id = ? AND is_active = 1 ORDER BY name ASC',
      [agencyId]
    );
    return rows;
  }
}
