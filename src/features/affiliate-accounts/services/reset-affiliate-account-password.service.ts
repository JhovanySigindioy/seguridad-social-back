import { randomBytes } from 'crypto';
import bcryptjs from 'bcryptjs';
import db from '../../../config/database.js';

interface ResetAffiliateAccountPasswordInput {
  agencyId: number;
  userId: number;
  role: string;
  accountId: number;
}

export class ResetAffiliateAccountPasswordService {
  async execute({ agencyId, userId, role, accountId }: ResetAffiliateAccountPasswordInput) {
    if (!['admin', 'office_manager'].includes(role)) {
      throw Object.assign(new Error('No tienes permiso para regenerar contraseñas.'), { status: 403 });
    }

    const officeScope = role === 'admin' ? { sql: '', params: [] as number[] } : {
      sql: ' AND c.office_id IN (SELECT office_id FROM user_offices WHERE user_id = ?)',
      params: [userId],
    };
    const [rows]: any = await db.query(
      `SELECT aa.id, aa.email, aa.client_id, aa.status,
              CONCAT_WS(' ', c.first_name, c.second_name, c.first_lastname, c.second_lastname) AS client_name
       FROM affiliate_accounts aa
       INNER JOIN clients c ON c.id = aa.client_id
       INNER JOIN offices o ON o.id = c.office_id
       WHERE aa.id = ? AND aa.agency_id = ? AND o.agency_id = ?${officeScope.sql}
       LIMIT 1`,
      [accountId, agencyId, agencyId, ...officeScope.params]
    );

    if (!rows.length) {
      throw Object.assign(new Error('Cuenta no encontrada o fuera del alcance del usuario.'), { status: 404 });
    }
    if (rows[0].status !== 'active') {
      throw Object.assign(new Error('Solo se puede regenerar la contraseña de una cuenta activa.'), { status: 409 });
    }

    const temporaryPassword = `Portal-${randomBytes(9).toString('base64url')}`;
    const passwordHash = await bcryptjs.hash(temporaryPassword, 12);
    await db.query(
      `UPDATE affiliate_accounts
       SET password_hash = ?, must_change_password = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [passwordHash, accountId]
    );

    return {
      account_id: Number(accountId),
      client_id: Number(rows[0].client_id),
      client_name: rows[0].client_name,
      email: rows[0].email,
      temporary_password: temporaryPassword,
    };
  }
}
