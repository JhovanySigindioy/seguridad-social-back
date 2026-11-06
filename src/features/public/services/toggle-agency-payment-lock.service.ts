import db from '../../../config/database.js';

interface ToggleAgencyPaymentLockDTO {
  agencyId: number;
  blocked: boolean;
}

export class ToggleAgencyPaymentLockService {
  async execute({ agencyId, blocked }: ToggleAgencyPaymentLockDTO) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [existing]: any = await connection.query(
        'SELECT id, name FROM agencies WHERE id = ? LIMIT 1 FOR UPDATE',
        [agencyId]
      );

      if (!existing.length) {
        throw Object.assign(new Error('Agencia no encontrada'), { status: 404 });
      }

      await connection.query(
        'UPDATE agencies SET is_blocked_for_payment = ? WHERE id = ?',
        [blocked ? 1 : 0, agencyId]
      );

      if (blocked) {
        await connection.query(
          `UPDATE dashboard_sessions s
           JOIN users u ON u.id = s.user_id
           SET s.active_slot = NULL,
               s.revoked_at = COALESCE(s.revoked_at, CURRENT_TIMESTAMP(6)),
               s.revoke_reason = COALESCE(s.revoke_reason, 'agency_payment_blocked')
           WHERE u.agency_id = ? AND s.active_slot = 1`,
          [agencyId]
        );
      }

      await connection.commit();

      return {
        id: existing[0].id,
        name: existing[0].name,
        is_blocked_for_payment: blocked,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
