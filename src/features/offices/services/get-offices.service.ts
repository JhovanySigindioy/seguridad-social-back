import pool from '../../../config/database.js';

export class GetOfficesService {
  async execute(agencyId: number) {
    const [offices]: any = await pool.query(
      'SELECT id, name, address, is_active FROM offices WHERE agency_id = ?',
      [agencyId]
    );
    return offices;
  }
}
