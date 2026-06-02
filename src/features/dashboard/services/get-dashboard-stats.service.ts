import pool from '../../../config/database.js';
import logger from '../../../shared/utils/logger.js';

export class GetDashboardStatsService {
  async execute(
    agencyId: number,
    userId: number,
    role: string,
    officeId?: number,
    targetMonth?: number,
    targetYear?: number
  ) {
    logger.info('Fetching dashboard stats', { agencyId, userId, role, officeId, targetMonth, targetYear });

    const baseConditions = ['co.agency_id = ?'];
    const baseParams: any[] = [agencyId];

    if (role !== 'admin') {
      baseConditions.push('ce.office_id IN (SELECT office_id FROM user_offices WHERE user_id = ?)');
      baseParams.push(userId);
    }

    if (officeId) {
      baseConditions.push('ce.office_id = ?');
      baseParams.push(officeId);
    }

    const whereClause = baseConditions.join(' AND ');

    // 1. Current coverage month stats
    const today = new Date();
    const currentMonth = targetMonth || (today.getMonth() + 1);
    const currentYear = targetYear || today.getFullYear();

    // 1. New affiliations in target month (KPIs)
    const [newAffiliationsRows]: any = await pool.query(
      `SELECT 
        COUNT(a.id) as total,
        SUM(CASE WHEN mp.payment_status = 'Pagado' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN mp.payment_status = 'Pendiente' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN mp.payment_status = 'En Proceso' THEN 1 ELSE 0 END) as inProcess
      FROM affiliations a
      JOIN client_employers ce ON ce.id = a.client_employer_id
      JOIN companies co ON co.id = ce.company_id
      LEFT JOIN monthly_payments mp ON mp.affiliation_id = a.id AND mp.month = ? AND mp.year = ?
      WHERE ${whereClause} AND a.status = 'Activo' AND MONTH(a.created_at) = ? AND YEAR(a.created_at) = ?`,
      [currentMonth, currentYear, ...baseParams, currentMonth, currentYear]
    );

    // 1.5 Revenue for the target month (All payments)
    const [revenueRows]: any = await pool.query(
      `SELECT 
        SUM(mp.value) as totalValue,
        SUM(CASE WHEN mp.payment_status = 'Pagado' THEN mp.value ELSE 0 END) as paidValue
      FROM monthly_payments mp
      JOIN affiliations a ON a.id = mp.affiliation_id
      JOIN client_employers ce ON ce.id = a.client_employer_id
      JOIN companies co ON co.id = ce.company_id
      WHERE ${whereClause} AND a.status = 'Activo' AND mp.month = ? AND mp.year = ?`,
      [...baseParams, currentMonth, currentYear]
    );

    // 2. Overdue stats (end_date < today AND payment_status != 'Pagado')
    // We only want to check the *latest* payment for each affiliation.
    // Or simpler: just use affiliations end_date. Wait, the frontend checked if the *latest payment* is not paid.
    const [overdueRows]: any = await pool.query(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(mp.value), 0) as value
      FROM affiliations a
      JOIN client_employers ce ON ce.id = a.client_employer_id
      JOIN companies co ON co.id = ce.company_id
      JOIN monthly_payments mp ON mp.affiliation_id = a.id
      WHERE ${whereClause} 
        AND a.end_date < CURDATE() 
        AND mp.payment_status != 'Pagado'
        AND mp.id = (SELECT MAX(id) FROM monthly_payments WHERE affiliation_id = a.id)`,
      baseParams
    );



    // 4. Revenue Trend (last 6 months from selected month by actual payment date)
    const [trendRows]: any = await pool.query(
      `SELECT 
        MONTH(COALESCE(mp.created_at, a.created_at)) as month,
        YEAR(COALESCE(mp.created_at, a.created_at)) as year,
        SUM(CASE WHEN mp.payment_status != 'Pendiente' THEN mp.value ELSE 0 END) as value,
        COUNT(*) as count,
        SUM(CASE WHEN mp.payment_status = 'Pagado' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN mp.payment_status = 'Pendiente' THEN 1 ELSE 0 END) as pending
      FROM monthly_payments mp
      JOIN affiliations a ON a.id = mp.affiliation_id
      JOIN client_employers ce ON ce.id = a.client_employer_id
      JOIN companies co ON co.id = ce.company_id
      WHERE ${whereClause} 
        AND COALESCE(mp.created_at, a.created_at) >= DATE_SUB(STR_TO_DATE(CONCAT(?, '-', ?, '-01'), '%Y-%m-%d'), INTERVAL 5 MONTH)
        AND DATE(COALESCE(mp.created_at, a.created_at)) <= LAST_DAY(STR_TO_DATE(CONCAT(?, '-', ?, '-01'), '%Y-%m-%d'))
      GROUP BY year, month
      ORDER BY year DESC, month DESC`,
      [...baseParams, currentYear, currentMonth, currentYear, currentMonth]
    );

    // 5. Total affiliations
    const [totalRows]: any = await pool.query(
      `SELECT COUNT(DISTINCT a.id) as total 
       FROM affiliations a
       JOIN client_employers ce ON ce.id = a.client_employer_id
       JOIN companies co ON co.id = ce.company_id
       WHERE ${whereClause}`,
      baseParams
    );

    return {
      currentMonth: {
        total: Number(newAffiliationsRows[0]?.total || 0),
        paid: Number(newAffiliationsRows[0]?.paid || 0),
        pending: Number(newAffiliationsRows[0]?.pending || 0),
        inProcess: Number(newAffiliationsRows[0]?.inProcess || 0)
      },
      currentMonthRevenue: {
        total: Number(revenueRows[0]?.totalValue || 0),
        paid: Number(revenueRows[0]?.paidValue || 0)
      },
      overdue: {
        count: Number(overdueRows[0]?.count || 0),
        value: Number(overdueRows[0]?.value || 0)
      },
      expiringSoon: {
        count: 0,
        value: 0
      },
      trendData: trendRows.map((r: any) => ({
        month: r.month,
        year: r.year,
        value: Number(r.value || 0),
        count: Number(r.count || 0),
        paid: Number(r.paid || 0),
        pending: Number(r.pending || 0)
      }))
    };
  }
}
