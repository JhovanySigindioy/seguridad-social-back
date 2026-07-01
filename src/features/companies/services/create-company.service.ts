import db from '../../../config/database.js';

interface CreateCompanyDTO {
  agencyId: number;
  name: string;
  nit: string;
  email: string | null;
}

export class CreateCompanyService {
  async execute({ agencyId, name, nit, email }: CreateCompanyDTO) {
    const normalizedName = name.trim();
    const normalizedNit = nit.trim();
    const normalizedEmail = email?.trim() || null;

    const [existingByNit]: any = await db.query(
      'SELECT id FROM companies WHERE agency_id = ? AND nit = ? LIMIT 1',
      [agencyId, normalizedNit]
    );

    if (existingByNit.length > 0) {
      throw Object.assign(new Error('Ya existe una empresa con ese NIT en tu agencia.'), { status: 409 });
    }

    const [existingByName]: any = await db.query(
      'SELECT id FROM companies WHERE agency_id = ? AND name = ? LIMIT 1',
      [agencyId, normalizedName]
    );

    if (existingByName.length > 0) {
      throw Object.assign(new Error('Ya existe una empresa con ese nombre en tu agencia.'), { status: 409 });
    }

    const [result]: any = await db.query(
      'INSERT INTO companies (agency_id, name, nit, email, is_active) VALUES (?, ?, ?, ?, 1)',
      [agencyId, normalizedName, normalizedNit, normalizedEmail]
    );

    const [rows]: any = await db.query(
      'SELECT id, agency_id, name, nit, email, is_active FROM companies WHERE id = ?',
      [result.insertId]
    );

    return rows[0];
  }
}
