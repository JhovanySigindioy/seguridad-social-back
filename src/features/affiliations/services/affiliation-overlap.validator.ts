import db from '../../../config/database.js';
import type { AffiliationPeriod } from '../types/affiliation.types.js';

interface ValidationResult {
  valid: boolean;
  error?: string;
  conflictingPeriod?: AffiliationPeriod;
}

interface CreateAffiliationInput {
  client_employer_id: number;
  start_date: string;
  end_date?: string | null;
  month: number;
  year: number;
}

export class AffiliationOverlapValidator {
  private agencyId: number;

  constructor(agencyId: number) {
    this.agencyId = agencyId;
  }

  async validate(input: CreateAffiliationInput): Promise<ValidationResult> {
    const { client_employer_id, start_date, end_date } = input;

    const parsedStartDate = new Date(start_date);
    const parsedEndDate = end_date ? new Date(end_date) : null;

    if (parsedEndDate && parsedEndDate <= parsedStartDate) {
      return {
        valid: false,
        error: 'La fecha de inicio debe ser anterior a la fecha de fin.',
      };
    }



    const lastAffiliation = await this.getLastAffiliation(client_employer_id);

    if (lastAffiliation) {
      if (lastAffiliation.status === 'Activo') {
        const lastEndDate = lastAffiliation.end_date ? new Date(lastAffiliation.end_date) : null;

        if (!lastEndDate) {
          return {
            valid: false,
            error: 'El trabajador ya tiene una afiliación activa sin fecha de retiro. Cierra la afiliación actual antes de crear una nueva.',
          };
        }

        const oneDayAfterLastEnd = new Date(lastEndDate);
        oneDayAfterLastEnd.setDate(oneDayAfterLastEnd.getDate() + 1);

        if (parsedStartDate <= lastEndDate) {
          return {
            valid: false,
            error: `No puedes crear una nueva afiliación que inicie el ${start_date}. La afiliación anterior terminó el ${lastAffiliation.end_date}. La nueva fecha de inicio debe ser al menos un día después.`,
            conflictingPeriod: lastAffiliation,
          };
        }
      }

      if (parsedEndDate && parsedEndDate.getFullYear() === new Date(lastAffiliation.start_date).getFullYear() &&
          parsedEndDate.getMonth() === new Date(lastAffiliation.start_date).getMonth()) {
        return {
          valid: false,
          error: 'No puedes registrar una afiliación que termine en un mes diferente al de inicio.',
          conflictingPeriod: lastAffiliation,
        };
      }
    }

    return { valid: true };
  }

  async getOverlappingPeriods(client_employer_id: number, start_date: string, end_date?: string | null): Promise<AffiliationPeriod[]> {
    let query = `
      SELECT 
        id,
        start_date,
        end_date,
        status
      FROM affiliations
      WHERE client_employer_id = ?
        AND status = 'Activo'
    `;
    const params: any[] = [client_employer_id];

    if (end_date) {
      query += `
        AND (
          (start_date <= ? AND (end_date IS NULL OR end_date >= ?))
          OR (start_date <= ? AND (end_date IS NULL OR end_date >= ?))
          OR (start_date >= ? AND start_date <= COALESCE(?, '2099-12-31'))
        )
      `;
      params.push(end_date, end_date, end_date, end_date, start_date, end_date);
    } else {
      query += ` AND start_date <= ? `;
      params.push(start_date);
    }

    const [rows]: any = await db.query(query, params);
    return rows;
  }

  private async getLastAffiliation(client_employer_id: number): Promise<AffiliationPeriod | null> {
    const [rows]: any = await db.query(`
      SELECT 
        id,
        start_date,
        end_date,
        status
      FROM affiliations
      WHERE client_employer_id = ?
      ORDER BY start_date DESC
      LIMIT 1
    `, [client_employer_id]);

    return rows.length > 0 ? rows[0] : null;
  }

  calculateDaysWorked(start_date: string, end_date?: string | null): number {
    const start = new Date(start_date);
    const end = end_date ? new Date(end_date) : new Date();

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return diffDays;
  }

  getPeriodDescription(start_date: string, end_date?: string | null): string {
    const start = new Date(start_date);
    const end = end_date ? new Date(end_date) : new Date();

    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const startStr = start.toLocaleDateString('es-CO', options);
    const endStr = end.toLocaleDateString('es-CO', options);

    return end_date
      ? `del ${startStr} al ${endStr}`
      : `del ${startStr} en adelante`;
  }
}

export const validateNewAffiliation = async (
  input: CreateAffiliationInput,
  agencyId: number
): Promise<ValidationResult> => {
  const validator = new AffiliationOverlapValidator(agencyId);
  return validator.validate(input);
};
