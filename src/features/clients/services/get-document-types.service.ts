import db from '../../../config/database.js';

export class GetDocumentTypesService {
  async execute() {
    const [rows]: any = await db.query(
      'SELECT id, code, name FROM document_types ORDER BY name ASC'
    );
    return rows;
  }
}
