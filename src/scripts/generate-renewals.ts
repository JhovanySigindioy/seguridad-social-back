import db from '../config/database.js';

async function generateRenewals(targetMonth: number, targetYear: number) {
  try {
    console.log(`Generando renovaciones pendientes para ${targetMonth}/${targetYear}...`);

    // Obtener todas las afiliaciones activas
    const [activeAffiliations]: any = await db.query(
      `SELECT a.id, a.created_by,
        (SELECT value FROM monthly_payments mp WHERE mp.affiliation_id = a.id ORDER BY year DESC, month DESC LIMIT 1) as last_value
       FROM affiliations a
       WHERE a.status = 'Activo'`
    );

    let inserted = 0;

    for (const aff of activeAffiliations) {
      // Validar si ya existe el pago para este mes y año
      const [existing]: any = await db.query(
        `SELECT id FROM monthly_payments WHERE affiliation_id = ? AND month = ? AND year = ?`,
        [aff.id, targetMonth, targetYear]
      );

      if (existing.length === 0) {
        await db.query(
          `INSERT INTO monthly_payments (
            affiliation_id, month, year, value, payment_status, is_auto_renewed, created_by
          ) VALUES (?, ?, ?, ?, 'Pendiente', 1, ?)`,
          [aff.id, targetMonth, targetYear, aff.last_value || 0, aff.created_by]
        );
        inserted++;
      }
    }

    console.log(`Proceso completado. Se generaron ${inserted} cobros mensuales pendientes.`);
    process.exit(0);
  } catch (error) {
    console.error('Error generando renovaciones:', error);
    process.exit(1);
  }
}

const currentMonth = new Date().getMonth() + 1; // 1-12
const currentYear = new Date().getFullYear();

generateRenewals(currentMonth, currentYear);
