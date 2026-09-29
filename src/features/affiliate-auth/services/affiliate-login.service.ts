import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../../config/database.js';
import { env } from '../../../config/env.js';
import type { AffiliateAuthUser, AffiliateLoginResponse } from '../types/affiliate-auth.types.js';

const buildAffiliateUser = (row: any): AffiliateAuthUser => ({
  account_id: Number(row.account_id),
  client_id: Number(row.client_id),
  name: row.client_name,
  email: row.email,
  role: 'affiliate',
  agency_id: Number(row.agency_id),
  office_name: row.office_name,
  identification: row.identification,
  must_change_password: Boolean(row.must_change_password),
});

export class AffiliateLoginService {
  async execute(email: string, password: string): Promise<AffiliateLoginResponse | null> {
    const [rows]: any = await pool.query(
      `SELECT
         aa.id AS account_id,
         aa.client_id,
         aa.email,
         aa.password_hash,
          aa.status,
          aa.agency_id,
          aa.must_change_password,
         c.identification,
         CONCAT_WS(' ', c.first_name, c.second_name, c.first_lastname, c.second_lastname) AS client_name,
         o.name AS office_name
       FROM affiliate_accounts aa
       INNER JOIN clients c ON c.id = aa.client_id
       INNER JOIN offices o ON o.id = aa.office_id
       WHERE aa.email = ?
       LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return null;
    }

    const account = rows[0];

    if (account.status !== 'active') {
      throw Object.assign(new Error('Tu cuenta de afiliado no se encuentra activa. Contacta a soporte.'), { status: 403 });
    }

    const isPasswordValid = await bcryptjs.compare(password, account.password_hash);

    if (!isPasswordValid) {
      return null;
    }

    await pool.query(
      'UPDATE affiliate_accounts SET last_login_at = CURRENT_TIMESTAMP(6) WHERE id = ?',
      [account.account_id]
    );

    const user = buildAffiliateUser(account);
    const token = jwt.sign(
      {
        account_id: user.account_id,
        client_id: user.client_id,
        agency_id: user.agency_id,
        email: user.email,
        name: user.name,
        role: 'affiliate',
        scope: 'affiliate',
      },
      env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return { token, user };
  }

  async getProfile(accountId: number): Promise<AffiliateAuthUser | null> {
    const [rows]: any = await pool.query(
      `SELECT
         aa.id AS account_id,
         aa.client_id,
         aa.email,
         aa.agency_id,
         aa.must_change_password,
         c.identification,
         CONCAT_WS(' ', c.first_name, c.second_name, c.first_lastname, c.second_lastname) AS client_name,
         o.name AS office_name
       FROM affiliate_accounts aa
       INNER JOIN clients c ON c.id = aa.client_id
       INNER JOIN offices o ON o.id = aa.office_id
       WHERE aa.id = ? AND aa.status = 'active'
       LIMIT 1`,
      [accountId]
    );

    if (!rows.length) {
      return null;
    }

    return buildAffiliateUser(rows[0]);
  }
}
