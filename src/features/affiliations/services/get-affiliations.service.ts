import pool from '../../../config/database.js';
import logger from '../../../shared/utils/logger.js';
import type { AffiliationListResponse } from '../types/affiliation.types.js';

export class GetAffiliationsService {
  async execute(agencyId: number): Promise<AffiliationListResponse> {
    logger.info('Fetching affiliations', { agencyId });

    const [rows]: any = await pool.query(
      `SELECT
        ma.id,
        ce.client_id,
        CONCAT_WS(' ', c.first_name, c.second_name, c.first_lastname, c.second_lastname) AS client_name,
        c.identification   AS client_identification,
        co.id              AS company_id,
        co.name            AS company_name,
        ma.start_date,
        ma.end_date,
        ma.status,
        ma.days_worked,
        ma.month,
        ma.year,
        ma.value,
        COALESCE(e.name, '—') AS eps_name,
        COALESCE(a.name, '—') AS arl_name,
        COALESCE(cc.name, '—') AS ccf_name,
        COALESCE(p.name, '—')  AS pension_name,
        ma.risk_level,
        ma.payment_status,
        ma.payment_method,
        ma.created_at,
        ma.gov_record_at,
        ma.is_auto_renewed,
        ma.observation,
        ma.withdrawal_reason
      FROM monthly_affiliations ma
        INNER JOIN client_employers ce ON ce.id = ma.client_employer_id
        INNER JOIN clients          c  ON c.id  = ce.client_id
        INNER JOIN companies        co ON co.id = ce.company_id
        LEFT  JOIN eps_list         e  ON e.id  = ma.eps_id
        LEFT  JOIN arl_list         a  ON a.id  = ma.arl_id
        LEFT  JOIN ccf_list         cc ON cc.id = ma.ccf_id
        LEFT  JOIN pension_fund_list p ON p.id  = ma.pension_id
      WHERE co.agency_id = ?
      ORDER BY ma.start_date DESC, ma.id DESC
      LIMIT 200`,
      [agencyId]
    );

    return { items: rows, total: rows.length };
  }

  async executeByClient(clientId: number, agencyId: number): Promise<AffiliationListResponse> {
    logger.info('Fetching affiliations by client', { clientId, agencyId });

    const [rows]: any = await pool.query(
      `SELECT
        ma.id,
        ce.client_id,
        CONCAT_WS(' ', c.first_name, c.second_name, c.first_lastname, c.second_lastname) AS client_name,
        c.identification   AS client_identification,
        co.id              AS company_id,
        co.name            AS company_name,
        ma.start_date,
        ma.end_date,
        ma.status,
        ma.days_worked,
        ma.month,
        ma.year,
        ma.value,
        COALESCE(e.name, '—') AS eps_name,
        COALESCE(a.name, '—') AS arl_name,
        COALESCE(cc.name, '—') AS ccf_name,
        COALESCE(p.name, '—')  AS pension_name,
        ma.risk_level,
        ma.payment_status,
        ma.payment_method,
        ma.created_at,
        ma.gov_record_at,
        ma.is_auto_renewed,
        ma.observation,
        ma.withdrawal_reason
      FROM monthly_affiliations ma
        INNER JOIN client_employers ce ON ce.id = ma.client_employer_id
        INNER JOIN clients          c  ON c.id  = ce.client_id
        INNER JOIN companies        co ON co.id = ce.company_id
        LEFT  JOIN eps_list         e  ON e.id  = ma.eps_id
        LEFT  JOIN arl_list         a  ON a.id  = ma.arl_id
        LEFT  JOIN ccf_list         cc ON cc.id = ma.ccf_id
        LEFT  JOIN pension_fund_list p ON p.id  = ma.pension_id
      WHERE ce.client_id = ? AND co.agency_id = ?
      ORDER BY ma.start_date DESC
      LIMIT 200`,
      [clientId, agencyId]
    );

    return { items: rows, total: rows.length };
  }
}
