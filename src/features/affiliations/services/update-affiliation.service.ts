import db from '../../../config/database.js';

interface UpdateAffiliationDTO {
  affiliationId: number;
  agencyId: number;
  client_id: number;
  company_id: number;
  start_date?: string | null;
  end_date?: string | null;
  value: number;
  eps_id: number | null;
  arl_id: number | null;
  ccf_id: number | null;
  pension_id: number | null;
  risk_level: string | null;
  payment_method: string | null;
  is_auto_renewed?: boolean;
  observation?: string | null;
  withdrawal_reason?: string | null;
  withdrawal_observations?: string | null;
  month?: number | undefined;
  year?: number | undefined;
  received_date?: string | null;
  gov_record_at?: string | null;
  created_at?: string | null;
  userId: number;
}

interface ExistingAffiliation {
  id: number;
  client_employer_id: number;
  client_id: number;
  company_id: number;
  start_date: string;
  end_date: string | null;
  status: string;
}

export class UpdateAffiliationService {
  async getAffiliation(affiliationId: number, agencyId: number): Promise<ExistingAffiliation | null> {
    const [rows]: any = await db.query(
      `SELECT a.id, a.client_employer_id, ce.client_id, ce.company_id,
              a.start_date, a.end_date, a.status
       FROM affiliations a
       INNER JOIN client_employers ce ON ce.id = a.client_employer_id
       INNER JOIN companies co ON co.id = ce.company_id
       WHERE a.id = ? AND co.agency_id = ?
       LIMIT 1`,
      [affiliationId, agencyId]
    );

    return rows.length > 0 ? rows[0] : null;
  }

  async execute(dto: UpdateAffiliationDTO) {
    const { 
      affiliationId, agencyId, client_id, company_id, 
      start_date, end_date, value, eps_id, arl_id, 
      ccf_id, pension_id, risk_level, payment_method, 
      is_auto_renewed, observation 
    } = dto;
    const withdrawalReason = dto.withdrawal_reason ?? null;
    const withdrawalObservations = dto.withdrawal_observations ?? null;

    const [existing] = await db.query<any[]>(
      `SELECT a.id FROM affiliations a
       INNER JOIN client_employers ce ON ce.id = a.client_employer_id
       INNER JOIN companies co ON co.id = ce.company_id
       WHERE a.id = ? AND co.agency_id = ?
       LIMIT 1`,
      [affiliationId, agencyId]
    );

    if (!existing.length) {
      throw Object.assign(new Error('Afiliación no encontrada'), { status: 404 });
    }

    const existingAffiliation = await this.getAffiliation(affiliationId, agencyId);
    if (!existingAffiliation) {
      throw Object.assign(new Error('Afiliación no encontrada'), { status: 404 });
    }
    if (existingAffiliation.client_id !== client_id || existingAffiliation.company_id !== company_id) {
      throw Object.assign(new Error('No se puede cambiar el cliente o la empresa de una afiliación existente.'), { status: 409 });
    }

    const clientEmployerId = existingAffiliation.client_employer_id;

    const endDateValue = end_date || null;
    
    const newStatus = existingAffiliation?.status || 'Activo';
    
    const daysWorked = start_date ? this.calculateDaysWorked(start_date, endDateValue) : null;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query(
        `UPDATE affiliations SET
          client_employer_id = ?,
          start_date = ?,
          end_date = ?,
          status = ?,
          days_worked = ?,
          eps_id = ?,
          arl_id = ?,
          ccf_id = ?,
          pension_id = ?,
          risk_level = ?,
          observation = ?,
          withdrawal_reason = ?,
          withdrawal_observations = ?
         WHERE id = ?`,
         [clientEmployerId, start_date ?? null, endDateValue, newStatus, daysWorked ?? null, eps_id, arl_id, ccf_id, pension_id, risk_level, observation || null, withdrawalReason, withdrawalObservations, affiliationId]
      );

      // UPSERT payment value for the specific month/year
      const d = start_date ? new Date(start_date) : null;
      const targetMonth = dto.month || (d ? d.getUTCMonth() + 1 : null);
      const targetYear = dto.year || (d ? d.getUTCFullYear() : null);

      if (targetMonth && targetYear) {
        await connection.query(
          `INSERT INTO monthly_payments 
            (affiliation_id, month, year, value, payment_status, payment_method, is_auto_renewed, created_by, gov_record_at, created_at, received_date)
           VALUES (?, ?, ?, ?, 'Pendiente', ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            value = VALUES(value),
            payment_method = VALUES(payment_method),
            is_auto_renewed = VALUES(is_auto_renewed),
            gov_record_at = IF(VALUES(gov_record_at) IS NOT NULL, VALUES(gov_record_at), gov_record_at),
            created_at = IF(VALUES(created_at) IS NOT NULL, VALUES(created_at), created_at),
            received_date = VALUES(received_date)`,
          [
             affiliationId, targetMonth, targetYear, value, payment_method, is_auto_renewed ? 1 : 0, dto.userId,
             dto.gov_record_at ?? null, dto.created_at ?? null, dto.received_date ?? null
          ]
        );
      }

      await connection.commit();
      connection.release();
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }

    return {
      id: affiliationId,
      client_employer_id: clientEmployerId,
      start_date: start_date ?? null,
      end_date: endDateValue,
      status: newStatus,
      days_worked: daysWorked,
      value,
      eps_id,
      arl_id,
      ccf_id,
      pension_id,
      risk_level,
      payment_method,
      is_auto_renewed,
      observation: observation || null,
      withdrawal_reason: withdrawalReason,
      withdrawal_observations: withdrawalObservations,
    };
  }

  private calculateDaysWorked(start_date: string, end_date: string | null): number {
    const start = new Date(start_date);
    const end = end_date ? new Date(end_date) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}
