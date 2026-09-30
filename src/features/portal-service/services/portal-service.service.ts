import db from '../../../config/database.js';

export const PORTAL_MONTHLY_PRICE = 6000;
export const PORTAL_TERMS_VERSION = 'portal-v1';

export class PortalServiceService {
  async getStatus(agencyId: number) {
    const [rows]: any = await db.query(
      `SELECT ps.status, ps.monthly_price, ps.accepted_at, ps.terms_version,
              u.name AS accepted_by_name, u.email AS accepted_by_email
       FROM agency_portal_services ps
       LEFT JOIN users u ON u.id = ps.accepted_by_user_id
       WHERE ps.agency_id = ?
       LIMIT 1`,
      [agencyId]
    );

    const row = rows[0];
    return {
      status: row?.status || 'pending',
      enabled: row?.status === 'active',
      monthly_price: Number(row?.monthly_price || PORTAL_MONTHLY_PRICE),
      accepted_at: row?.accepted_at || null,
      accepted_by_name: row?.accepted_by_name || null,
      accepted_by_email: row?.accepted_by_email || null,
      terms_version: row?.terms_version || PORTAL_TERMS_VERSION,
    };
  }

  async assertEnabled(agencyId: number) {
    const status = await this.getStatus(agencyId);
    if (!status.enabled) {
      throw Object.assign(new Error('El portal de afiliados no ha sido activado por el administrador de la agencia.'), {
        status: 403,
        code: 'PORTAL_SERVICE_NOT_AUTHORIZED',
      });
    }
    return status;
  }

  async activate(agencyId: number, userId: number) {
    const [userRows]: any = await db.query(
      'SELECT id, name, email, role FROM users WHERE id = ? AND agency_id = ? LIMIT 1',
      [userId, agencyId]
    );

    if (!userRows.length || userRows[0].role !== 'admin') {
      throw Object.assign(new Error('Solo el administrador de la agencia puede activar el portal.'), { status: 403 });
    }

    await db.query(
      `INSERT INTO agency_portal_services
         (agency_id, status, monthly_price, accepted_by_user_id, accepted_at, terms_version)
       VALUES (?, 'active', ?, ?, CURRENT_TIMESTAMP(6), ?)
       ON DUPLICATE KEY UPDATE
         status = 'active',
         monthly_price = VALUES(monthly_price),
         accepted_by_user_id = VALUES(accepted_by_user_id),
         accepted_at = VALUES(accepted_at),
         terms_version = VALUES(terms_version),
         updated_at = CURRENT_TIMESTAMP(6)`,
      [agencyId, PORTAL_MONTHLY_PRICE, userId, PORTAL_TERMS_VERSION]
    );

    return this.getStatus(agencyId);
  }
}
