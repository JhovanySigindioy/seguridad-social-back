import pool from '../../../config/database.js';

export class GetLatestByClientService {
  async execute(clientId: number, agencyId: number) {
    const [rows] = await pool.query<any[]>(`
      SELECT 
        ce.company_id,
        a.eps_id,
        a.arl_id,
        a.ccf_id,
        a.pension_id,
        a.risk_level,
        mp.value
      FROM client_employers ce
      JOIN companies c ON ce.company_id = c.id
      JOIN affiliations a ON ce.id = a.client_employer_id
      LEFT JOIN monthly_payments mp ON mp.affiliation_id = a.id
      WHERE ce.client_id = ? AND c.agency_id = ?
      ORDER BY a.start_date DESC, mp.year DESC, mp.month DESC
      LIMIT 1
    `, [clientId, agencyId]);

    if (!rows || rows.length === 0) return null;

    return rows[0];
  }
}
