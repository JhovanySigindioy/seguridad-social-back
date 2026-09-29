import db from '../../../config/database.js';
import type { AffiliateAccountListFilters } from '../types/affiliate-account.types.js';

const scopedOfficeCondition = (role: string, userId: number, column: string) => {
  if (role === 'admin') return { sql: '', params: [] as number[] };
  return {
    sql: ` AND ${column} IN (SELECT office_id FROM user_offices WHERE user_id = ?)`,
    params: [userId],
  };
};

export class GetAffiliateAccountsService {
  async execute({ agencyId, userId, role, officeId, search, status, paidOnly }: AffiliateAccountListFilters) {
    if (!['admin', 'office_manager', 'viewer'].includes(role)) {
      throw Object.assign(new Error('No tienes permiso para consultar accesos del portal.'), { status: 403 });
    }

    const params: Array<number | string> = [agencyId];
    const conditions = ['o.agency_id = ?'];
    const officeScope = scopedOfficeCondition(role, userId, 'c.office_id');
    if (officeScope.sql) {
      conditions.push(officeScope.sql.replace(/^ AND /, ''));
    }
    params.push(...officeScope.params);

    if (officeId) {
      if (role !== 'admin') {
        const [allowedRows]: any = await db.query(
          'SELECT office_id FROM user_offices WHERE user_id = ? AND office_id = ?',
          [userId, officeId]
        );
        if (!allowedRows.length) {
          throw Object.assign(new Error('La oficina seleccionada está fuera de tu alcance.'), { status: 403 });
        }
      }
      conditions.push('c.office_id = ?');
      params.push(officeId);
    }

    if (search?.trim()) {
      const value = `%${search.trim()}%`;
      conditions.push(`(
        CONCAT_WS(' ', c.first_name, c.second_name, c.first_lastname, c.second_lastname) LIKE ?
        OR c.identification LIKE ?
        OR c.email LIKE ?
        OR aa.email LIKE ?
      )`);
      params.push(value, value, value, value);
    }

    if (status === 'none') conditions.push('aa.id IS NULL');
    if (status && status !== 'none') {
      conditions.push('aa.status = ?');
      params.push(status);
    }

    if (paidOnly) {
      conditions.push(`EXISTS (
        SELECT 1
        FROM affiliations paid_a
        INNER JOIN client_employers paid_ce ON paid_ce.id = paid_a.client_employer_id
        INNER JOIN monthly_payments paid_mp ON paid_mp.affiliation_id = paid_a.id
        WHERE paid_ce.client_id = c.id
          AND paid_a.status = 'Activo'
          AND paid_a.decision_status = 'Confirmada'
          AND paid_mp.payment_status = 'Pagado'
      )`);
    }

    const [rows]: any = await db.query(
      `SELECT
         c.id AS client_id,
         CONCAT_WS(' ', c.first_name, c.second_name, c.first_lastname, c.second_lastname) AS client_name,
         c.identification,
         c.email AS client_email,
         c.phone_1,
         c.office_id,
         o.name AS office_name,
         aa.id AS account_id,
         aa.email AS account_email,
         aa.status AS account_status,
         aa.created_at AS account_created_at,
         aa.last_login_at,
         creator.name AS created_by_name,
         (
           SELECT COUNT(*)
           FROM affiliations client_a
           INNER JOIN client_employers client_ce ON client_ce.id = client_a.client_employer_id
           WHERE client_ce.client_id = c.id
             AND client_a.status = 'Activo'
             AND client_a.decision_status = 'Confirmada'
         ) AS confirmed_affiliation_count,
         (
           SELECT COUNT(*)
           FROM affiliate_documents documents
           WHERE documents.client_id = c.id
         ) AS document_count,
         (
           SELECT mp.month
           FROM monthly_payments mp
           INNER JOIN affiliations a ON a.id = mp.affiliation_id
           INNER JOIN client_employers ce ON ce.id = a.client_employer_id
           WHERE ce.client_id = c.id
             AND a.status = 'Activo'
             AND a.decision_status = 'Confirmada'
             AND mp.payment_status = 'Pagado'
           ORDER BY mp.year DESC, mp.month DESC, mp.id DESC
           LIMIT 1
         ) AS last_paid_month,
         (
           SELECT mp.year
           FROM monthly_payments mp
           INNER JOIN affiliations a ON a.id = mp.affiliation_id
           INNER JOIN client_employers ce ON ce.id = a.client_employer_id
           WHERE ce.client_id = c.id
             AND a.status = 'Activo'
             AND a.decision_status = 'Confirmada'
             AND mp.payment_status = 'Pagado'
           ORDER BY mp.year DESC, mp.month DESC, mp.id DESC
           LIMIT 1
         ) AS last_paid_year
       FROM clients c
       INNER JOIN offices o ON o.id = c.office_id
       LEFT JOIN affiliate_accounts aa ON aa.client_id = c.id
       LEFT JOIN users creator ON creator.id = aa.created_by_user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY (aa.id IS NULL) DESC, c.first_name ASC, c.first_lastname ASC
       LIMIT 1000`,
      params
    );

    return rows.map((row: any) => ({
      client_id: Number(row.client_id),
      client_name: row.client_name,
      identification: row.identification,
      client_email: row.client_email,
      phone_1: row.phone_1,
      office_id: Number(row.office_id),
      office_name: row.office_name,
      account_id: row.account_id ? Number(row.account_id) : null,
      account_email: row.account_email,
      account_status: row.account_status,
      account_created_at: row.account_created_at,
      last_login_at: row.last_login_at,
      created_by_name: row.created_by_name,
      confirmed_affiliation_count: Number(row.confirmed_affiliation_count || 0),
      document_count: Number(row.document_count || 0),
      last_paid_month: row.last_paid_month ? Number(row.last_paid_month) : null,
      last_paid_year: row.last_paid_year ? Number(row.last_paid_year) : null,
      eligible: Number(row.confirmed_affiliation_count || 0) > 0 && Boolean(row.last_paid_month),
    }));
  }
}
