import { randomBytes } from 'crypto';
import bcryptjs from 'bcryptjs';
import db from '../../../config/database.js';
import type { CreateAffiliateAccountInput } from '../types/affiliate-account.types.js';
import { PortalServiceService } from '../../portal-service/services/portal-service.service.js';

const normalizeEmail = (email?: string) => email?.trim().toLowerCase() || '';

const buildFallbackEmail = (identification: string, clientId: number) => {
  const safeIdentification = identification.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `afiliado.${safeIdentification || clientId}@portal.local`;
};

export class CreateAffiliateAccountService {
  async execute({ agencyId, userId, role, clientId, email }: CreateAffiliateAccountInput) {
    if (!['admin', 'office_manager'].includes(role)) {
      throw Object.assign(new Error('Solo administradores y gestores de oficina pueden crear accesos.'), { status: 403 });
    }

    await new PortalServiceService().assertEnabled(agencyId);

    const officeScope = role === 'admin' ? { sql: '', params: [] as number[] } : {
      sql: ' AND c.office_id IN (SELECT office_id FROM user_offices WHERE user_id = ?)',
      params: [userId],
    };

    const [clientRows]: any = await db.query(
      `SELECT c.id, c.identification, c.first_name, c.second_name, c.first_lastname, c.second_lastname,
              c.email AS client_email, c.office_id, o.name AS office_name
       FROM clients c
       INNER JOIN offices o ON o.id = c.office_id
       WHERE c.id = ? AND o.agency_id = ?${officeScope.sql}
       LIMIT 1`,
      [clientId, agencyId, ...officeScope.params]
    );

    if (!clientRows.length) {
      throw Object.assign(new Error('Cliente no encontrado o fuera del alcance del usuario.'), { status: 404 });
    }

    const client = clientRows[0];
    const [existingRows]: any = await db.query(
      'SELECT id FROM affiliate_accounts WHERE client_id = ? LIMIT 1',
      [clientId]
    );
    if (existingRows.length) {
      throw Object.assign(new Error('El cliente ya tiene una cuenta de portal.'), { status: 409 });
    }

    const accountEmail = normalizeEmail(email) || normalizeEmail(client.client_email) || buildFallbackEmail(client.identification, clientId);
    const [emailRows]: any = await db.query(
      'SELECT id FROM affiliate_accounts WHERE email = ? LIMIT 1',
      [accountEmail]
    );
    if (emailRows.length) {
      throw Object.assign(new Error('El correo ya está asociado a otra cuenta de portal.'), { status: 409 });
    }

    const temporaryPassword = `Portal-${randomBytes(9).toString('base64url')}`;
    const passwordHash = await bcryptjs.hash(temporaryPassword, 12);
    const [result]: any = await db.query(
      `INSERT INTO affiliate_accounts
        (agency_id, client_id, office_id, email, password_hash, status, must_change_password, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, 'active', 1, ?)`,
      [agencyId, clientId, client.office_id, accountEmail, passwordHash, userId]
    );

    return {
      account_id: Number(result.insertId),
      client_id: Number(clientId),
      client_name: [client.first_name, client.second_name, client.first_lastname, client.second_lastname].filter(Boolean).join(' '),
      office_id: Number(client.office_id),
      office_name: client.office_name,
      email: accountEmail,
      temporary_password: temporaryPassword,
    };
  }
}
