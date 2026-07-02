import db from '../../../config/database.js';

interface ToggleAgencyPaymentLockDTO {
  agencyId: number;
  blocked: boolean;
}

export class ToggleAgencyPaymentLockService {
  async execute({ agencyId, blocked }: ToggleAgencyPaymentLockDTO) {
    const [existing]: any = await db.query(
      'SELECT id, name FROM agencies WHERE id = ? LIMIT 1',
      [agencyId]
    );

    if (!existing.length) {
      throw Object.assign(new Error('Agencia no encontrada'), { status: 404 });
    }

    await db.query(
      'UPDATE agencies SET is_blocked_for_payment = ? WHERE id = ?',
      [blocked ? 1 : 0, agencyId]
    );

    return {
      id: existing[0].id,
      name: existing[0].name,
      is_blocked_for_payment: blocked,
    };
  }
}
