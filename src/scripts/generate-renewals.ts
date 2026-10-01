import db from '../config/database.js';

async function generateRenewals(targetMonth: number, targetYear: number) {
  try {
    console.log(`Generando candidatos de continuidad para ${targetMonth}/${targetYear}...`);

    const targetStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const previousMonthDate = new Date(Date.UTC(targetYear, targetMonth - 2, 1));
    const previousMonth = previousMonthDate.getUTCMonth() + 1;
    const previousYear = previousMonthDate.getUTCFullYear();
    const previousStart = `${previousYear}-${String(previousMonth).padStart(2, '0')}-01`;

    // Only confirmed coverage with a paid or in-process previous payment is renewed.
    const [activeAffiliations]: any = await db.query(
      `SELECT a.id, a.client_employer_id, a.created_by, a.eps_id, a.arl_id,
        a.ccf_id, a.pension_id, a.risk_level, a.observation,
        (SELECT value FROM monthly_payments mp WHERE mp.affiliation_id = a.id ORDER BY year DESC, month DESC LIMIT 1) as last_value
       FROM affiliations a
       WHERE a.status = 'Activo'
         AND a.decision_status = 'Confirmada'
         AND a.start_date < ?
         AND (a.end_date IS NULL OR a.end_date >= ?)
         AND (SELECT payment_status FROM monthly_payments mp WHERE mp.affiliation_id = a.id ORDER BY year DESC, month DESC LIMIT 1)
             IN ('Pagado', 'En Proceso')`
      , [targetStart, previousStart]
    );

    let inserted = 0;

    for (const aff of activeAffiliations) {
      // A candidate is an independent affiliation period, not a payment on the old one.
      const [existing]: any = await db.query(
        `SELECT id FROM affiliations WHERE client_employer_id = ? AND start_date = ? LIMIT 1`,
        [aff.client_employer_id, targetStart]
      );

      if (existing.length === 0) {
        const connection = await db.getConnection();
        try {
          await connection.beginTransaction();
          const [result]: any = await connection.query(
            `INSERT INTO affiliations (
              client_employer_id, start_date, end_date, status, decision_status,
              affiliation_origin, proposed_value, days_worked, eps_id, arl_id, ccf_id, pension_id,
              risk_level, created_by, observation
            ) VALUES (?, ?, LAST_DAY(?), 'Activo', 'Confirmada', 'CONTINUIDAD', ?,
              DAY(LAST_DAY(?)), ?, ?, ?, ?, ?, ?, ?)`,
            [
              aff.client_employer_id,
              targetStart,
              targetStart,
              aff.last_value ?? 0,
              targetStart,
              aff.eps_id,
              aff.arl_id,
              aff.ccf_id,
              aff.pension_id,
              aff.risk_level,
              aff.created_by,
              aff.observation,
            ]
          );

          await connection.query(
            `INSERT INTO monthly_payments (
              affiliation_id, month, year, value, payment_status, payment_method,
              is_auto_renewed, created_by, received_date
            ) VALUES (?, ?, ?, ?, 'Pendiente', NULL, 1, ?, NULL)`,
            [result.insertId, targetMonth, targetYear, aff.last_value ?? 0, aff.created_by]
          );

          await connection.commit();
          inserted++;
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      }
    }

    console.log(`Proceso completado. Se generaron ${inserted} continuidades con pago Pendiente.`);
    process.exit(0);
  } catch (error) {
    console.error('Error generando renovaciones:', error);
    process.exit(1);
  }
}

const currentMonth = Number(process.argv[2]) || new Date().getMonth() + 1;
const currentYear = Number(process.argv[3]) || new Date().getFullYear();

generateRenewals(currentMonth, currentYear);
