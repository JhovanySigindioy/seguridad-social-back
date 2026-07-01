import pool from '../../../config/database.js';
import logger from '../../../shared/utils/logger.js';
import type { AffiliationListResponse } from '../types/affiliation.types.js';

export class GetAffiliationsService {
  async execute(agencyId: number, userId: number, role: string, month?: number, year?: number): Promise<AffiliationListResponse> {
    logger.info('Fetching affiliations', { agencyId, userId, role, month, year });

    const params: any[] = [];
    let paymentJoinCondition = 'mp.affiliation_id = a.id';
    const conditions = ['co.agency_id = ?'];
    params.push(agencyId);

    if (role !== 'admin') {
      conditions.push('ce.office_id IN (SELECT office_id FROM user_offices WHERE user_id = ?)');
      params.push(userId);
    }

    if (month && year) {
      const m = Number(month);
      const y = Number(year);
      paymentJoinCondition += ` AND mp.month = ? AND mp.year = ?`;
      params.unshift(m, y); // Add to the BEGINNING for the JOIN

      const targetMonths = (y * 12) + m;
      
      // Start date filter: Must have started in or before target month
      conditions.push(`((YEAR(a.start_date) * 12 + MONTH(a.start_date)) <= ?)`);
      params.push(targetMonths);

      // End date filter: Must NOT have ended before target month
      // If end_date is null, it's active. If not, the month it ends must be >= target month
      conditions.push(`(a.end_date IS NULL OR (YEAR(a.end_date) * 12 + MONTH(a.end_date)) >= ?)`);
      params.push(targetMonths);
    } else {
      paymentJoinCondition = `mp.affiliation_id = a.id AND (mp.year, mp.month) = (
        SELECT year, month FROM monthly_payments 
        WHERE affiliation_id = a.id 
        ORDER BY year DESC, month DESC LIMIT 1
      )`;
    }

    logger.debug('Executing query', { sqlParams: params });
    const finalParams = params;

    const sql = `SELECT
        a.id,
        ce.client_id,
        CONCAT_WS(' ', c.first_name, c.second_name, c.first_lastname, c.second_lastname) AS client_name,
        c.identification   AS client_identification,
        c.phone_1          AS client_phone_1,
        c.phone_2          AS client_phone_2,
        co.id              AS company_id,
        co.name            AS company_name,
        a.start_date,
        a.end_date,
        a.status,
        a.days_worked,
        mp.month,
        mp.year,
        COALESCE(e.name, '—') AS eps_name,
        COALESCE(ar.name, '—') AS arl_name,
        COALESCE(cc.name, '—') AS ccf_name,
        COALESCE(p.name, '—')  AS pension_name,
        a.risk_level,
        COALESCE(mp.payment_status, 'Pendiente') AS payment_status,
        mp.payment_method,
        a.created_at,
        mp.created_at AS payment_created_at,
        mp.gov_record_at,
        COALESCE(mp.value, (
          SELECT value FROM monthly_payments 
          WHERE affiliation_id = a.id 
          ORDER BY year DESC, month DESC LIMIT 1
        )) AS value,
        mp.is_auto_renewed,
        a.observation,
        a.withdrawal_reason,
        a.withdrawal_observations,
        o.name             AS office_name
      FROM affiliations a
        INNER JOIN client_employers ce ON ce.id = a.client_employer_id
        INNER JOIN clients          c  ON c.id  = ce.client_id
        INNER JOIN companies        co ON co.id = ce.company_id
        INNER JOIN offices          o  ON o.id  = ce.office_id
        LEFT  JOIN eps_list         e  ON e.id  = a.eps_id
        LEFT  JOIN arl_list         ar ON ar.id = a.arl_id
        LEFT  JOIN ccf_list         cc ON cc.id = a.ccf_id
        LEFT  JOIN pension_fund_list p ON p.id  = a.pension_id
        LEFT  JOIN monthly_payments mp ON ${paymentJoinCondition}
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.start_date DESC, a.id DESC
      LIMIT 1000`;

    logger.debug('Executing query', { sql, params });
    const [rows]: any = await pool.query(sql, params);

    return { items: rows, total: rows.length };
  }

  async executeByClient(clientId: number, agencyId: number): Promise<AffiliationListResponse> {
    logger.info('Fetching affiliations by client', { clientId, agencyId });

    // Fetch the latest monthly_payments receipt for each affiliation
    const [rows]: any = await pool.query(
      `SELECT
        a.id,
        ce.client_id,
        CONCAT_WS(' ', c.first_name, c.second_name, c.first_lastname, c.second_lastname) AS client_name,
        c.identification   AS client_identification,
        c.phone_1          AS client_phone_1,
        c.phone_2          AS client_phone_2,
        co.id              AS company_id,
        co.name            AS company_name,
        a.start_date,
        a.end_date,
        a.status,
        a.days_worked,
        mp.month,
        mp.year,
        COALESCE(e.name, '—') AS eps_name,
        COALESCE(ar.name, '—') AS arl_name,
        COALESCE(cc.name, '—') AS ccf_name,
        COALESCE(p.name, '—')  AS pension_name,
        a.risk_level,
        COALESCE(mp.payment_status, 'Pendiente') AS payment_status,
        mp.payment_method,
        a.created_at,
        mp.gov_record_at,
        COALESCE(mp.value, (
          SELECT value FROM monthly_payments 
          WHERE affiliation_id = a.id 
          ORDER BY year DESC, month DESC LIMIT 1
        )) AS value,
        mp.is_auto_renewed,
        a.observation,
        a.withdrawal_reason,
        a.withdrawal_observations,
        o.name             AS office_name
      FROM affiliations a
        INNER JOIN client_employers ce ON ce.id = a.client_employer_id
        INNER JOIN clients          c  ON c.id  = ce.client_id
        INNER JOIN companies        co ON co.id = ce.company_id
        INNER JOIN offices          o  ON o.id  = ce.office_id
        LEFT  JOIN eps_list         e  ON e.id  = a.eps_id
        LEFT  JOIN arl_list         ar ON ar.id = a.arl_id
        LEFT  JOIN ccf_list         cc ON cc.id = a.ccf_id
        LEFT  JOIN pension_fund_list p ON p.id  = a.pension_id
        LEFT  JOIN monthly_payments mp ON mp.affiliation_id = a.id
      WHERE ce.client_id = ? AND co.agency_id = ?
      ORDER BY a.start_date DESC, mp.year DESC, mp.month DESC
      LIMIT 200`,
      [clientId, agencyId]
    );

    return { items: rows, total: rows.length };
  }
}
