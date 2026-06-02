import pool from '../../../config/database.js';
import logger from '../../../shared/utils/logger.js';

interface DailyAffiliationItem {
  id: number;
  client_id: number;
  client_name: string;
  client_identification: string;
  company_id: number;
  company_name: string;
  office_id: number;
  office_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  month: number;
  year: number;
  value: number;
  eps_name: string;
  arl_name: string;
  ccf_name: string;
  pension_name: string;
  risk_level: string;
  payment_status: string;
  payment_method: string | null;
  created_at: string;
  gov_record_at: string | null;
  is_auto_renewed: boolean;
  observation: string | null;
  withdrawal_reason: string | null;
}

export class GetDailyAffiliationsService {
  async execute(
    agencyId: number,
    userId: number,
    role: string,
    date: string,
    officeId?: number
  ): Promise<{ items: DailyAffiliationItem[] }> {
    logger.info('Fetching daily affiliations', { agencyId, userId, role, date, officeId });

    const conditions = ['co.agency_id = ?', 'DATE(a.created_at) = ?', "a.status = 'Activo'"];
    const params: any[] = [agencyId, date];

    if (role !== 'admin') {
      conditions.push('ce.office_id IN (SELECT office_id FROM user_offices WHERE user_id = ?)');
      params.push(userId);
    }

    if (officeId) {
      conditions.push('ce.office_id = ?');
      params.push(officeId);
    }

    const sql = `SELECT
        a.id,
        ce.client_id,
        CONCAT_WS(' ', c.first_name, c.second_name, c.first_lastname, c.second_lastname) AS client_name,
        c.identification AS client_identification,
        co.id AS company_id,
        co.name AS company_name,
        c.office_id,
        o.name AS office_name,
        a.start_date,
        a.end_date,
        a.status,
        COALESCE(lp.month, 0) AS month,
        COALESCE(lp.year, 0) AS year,
        COALESCE(e.name, '—') AS eps_name,
        COALESCE(ar.name, '—') AS arl_name,
        COALESCE(cc.name, '—') AS ccf_name,
        COALESCE(p.name, '—') AS pension_name,
        a.risk_level,
        COALESCE(lp.payment_status, 'Pendiente') AS payment_status,
        lp.payment_method,
        a.created_at,
        lp.gov_record_at,
        COALESCE(lp.value, (
          SELECT value FROM monthly_payments
          WHERE affiliation_id = a.id
          ORDER BY year DESC, month DESC LIMIT 1
        )) AS value,
        COALESCE(lp.is_auto_renewed, 0) AS is_auto_renewed,
        a.observation,
        a.withdrawal_reason
      FROM affiliations a
        INNER JOIN client_employers ce ON ce.id = a.client_employer_id
        INNER JOIN clients c ON c.id = ce.client_id
        INNER JOIN companies co ON co.id = ce.company_id
        INNER JOIN offices o ON o.id = ce.office_id
        LEFT JOIN eps_list e ON e.id = a.eps_id
        LEFT JOIN arl_list ar ON ar.id = a.arl_id
        LEFT JOIN ccf_list cc ON cc.id = a.ccf_id
        LEFT JOIN pension_fund_list p ON p.id = a.pension_id
        INNER JOIN monthly_payments lp ON lp.affiliation_id = a.id AND lp.month = MONTH(a.start_date) AND lp.year = YEAR(a.start_date)
      WHERE ${conditions.join(' AND ')}
      ORDER BY o.name, a.created_at DESC`;

    const [rows] = await pool.query(sql, params);
    return { items: rows as DailyAffiliationItem[] };
  }
}
