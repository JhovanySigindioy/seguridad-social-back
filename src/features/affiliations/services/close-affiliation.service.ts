import db from '../../../config/database.js';

interface CloseAffiliationDTO {
  affiliationId: number;
  endDate: string;
  withdrawalReason: string;
  withdrawalObservations?: string | undefined;
  agencyId: number;
}

export class CloseAffiliationService {
  async execute({
    affiliationId,
    endDate,
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

    const startDate = new Date(existing[0].start_date);
    const selectedEndDate = new Date(endDate);
    selectedEndDate.setHours(23, 59, 59, 999);

    let daysWorked = Math.ceil((selectedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (daysWorked < 0) daysWorked = 0;

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