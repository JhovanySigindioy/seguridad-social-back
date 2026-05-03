import db from '../../../config/database.js';
import type { Client } from '../types/client.types.js';

export class GetClientsService {
  async execute(agencyId: number, officeId?: number) {
    let query = `
      SELECT 
        c.id,
        c.document_type_id,
        dt.name AS document_type_name,
        c.identification,
        c.first_name,
        c.second_name,
        c.first_lastname,
        c.second_lastname,
        c.email,
        c.office_id,
        o.name AS office_name,
        c.created_at
      FROM clients c
      INNER JOIN document_types dt ON dt.id = c.document_type_id
      INNER JOIN offices o ON o.id = c.office_id
      WHERE o.agency_id = ?
    `;

    const params: any[] = [agencyId];

    if (officeId) {
      query += ' AND c.office_id = ?';
      params.push(officeId);
    }

    query += ' ORDER BY c.first_name ASC, c.first_lastname ASC';

    const [rows]: any = await db.query(query, params);

    return rows.map((row: any) => ({
      id: row.id,
      document_type_id: row.document_type_id,
      document_type_name: row.document_type_name,
      identification: row.identification,
      first_name: row.first_name,
      second_name: row.second_name,
      first_lastname: row.first_lastname,
      second_lastname: row.second_lastname,
      full_name: `${row.first_name}${row.second_name ? ' ' + row.second_name : ''} ${row.first_lastname}${row.second_lastname ? ' ' + row.second_lastname : ''}`.trim(),
      email: row.email,
      office_id: row.office_id,
      office_name: row.office_name,
      created_at: row.created_at,
    }));
  }
}
