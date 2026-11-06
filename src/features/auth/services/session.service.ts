import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import pool from '../../../config/database.js';
import { env } from '../../../config/env.js';

export const DASHBOARD_ROLES = ['admin', 'office_manager', 'viewer'] as const;
export type DashboardRole = (typeof DASHBOARD_ROLES)[number];

export interface DashboardSessionUser {
  id: number;
  name: string;
  email: string;
  role: DashboardRole;
  agency_id: number;
  agency_logo_url?: string | null;
}

export interface DashboardSessionData {
  sessionId: string;
  user: DashboardSessionUser;
  tabId: string;
  expiresAt: Date;
}

export class SessionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: 'SESSION_ALREADY_ACTIVE' | 'SESSION_INVALID' | 'SESSION_EXPIRED' | 'SESSION_REVOKED' | 'SESSION_TAB_CONFLICT'
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const isDashboardRole = (role: string): role is DashboardRole =>
  DASHBOARD_ROLES.includes(role as DashboardRole);

const getExpiryDates = () => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.SESSION_ABSOLUTE_HOURS * 60 * 60 * 1000);
  const inactiveAt = new Date(now.getTime() - env.SESSION_IDLE_MINUTES * 60 * 1000);
  return { now, expiresAt, inactiveAt };
};

const releaseExpiredSession = async (connection: PoolConnection, userId: number, now: Date, inactiveAt: Date) => {
  await connection.query(
    `UPDATE dashboard_sessions
     SET active_slot = NULL,
         revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP(6)),
         revoke_reason = COALESCE(revoke_reason, 'expired')
     WHERE user_id = ?
       AND active_slot = 1
       AND (expires_at <= ? OR last_seen_at <= ?)`,
    [userId, now, inactiveAt]
  );
};

export class DashboardSessionService {
  async create(userId: number, tabId: string): Promise<{ token: string; session: DashboardSessionData }> {
    const connection = await pool.getConnection();
    const { now, expiresAt, inactiveAt } = getExpiryDates();

    try {
      await connection.beginTransaction();

      const [userRows]: any = await connection.query(
        `SELECT u.id, u.name, u.email, u.role, u.agency_id, a.logo_url AS agency_logo_url
         FROM users u
         JOIN agencies a ON a.id = u.agency_id
         WHERE u.id = ? AND u.is_active = 1
         FOR UPDATE`,
        [userId]
      );

      if (!userRows.length || !isDashboardRole(userRows[0].role)) {
        throw new SessionError('Usuario no autorizado para el dashboard.', 403, 'SESSION_INVALID');
      }

      await releaseExpiredSession(connection, userId, now, inactiveAt);

      const [activeRows]: any = await connection.query(
        `SELECT id
         FROM dashboard_sessions
         WHERE user_id = ? AND active_slot = 1
         LIMIT 1`,
        [userId]
      );

      if (activeRows.length) {
        throw new SessionError(
          'Este usuario ya tiene una sesión activa en otro equipo o pestaña.',
          409,
          'SESSION_ALREADY_ACTIVE'
        );
      }

      const sessionId = randomUUID();
      const token = randomBytes(48).toString('base64url');
      const tokenHash = hashToken(token);
      const row = userRows[0];

      await connection.query(
        `INSERT INTO dashboard_sessions
          (id, user_id, token_hash, tab_id, created_at, last_seen_at, expires_at, active_slot)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [sessionId, userId, tokenHash, tabId, now, now, expiresAt]
      );

      await connection.commit();

      return {
        token,
        session: {
          sessionId,
          user: {
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            agency_id: row.agency_id,
            agency_logo_url: row.agency_logo_url,
          },
          tabId,
          expiresAt,
        },
      };
    } catch (error: any) {
      await connection.rollback();

      if (error?.errno === 1062) {
        throw new SessionError(
          'Este usuario ya tiene una sesión activa en otro equipo o pestaña.',
          409,
          'SESSION_ALREADY_ACTIVE'
        );
      }

      throw error;
    } finally {
      connection.release();
    }
  }

  async validate(token: string, tabId: string): Promise<DashboardSessionData> {
    const tokenHash = hashToken(token);
    const { now, inactiveAt } = getExpiryDates();
    const [rows]: any = await pool.query(
      `SELECT
         s.id AS session_id,
         s.tab_id,
         s.expires_at,
         s.revoked_at,
         s.active_slot,
         s.last_seen_at,
         u.id,
         u.name,
         u.email,
         u.role,
         u.agency_id,
         a.logo_url AS agency_logo_url
       FROM dashboard_sessions s
       JOIN users u ON u.id = s.user_id
       JOIN agencies a ON a.id = u.agency_id
       WHERE s.token_hash = ?
       LIMIT 1`,
      [tokenHash]
    );

    if (!rows.length) {
      throw new SessionError('Sesión inválida.', 401, 'SESSION_INVALID');
    }

    const row = rows[0];
    if (row.revoked_at || row.active_slot !== 1) {
      throw new SessionError('La sesión fue revocada.', 401, 'SESSION_REVOKED');
    }

    if (new Date(row.expires_at) <= now || new Date(row.last_seen_at) <= inactiveAt) {
      await this.revokeByHash(tokenHash, 'expired');
      throw new SessionError('La sesión ha expirado.', 401, 'SESSION_EXPIRED');
    }

    if (row.tab_id !== tabId) {
      throw new SessionError('La sesión pertenece a otra pestaña.', 401, 'SESSION_TAB_CONFLICT');
    }

    if (!isDashboardRole(row.role)) {
      throw new SessionError('Rol no autorizado para el dashboard.', 401, 'SESSION_INVALID');
    }

    if (now.getTime() - new Date(row.last_seen_at).getTime() >= 60_000) {
      await pool.query(
        `UPDATE dashboard_sessions
         SET last_seen_at = CURRENT_TIMESTAMP(6)
         WHERE id = ? AND active_slot = 1`,
        [row.session_id]
      );
    }

    return {
      sessionId: row.session_id,
      tabId: row.tab_id,
      expiresAt: new Date(row.expires_at),
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        agency_id: row.agency_id,
        agency_logo_url: row.agency_logo_url,
      },
    };
  }

  async revoke(token: string, reason = 'logout'): Promise<void> {
    await this.revokeByHash(hashToken(token), reason);
  }

  private async revokeByHash(tokenHash: string, reason: string): Promise<void> {
    await pool.query(
      `UPDATE dashboard_sessions
       SET active_slot = NULL,
           revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP(6)),
           revoke_reason = COALESCE(revoke_reason, ?)
       WHERE token_hash = ? AND active_slot = 1`,
      [reason, tokenHash]
    );
  }
}
