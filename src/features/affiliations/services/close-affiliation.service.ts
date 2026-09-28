import db from '../../../config/database.js';

interface CloseAffiliationDTO {
  affiliationId: number;
  endDate: string;
  withdrawalReason: string;
  withdrawalObservations?: string | undefined;
  agencyId: number;
  createdBy: number;
}

export class CloseAffiliationService {
  async execute({
    affiliationId,
    endDate,
    withdrawalReason,
    withdrawalObservations,
    agencyId,
    createdBy,
  }: CloseAffiliationDTO) {
    const [existing]: any = await db.query(`
      SELECT a.id, a.client_employer_id, a.status, a.start_date
      FROM affiliations a
      INNER JOIN client_employers ce ON ce.id = a.client_employer_id
      INNER JOIN companies co ON co.id = ce.company_id
      WHERE a.id = ? AND co.agency_id = ?
    `, [affiliationId, agencyId]);

    if (!existing.length) {
      throw Object.assign(new Error('Afiliación no encontrada'), { status: 404 });
    }

    if (existing[0].status !== 'Activo') {
      throw Object.assign(new Error('Solo se puede retirar una afiliación vigente.'), { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw Object.assign(new Error('La fecha de retiro no es válida.'), { status: 400 });
    }

    const startDate = new Date(`${String(existing[0].start_date).slice(0, 10)}T00:00:00Z`);
    const selectedEndDate = new Date(`${endDate}T00:00:00Z`);
    const lastDayOfPeriod = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0));

    if (Number.isNaN(selectedEndDate.getTime()) || selectedEndDate < startDate || selectedEndDate > lastDayOfPeriod) {
      throw Object.assign(new Error('La fecha de retiro debe estar dentro del periodo mensual de la afiliación.'), { status: 400 });
    }

    const daysWorked = Math.floor((selectedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(`
        UPDATE affiliations SET
          end_date = ?,
          status = 'Inactivo',
          days_worked = ?,
          withdrawal_reason = ?,
          withdrawal_observations = ?
        WHERE id = ?
      `, [endDate, daysWorked, withdrawalReason, withdrawalObservations || null, affiliationId]);

      await connection.query(
        `INSERT INTO client_employer_status_history
          (client_employer_id, status, effective_date, reason, observations, created_by)
         VALUES (?, 'Retirado', ?, ?, ?, ?)`,
        [existing[0].client_employer_id, endDate, withdrawalReason, withdrawalObservations || null, createdBy]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return {
      id: affiliationId,
      end_date: endDate,
      status: 'Inactivo',
      days_worked: daysWorked,
      withdrawal_reason: withdrawalReason,
    };
  }
}
