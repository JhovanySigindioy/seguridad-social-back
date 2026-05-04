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
  is_auto_renewed: boolean;
  observation?: string | null;
}

interface ExistingAffiliation {
  id: number;
  client_employer_id: number;
  start_date: string;
  end_date: string | null;
  status: string;
}

export class UpdateAffiliationService {
  async getAffiliation(affiliationId: number, agencyId: number): Promise<ExistingAffiliation | null> {
    const [rows]: any = await db.query(
      `SELECT ma.id, ma.client_employer_id, ma.start_date, ma.end_date, ma.status
       FROM monthly_affiliations ma
       INNER JOIN client_employers ce ON ce.id = ma.client_employer_id
       INNER JOIN companies co ON co.id = ce.company_id
       WHERE ma.id = ? AND co.agency_id = ?
       LIMIT 1`,
      [affiliationId, agencyId]
    );

    return rows.length > 0 ? rows[0] : null;
  }

  async execute(dto: UpdateAffiliationDTO) {
    const { affiliationId, agencyId, client_id, company_id, start_date, end_date, value, eps_id, arl_id, ccf_id, pension_id, risk_level, payment_method, is_auto_renewed, observation } = dto;

    const [existing] = await db.query<any[]>(
      `SELECT ma.id FROM monthly_affiliations ma
       INNER JOIN client_employers ce ON ce.id = ma.client_employer_id
       INNER JOIN companies co ON co.id = ce.company_id
       WHERE ma.id = ? AND co.agency_id = ?
       LIMIT 1`,
      [affiliationId, agencyId]
    );

    if (!existing.length) {
      throw Object.assign(new Error('Afiliación no encontrada'), { status: 404 });
    }

    let [clientEmployerRows] = await db.query<any[]>(
      `SELECT ce.id FROM client_employers ce
       WHERE ce.client_id = ? AND ce.company_id = ?
       LIMIT 1`,
      [client_id, company_id]
    );

    let clientEmployerId: number;

    if (!clientEmployerRows.length) {
      const [insertResult]: any = await db.query(
        `INSERT INTO client_employers (client_id, company_id) VALUES (?, ?)`,
        [client_id, company_id]
      );
      clientEmployerId = insertResult.insertId;
    } else {
      clientEmployerId = clientEmployerRows[0].id;
    }

    const existingAffiliation = await this.getAffiliation(affiliationId, agencyId);
    const endDateValue = end_date || null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDateObj = endDateValue ? new Date(endDateValue) : null;
    
    let newStatus: string;
    if (endDateObj) {
      endDateObj.setHours(0, 0, 0, 0);
      newStatus = endDateObj < today ? 'Inactivo' : (existingAffiliation?.status || 'Activo');
    } else {
      newStatus = existingAffiliation?.status || 'Activo';
    }
    
    const daysWorked = start_date ? this.calculateDaysWorked(start_date, endDateValue) : null;

    await db.query(
      `UPDATE monthly_affiliations SET
        client_employer_id = ?,
        start_date = ?,
        end_date = ?,
        status = ?,
        days_worked = ?,
        value = ?,
        eps_id = ?,
        arl_id = ?,
        ccf_id = ?,
        pension_id = ?,
        risk_level = ?,
        payment_method = ?,
        is_auto_renewed = ?,
        observation = ?
       WHERE id = ?`,
       [clientEmployerId, start_date ?? null, endDateValue, newStatus, daysWorked ?? null, value, eps_id, arl_id, ccf_id, pension_id, risk_level, payment_method, is_auto_renewed ? 1 : 0, observation || null, affiliationId]
    );

    return { id: affiliationId, client_employer_id: clientEmployerId, start_date: start_date ?? null, end_date: endDateValue, status: newStatus, days_worked: daysWorked, value, eps_id, arl_id, ccf_id, pension_id, risk_level, payment_method, is_auto_renewed };
  }

  private calculateDaysWorked(start_date: string, end_date: string | null): number {
    const start = new Date(start_date);
    const end = end_date ? new Date(end_date) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}