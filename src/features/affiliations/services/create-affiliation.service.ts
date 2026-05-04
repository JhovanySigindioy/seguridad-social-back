import db from '../../../config/database.js';
import { validateNewAffiliation, AffiliationOverlapValidator } from './affiliation-overlap.validator.js';

interface CreateAffiliationDTO {
  client_id: number;
  company_id: number;
  start_date: string;
  end_date?: string;
  value: number;
  payment_method?: 'Efectivo' | 'Transferencia' | 'Nequi' | 'Daviplata' | 'Otro';
  eps_id?: number | null;
  arl_id?: number | null;
  ccf_id?: number | null;
  pension_id?: number | null;
  risk_level?: string | null;
  is_auto_renewed?: boolean;
  observation?: string;
}

export const createAffiliationService = async (data: CreateAffiliationDTO, createdBy: number, agencyId: number) => {
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

  const startDateObj = new Date(data.start_date);
  const month = startDateObj.getMonth() + 1;
  const year = startDateObj.getFullYear();

  const validator = new AffiliationOverlapValidator(agencyId);
  const daysWorked = validator.calculateDaysWorked(data.start_date, data.end_date || null);

  const validation = await validator.validate({
    client_employer_id: clientEmployerId,
    start_date: data.start_date,
    end_date: data.end_date || null,
    month,
    year,
  });

  if (!validation.valid) {
    throw Object.assign(new Error(validation.error), { status: 409 });
  }

  try {
    const [result]: any = await db.query(
      `INSERT INTO monthly_affiliations (
         client_employer_id, start_date, end_date, status,
         month, year, days_worked, value,
         payment_status, payment_method, eps_id, arl_id, ccf_id, pension_id,
         risk_level, is_auto_renewed, created_by, observation
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientEmployerId,
        data.start_date,
        data.end_date || null,
        data.end_date ? 'Inactivo' : 'Activo',
        month,
        year,
        daysWorked,
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
        data.observation || null,
      ]
    );

    return { id: result.insertId };
  } catch (error: any) {
    if (error.errno === 1062) {
      if (error.sqlMessage?.includes('uk_affiliation_client_start')) {
        throw Object.assign(
          new Error('Ya existe una afiliación registrada para este trabajador con fecha de inicio igual o anterior.'),
          { status: 409 }
        );
      }
      throw Object.assign(
        new Error('Ya existe un registro duplicado con los mismos datos.'),
        { status: 409 }
      );
    }
    throw error;
  }
};

export const closeAffiliationService = async (
  affiliationId: number,
  endDate: string,
  withdrawalReason: string,
  withdrawalObservations: string | null,
  agencyId: number
) => {
  const [existing]: any = await db.query(`
    SELECT ma.id, ma.client_employer_id, ma.status
    FROM monthly_affiliations ma
    INNER JOIN client_employers ce ON ce.id = ma.client_employer_id
    INNER JOIN companies co ON co.id = ce.company_id
    WHERE ma.id = ? AND co.agency_id = ?
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

  const validator = new AffiliationOverlapValidator(agencyId);
  const daysWorked = validator.calculateDaysWorked(
    existing[0].start_date,
    endDate
  );

  await db.query(`
    UPDATE monthly_affiliations SET
      end_date = ?,
      status = 'Inactivo',
      days_worked = ?,
      withdrawal_reason = ?,
      withdrawal_observations = ?
    WHERE id = ?
  `, [endDate, daysWorked, withdrawalReason, withdrawalObservations, affiliationId]);

  return { id: affiliationId, end_date: endDate, status: 'Inactivo' };
};
