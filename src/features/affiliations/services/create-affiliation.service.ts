import db from '../../../config/database.js';

interface CreateAffiliationDTO {
  client_employer_id: number;
  month: number;
  year: number;
  value: number;
  payment_status: 'Pendiente' | 'En Proceso' | 'Pagado';
  payment_method?: 'Efectivo' | 'Transferencia' | 'Nequi' | 'Daviplata' | 'Otro';
  eps_id?: number | null;
  arl_id?: number | null;
  ccf_id?: number | null;
  pension_id?: number | null;
  risk_level?: string | null;
  is_auto_renewed?: boolean;
}

export const createAffiliationService = async (data: CreateAffiliationDTO, createdBy: number, agencyId: number) => {
  // Validación de seguridad: Asegurar que el client_employer_id pertenezca a la agencia del usuario
  const [validClient] = await db.query<any[]>(`
    SELECT ce.id 
    FROM client_employers ce
    INNER JOIN companies co ON ce.company_id = co.id
    WHERE ce.id = ? AND co.agency_id = ?
  `, [data.client_employer_id, agencyId]);

  if (!validClient.length) {
    throw Object.assign(new Error('El cliente no pertenece a tu agencia o no existe'), { status: 403 });
  }

  const [result] = await db.query<any>(`
    INSERT INTO monthly_affiliations (
      client_employer_id, month, year, value, 
      payment_status, payment_method, eps_id, arl_id, ccf_id, pension_id, 
      risk_level, is_auto_renewed, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.client_employer_id,
    data.month,
    data.year,
    data.value,
    data.payment_status,
    data.payment_method || null,
    data.eps_id || null,
    data.arl_id || null,
    data.ccf_id || null,
    data.pension_id || null,
    data.risk_level || null,
    data.is_auto_renewed ? 1 : 0,
    createdBy
  ]);

  return { id: result.insertId };
};
