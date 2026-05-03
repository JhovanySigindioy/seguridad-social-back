import db from '../../../config/database.js';

interface CreateAffiliationDTO {
  client_id: number;
  company_id: number;
  value: number;
  payment_method?: 'Efectivo' | 'Transferencia' | 'Nequi' | 'Daviplata' | 'Otro';
  eps_id?: number | null;
  arl_id?: number | null;
  ccf_id?: number | null;
  pension_id?: number | null;
  risk_level?: string | null;
  is_auto_renewed?: boolean;
}

export const createAffiliationService = async (data: CreateAffiliationDTO, createdBy: number, agencyId: number) => {
  const createdAt = new Date();
  const month = createdAt.getMonth() + 1;
  const year = createdAt.getFullYear();

  const [validClient]: any = await db.query(
    `SELECT c.id, c.office_id
     FROM clients c
     INNER JOIN offices o ON o.id = c.office_id
     WHERE c.id = ? AND o.agency_id = ?`,
    [data.client_id, agencyId]
  );

  if (!validClient.length) {
    throw Object.assign(new Error('El cliente no existe o no pertenece a tu agencia'), { status: 403 });
  }

  const clientOfficeId = validClient[0].office_id;

  const [validCompany]: any = await db.query(
    `SELECT id FROM companies WHERE id = ? AND agency_id = ? AND is_active = 1`,
    [data.company_id, agencyId]
  );

  if (!validCompany.length) {
    throw Object.assign(new Error('La empresa no existe o no pertenece a tu agencia'), { status: 403 });
  }

  let [existingClientEmployer]: any = await db.query(
    `SELECT id FROM client_employers WHERE client_id = ? AND company_id = ? AND is_active = 1`,
    [data.client_id, data.company_id]
  );

  let clientEmployerId: number;

  if (existingClientEmployer.length > 0) {
    clientEmployerId = existingClientEmployer[0].id;
  } else {
    const [result]: any = await db.query(
      `INSERT INTO client_employers (client_id, company_id, office_id, is_active, start_date) VALUES (?, ?, ?, 1, CURDATE())`,
      [data.client_id, data.company_id, clientOfficeId]
    );
    clientEmployerId = result.insertId;
  }

  try {
    const [result]: any = await db.query(
      `INSERT INTO monthly_affiliations (
         client_employer_id, month, year, value,
         payment_status, payment_method, eps_id, arl_id, ccf_id, pension_id,
         risk_level, is_auto_renewed, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientEmployerId,
        month,
        year,
        data.value,
        'Pendiente',
        data.payment_method || null,
        data.eps_id || null,
        data.arl_id || null,
        data.ccf_id || null,
        data.pension_id || null,
        data.risk_level || null,
        data.is_auto_renewed ? 1 : 0,
        createdBy,
      ]
    );

    return { id: result.insertId };
  } catch (error: any) {
    if (error.errno === 1062 && error.sqlMessage?.includes('uk_affiliation_period')) {
      throw Object.assign(new Error('Este cliente ya tiene una afiliación registrada para el mismo mes y año. Solo puedes tener una afiliación por período.'), { status: 409 });
    }
    throw error;
  }
};
