import db from '../../../config/database.js';
import { AffiliationOverlapValidator } from './affiliation-overlap.validator.js';

interface RenewAffiliationInput {
  affiliationId: number;
  agencyId: number;
  createdBy: number;
  targetMonth?: number;
  targetYear?: number;
}

const periodIndex = (year: number, month: number) => year * 12 + month;

export class RenewAffiliationService {
  async execute({ affiliationId, agencyId, createdBy, targetMonth, targetYear }: RenewAffiliationInput) {
    const [rows]: any = await db.query(
      `SELECT a.*, ce.client_id, ce.company_id, ce.office_id, co.agency_id,
               mp.value, mp.payment_method
       FROM affiliations a
       INNER JOIN client_employers ce ON ce.id = a.client_employer_id
       INNER JOIN companies co ON co.id = ce.company_id
       LEFT JOIN monthly_payments mp ON mp.affiliation_id = a.id
         AND mp.month = MONTH(a.start_date) AND mp.year = YEAR(a.start_date)
       WHERE a.id = ? AND co.agency_id = ?
       LIMIT 1`,
      [affiliationId, agencyId]
    );

    if (!rows.length) {
      throw Object.assign(new Error('Afiliación no encontrada.'), { status: 404 });
    }

    const source = rows[0];
    if (source.decision_status !== 'Confirmada' || source.status === 'Inactivo') {
      throw Object.assign(new Error('Solo se puede crear el siguiente periodo desde una afiliación confirmada que no esté retirada.'), { status: 409 });
    }
    const sourceDate = new Date(source.start_date);
    const sourceMonth = sourceDate.getUTCMonth() + 1;
    const sourceYear = sourceDate.getUTCFullYear();
    const nextPeriod = periodIndex(sourceYear, sourceMonth) + 1;
    const requestedMonth = targetMonth ?? (nextPeriod % 12 || 12);
    const requestedYear = targetYear ?? (sourceMonth === 12 ? sourceYear + 1 : sourceYear);

    if (periodIndex(requestedYear, requestedMonth) !== nextPeriod) {
      throw Object.assign(new Error('La renovación debe corresponder al periodo inmediatamente siguiente.'), { status: 400 });
    }

    const startDate = `${requestedYear}-${String(requestedMonth).padStart(2, '0')}-01`;
    const endDate = new Date(Date.UTC(requestedYear, requestedMonth, 0));
    const endDateString = `${requestedYear}-${String(requestedMonth).padStart(2, '0')}-${String(endDate.getUTCDate()).padStart(2, '0')}`;
    const validator = new AffiliationOverlapValidator(agencyId);
    const validation = await validator.validate({
      client_employer_id: source.client_employer_id,
      start_date: startDate,
      end_date: endDateString,
      month: requestedMonth,
      year: requestedYear,
    });

    if (!validation.valid) {
      throw Object.assign(new Error(validation.error || 'El periodo ya está registrado.'), { status: 409 });
    }

    const daysWorked = validator.calculateDaysWorked(startDate, endDateString);
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();
      const affiliationOrigin = source.status === 'Inactivo' ? 'REINGRESO' : 'CONTINUIDAD';
      const [result]: any = await connection.query(
        `INSERT INTO affiliations (
           client_employer_id, start_date, end_date, status, decision_status, affiliation_origin, days_worked,
           eps_id, arl_id, ccf_id, pension_id, risk_level, created_by, observation
         ) VALUES (?, ?, ?, 'Activo', 'Confirmada', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [source.client_employer_id, startDate, endDateString, affiliationOrigin, daysWorked, source.eps_id, source.arl_id, source.ccf_id, source.pension_id, source.risk_level, createdBy, source.observation]
      );

      await connection.query(
        `INSERT INTO monthly_payments (
           affiliation_id, month, year, value, payment_status, payment_method,
           is_auto_renewed, created_by
         ) VALUES (?, ?, ?, ?, 'Pendiente', ?, 0, ?)`,
        [result.insertId, requestedMonth, requestedYear, source.value ?? 0, source.payment_method, createdBy]
      );

      await connection.commit();
      return { id: result.insertId, month: requestedMonth, year: requestedYear, start_date: startDate, end_date: endDateString, status: 'Activo' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
