import db from '../../../config/database.js';

interface CreateOfficeDTO {
  agencyId: number;
  name: string;
  address: string | null;
  logo_url: string | null;
}

export class CreateOfficeService {
  async execute({ agencyId, name, address, logo_url }: CreateOfficeDTO) {
    const normalizedName = name.trim();
    const normalizedAddress = address?.trim() || null;
    const normalizedLogoUrl = logo_url?.trim() || null;

    const [existingByName]: any = await db.query(
      'SELECT id FROM offices WHERE agency_id = ? AND name = ? LIMIT 1',
      [agencyId, normalizedName]
    );

    if (existingByName.length > 0) {
      throw Object.assign(new Error('Ya existe una sede con ese nombre en tu agencia.'), { status: 409 });
    }

    const [result]: any = await db.query(
      'INSERT INTO offices (agency_id, name, address, logo_url, is_active) VALUES (?, ?, ?, ?, 1)',
      [agencyId, normalizedName, normalizedAddress, normalizedLogoUrl]
    );

    const [rows]: any = await db.query(
      'SELECT id, agency_id, name, address, logo_url, is_active FROM offices WHERE id = ?',
      [result.insertId]
    );

    return rows[0];
  }
}
