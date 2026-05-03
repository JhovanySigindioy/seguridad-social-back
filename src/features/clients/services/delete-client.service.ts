import db from '../../../config/database.js';

export class DeleteClientService {
  async execute(clientId: number) {
    await db.query(
      `UPDATE client_employers SET is_active = 0, end_date = CURDATE() WHERE client_id = ?`,
      [clientId]
    );

    return { id: clientId, is_active: false };
  }
}
