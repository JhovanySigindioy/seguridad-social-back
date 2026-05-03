import db from '../../../config/database.js';
import type { UpdateClientDTO } from '../types/client.types.js';

export class UpdateClientService {
  async execute(clientId: number, dto: UpdateClientDTO) {
    const [existing]: any = await db.query(
      `SELECT id FROM clients WHERE document_type_id = ? AND identification = ? AND id != ?`,
      [dto.document_type_id, dto.identification, clientId]
    );

    if (existing.length > 0) {
      throw Object.assign(new Error('Ya existe otro cliente con esta identificación'), { status: 400 });
    }

    await db.query(
      `UPDATE clients SET 
        document_type_id = ?, first_name = ?, second_name = ?, 
        first_lastname = ?, second_lastname = ?, identification = ?, email = ?
       WHERE id = ?`,
      [
        dto.document_type_id,
        dto.first_name,
        dto.second_name || null,
        dto.first_lastname,
        dto.second_lastname || null,
        dto.identification,
        dto.email || null,
        clientId,
      ]
    );

    return {
      id: clientId,
      ...dto,
      full_name: `${dto.first_name}${dto.second_name ? ' ' + dto.second_name : ''} ${dto.first_lastname}${dto.second_lastname ? ' ' + dto.second_lastname : ''}`.trim(),
    };
  }
}
