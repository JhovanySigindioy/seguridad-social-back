import db from '../../../config/database.js';
import type { CreateClientDTO, Client } from '../types/client.types.js';

export class CreateClientService {
  async execute(dto: CreateClientDTO): Promise<Client> {
    const [existing]: any = await db.query(
      `SELECT id FROM clients WHERE document_type_id = ? AND identification = ?`,
      [dto.document_type_id, dto.identification]
    );

    if (existing.length > 0) {
      throw Object.assign(new Error('Ya existe un cliente con esta identificación'), { status: 400 });
    }

    try {
      const [result]: any = await db.query(
        `INSERT INTO clients 
         (document_type_id, first_name, second_name, first_lastname, second_lastname, identification, email, office_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dto.document_type_id,
          dto.first_name,
          dto.second_name || null,
          dto.first_lastname,
          dto.second_lastname || null,
          dto.identification,
          dto.email || null,
          dto.office_id,
        ]
      );

      const clientId = result.insertId;

      const [rows]: any = await db.query(
        `SELECT 
          c.id, c.document_type_id, dt.name AS document_type_name,
          c.identification, c.first_name, c.second_name,
          c.first_lastname, c.second_lastname, c.email,
          c.office_id, o.name AS office_name, c.created_at
         FROM clients c
         INNER JOIN document_types dt ON dt.id = c.document_type_id
         INNER JOIN offices o ON o.id = c.office_id
         WHERE c.id = ?`,
        [clientId]
      );

      const row = rows[0];
      return {
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
      };
    } catch (error: any) {
      if (error.errno === 1062 && error.sqlMessage?.includes('uk_client_identification')) {
        throw Object.assign(new Error('Ya existe un cliente registrado con este número de identificación.'), { status: 409 });
      }
      throw error;
    }
  }
}
