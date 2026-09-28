import db from '../../../config/database.js';

export class ConfirmAffiliationService {
  async execute(affiliationId: number, agencyId: number, createdBy: number) {
    const [rows]: any = await db.query(
      `SELECT a.id, a.client_employer_id, a.start_date, a.end_date,
              a.decision_status, a.proposed_value
       FROM affiliations a
       INNER JOIN client_employers ce ON ce.id = a.client_employer_id
       INNER JOIN companies co ON co.id = ce.company_id
       WHERE a.id = ? AND co.agency_id = ?
       LIMIT 1`,
      [affiliationId, agencyId]
    );

    if (!rows.length) throw Object.assign(new Error('Afiliación no encontrada.'), { status: 404 });
    const candidate = rows[0];
    if (candidate.decision_status !== 'Por Confirmar') {
      throw Object.assign(new Error('La afiliación no está pendiente de confirmación.'), { status: 409 });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        `UPDATE affiliations SET decision_status = 'Confirmada' WHERE id = ?`,
        [affiliationId]
      );
      await connection.query(
        `INSERT INTO monthly_payments
          (affiliation_id, month, year, value, payment_status, is_auto_renewed, created_by)
         VALUES (?, MONTH(?), YEAR(?), ?, 'Pendiente', 0, ?)`,
        [affiliationId, candidate.start_date, candidate.start_date, candidate.proposed_value ?? 0, createdBy]
      );
      await connection.commit();
      return { id: affiliationId, decision_status: 'Confirmada', payment_status: 'Pendiente' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
