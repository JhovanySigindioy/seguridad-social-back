import bcryptjs from 'bcryptjs';
import db from '../../../config/database.js';

interface ChangeAffiliatePasswordInput {
  accountId: number;
  currentPassword: string;
  newPassword: string;
}

export class ChangeAffiliatePasswordService {
  async execute({ accountId, currentPassword, newPassword }: ChangeAffiliatePasswordInput) {
    const [rows]: any = await db.query(
      'SELECT password_hash FROM affiliate_accounts WHERE id = ? AND status = \'active\' LIMIT 1',
      [accountId]
    );

    if (!rows.length || !(await bcryptjs.compare(currentPassword, rows[0].password_hash))) {
      throw Object.assign(new Error('La contraseña actual no es correcta.'), { status: 400 });
    }

    if (currentPassword === newPassword) {
      throw Object.assign(new Error('La nueva contraseña debe ser diferente a la actual.'), { status: 400 });
    }

    const passwordHash = await bcryptjs.hash(newPassword, 12);
    await db.query(
      `UPDATE affiliate_accounts
       SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [passwordHash, accountId]
    );

    return { changed: true };
  }
}
