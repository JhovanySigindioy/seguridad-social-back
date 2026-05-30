import db from '../../../config/database.js';

interface CloseAffiliationDTO {
  affiliationId: number;
  withdrawalReason: string;
  withdrawalObservations?: string | undefined;
  agencyId: number;
}

export class CloseAffiliationService {
  async execute({
    affiliationId,
    withdrawalReason,
    withdrawalObservations,
    agencyId,
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

    if (existing[0].status === 'Inactivo') {
      throw Object.assign(
        new Error('Esta afiliación ya se encuentra cerrada.'),
        { status: 400 }
      );
    }

    const startDate = new Date(existing[0].start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysWorked = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const endDate = today.toISOString().split('T')[0];

    await db.query(`
      UPDATE affiliations SET
        end_date = ?,
        status = 'Inactivo',
        days_worked = ?,
        withdrawal_reason = ?,
        withdrawal_observations = ?
      WHERE id = ?
    `, [endDate, daysWorked, withdrawalReason, withdrawalObservations || null, affiliationId]);

    return {
      id: affiliationId,
      end_date: endDate,
      status: 'Inactivo',
      days_worked: daysWorked,
      withdrawal_reason: withdrawalReason,
    };
  }
}