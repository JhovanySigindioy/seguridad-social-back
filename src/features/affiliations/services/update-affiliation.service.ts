import db from '../../../config/database.js';

interface UpdateAffiliationDTO {
  affiliationId: number;
  agencyId: number;
  client_id: number;
  company_id: number;
  value: number;
  eps_id: number | null;
  arl_id: number | null;
  ccf_id: number | null;
  pension_id: number | null;
  risk_level: string | null;
  payment_method: string | null;
  is_auto_renewed: boolean;
}

export class UpdateAffiliationService {
  async execute(dto: UpdateAffiliationDTO) {
    const { affiliationId, agencyId, client_id, company_id, value, eps_id, arl_id, ccf_id, pension_id, risk_level, payment_method, is_auto_renewed } = dto;

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

    await db.query(
      `UPDATE monthly_affiliations SET
        client_employer_id = ?,
        value = ?,
        eps_id = ?,
        arl_id = ?,
        ccf_id = ?,
        pension_id = ?,
        risk_level = ?,
        payment_method = ?,
        is_auto_renewed = ?
       WHERE id = ?`,
      [clientEmployerId, value, eps_id, arl_id, ccf_id, pension_id, risk_level, payment_method, is_auto_renewed ? 1 : 0, affiliationId]
    );

    return { id: affiliationId, client_employer_id: clientEmployerId, value, eps_id, arl_id, ccf_id, pension_id, risk_level, payment_method, is_auto_renewed };
  }
}