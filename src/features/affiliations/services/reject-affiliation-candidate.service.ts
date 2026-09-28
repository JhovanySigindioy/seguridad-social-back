import db from '../../../config/database.js';

interface RejectCandidateInput {
  affiliationId: number;
  agencyId: number;
  createdBy: number;
  reason: string;
  observations?: string | null;
}

export class RejectAffiliationCandidateService {
  async execute({ affiliationId, agencyId, createdBy, reason, observations }: RejectCandidateInput) {
    const [rows]: any = await db.query(
      `SELECT a.id, a.client_employer_id, a.start_date, a.decision_status
       FROM affiliations a
       INNER JOIN client_employers ce ON ce.id = a.client_employer_id
       INNER JOIN companies co ON co.id = ce.company_id
       WHERE a.id = ? AND co.agency_id = ? LIMIT 1`,
      [affiliationId, agencyId]
    );

    if (!rows.length) throw Object.assign(new Error('Afiliación no encontrada.'), { status: 404 });
    if (rows[0].decision_status !== 'Por Confirmar') {
      throw Object.assign(new Error('La afiliación no está pendiente de decisión.'), { status: 409 });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        `UPDATE affiliations
         SET decision_status = 'No Continúa', withdrawal_reason = ?, withdrawal_observations = ?
         WHERE id = ?`,
        [reason, observations ?? null, affiliationId]
      );
      await connection.query(
        `INSERT INTO client_employer_status_history
          (client_employer_id, status, effective_date, reason, observations, created_by)
         VALUES (?, 'Retirado', ?, ?, ?, ?)`,
        [rows[0].client_employer_id, rows[0].start_date, reason, observations ?? null, createdBy]
      );
      await connection.commit();
      return { id: affiliationId, decision_status: 'No Continúa' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
