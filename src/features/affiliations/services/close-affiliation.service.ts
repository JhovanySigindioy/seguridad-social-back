import db from '../../../config/database.js';
import logger from '../../../shared/utils/logger.js';

const formatDateForLog = (date: Date) => Number.isNaN(date.getTime()) ? 'Invalid Date' : date.toISOString();

const toDateOnly = (value: unknown) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  const match = String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
};

const parseDateOnly = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

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
    logger.info('Affiliation close service started', {
      affiliationId,
      endDate,
      withdrawalReason,
      agencyId,
      agencyIdType: typeof agencyId,
      agencyIdIsFinite: Number.isFinite(Number(agencyId)),
      createdBy,
      createdByType: typeof createdBy,
    });

    const lookupParams = [affiliationId, agencyId];
    logger.debug('Affiliation close lookup query parameters', {
      affiliationId,
      agencyId,
      params: lookupParams,
    });

    let existing: any;
    try {
      [existing] = await db.query(`
        SELECT a.id, a.client_employer_id, a.status, a.start_date
        FROM affiliations a
        INNER JOIN client_employers ce ON ce.id = a.client_employer_id
        INNER JOIN companies co ON co.id = ce.company_id
        WHERE a.id = ? AND co.agency_id = ?
      `, lookupParams);
    } catch (error: any) {
      logger.error('Affiliation close lookup query failed', {
        affiliationId,
        agencyId,
        params: lookupParams,
        error: {
          message: error.message,
          code: error.code,
          errno: error.errno,
          sqlState: error.sqlState,
          sqlMessage: error.sqlMessage,
        },
      });
      throw error;
    }

    logger.info('Affiliation close lookup completed', {
      affiliationId,
      agencyId,
      rowsFound: existing.length,
      affiliation: existing[0]
        ? {
            id: existing[0].id,
            clientEmployerId: existing[0].client_employer_id,
            status: existing[0].status,
            startDate: existing[0].start_date,
          }
        : null,
    });

    if (!existing.length) {
      throw Object.assign(new Error('Afiliación no encontrada'), { status: 404 });
    }

    if (existing[0].status !== 'Activo') {
      throw Object.assign(new Error('Solo se puede retirar una afiliación vigente.'), { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw Object.assign(new Error('La fecha de retiro no es válida.'), { status: 400 });
    }

    const startDateOnly = toDateOnly(existing[0].start_date);
    const startDate = startDateOnly ? parseDateOnly(startDateOnly) : null;
    const selectedEndDate = parseDateOnly(endDate);
    const lastDayOfPeriod = startDate
      ? new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0))
      : null;

    logger.info('Affiliation close dates calculated', {
      affiliationId,
      rawStartDate: existing[0].start_date,
      startDateOnly,
      startDate: startDate ? formatDateForLog(startDate) : 'Invalid Date',
      selectedEndDate: selectedEndDate ? formatDateForLog(selectedEndDate) : 'Invalid Date',
      lastDayOfPeriod: lastDayOfPeriod ? formatDateForLog(lastDayOfPeriod) : 'Invalid Date',
      startDateIsValid: Boolean(startDate),
      selectedEndDateIsValid: Boolean(selectedEndDate),
      lastDayOfPeriodIsValid: Boolean(lastDayOfPeriod),
    });

    if (!startDate || !selectedEndDate || !lastDayOfPeriod || selectedEndDate < startDate || selectedEndDate > lastDayOfPeriod) {
      throw Object.assign(new Error('La fecha de retiro debe estar dentro del periodo mensual de la afiliación.'), { status: 400 });
    }

    const daysWorked = Math.floor((selectedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    logger.info('Affiliation close workdays calculated', {
      affiliationId,
      daysWorked,
      daysWorkedIsFinite: Number.isFinite(daysWorked),
    });

    if (!Number.isInteger(daysWorked) || daysWorked <= 0 || !Number.isFinite(daysWorked)) {
      throw Object.assign(new Error('No fue posible calcular los días trabajados de la afiliación.'), { status: 400 });
    }

    const connection = await db.getConnection();
    try {
      logger.info('Affiliation close transaction started', { affiliationId });
      await connection.beginTransaction();
      logger.debug('Affiliation close update parameters', {
        affiliationId,
        params: [endDate, daysWorked, withdrawalReason, withdrawalObservations ? '[provided]' : null, affiliationId],
      });
      const [updateResult]: any = await connection.query(`
        UPDATE affiliations SET
          end_date = ?,
          status = 'Inactivo',
          days_worked = ?,
          withdrawal_reason = ?,
          withdrawal_observations = ?
        WHERE id = ?
      `, [endDate, daysWorked, withdrawalReason, withdrawalObservations || null, affiliationId]);
      logger.info('Affiliation close update completed', {
        affiliationId,
        affectedRows: updateResult.affectedRows,
        daysWorked,
      });

      logger.debug('Affiliation close history parameters', {
        affiliationId,
        clientEmployerId: existing[0].client_employer_id,
        params: [existing[0].client_employer_id, endDate, withdrawalReason, withdrawalObservations ? '[provided]' : null, createdBy],
      });
      const [historyResult]: any = await connection.query(
        `INSERT INTO client_employer_status_history
          (client_employer_id, status, effective_date, reason, observations, created_by)
         VALUES (?, 'Retirado', ?, ?, ?, ?)`,
        [existing[0].client_employer_id, endDate, withdrawalReason, withdrawalObservations || null, createdBy]
      );
      logger.info('Affiliation close history insert completed', {
        affiliationId,
        historyId: historyResult.insertId,
        clientEmployerId: existing[0].client_employer_id,
      });
      await connection.commit();
      logger.info('Affiliation close transaction committed', { affiliationId });
    } catch (error) {
      const dbError = error as any;
      logger.error('Affiliation close transaction failed; rolling back', {
        affiliationId,
        error: {
          message: dbError.message,
          code: dbError.code,
          errno: dbError.errno,
          sqlState: dbError.sqlState,
          sqlMessage: dbError.sqlMessage,
        },
      });
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
