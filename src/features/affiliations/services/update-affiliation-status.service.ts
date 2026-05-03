import db from '../../../config/database.js';
import type { PaymentStatus } from '../types/affiliation.types.js';

const ALLOWED_STATUSES_BY_ROLE: Record<string, PaymentStatus[]> = {
  admin: ['Pendiente', 'En Proceso', 'Pagado'],
  office_manager: ['Pendiente', 'En Proceso'],
};

interface UpdateAffiliationStatusDTO {
  affiliationId: number;
  paymentStatus: PaymentStatus;
  agencyId: number;
  role: string;
}

export class UpdateAffiliationStatusService {
  async execute({
    affiliationId,
    paymentStatus,
    agencyId,
    role,
  }: UpdateAffiliationStatusDTO) {
    const allowedStatuses = ALLOWED_STATUSES_BY_ROLE[role] ?? [];

    if (!allowedStatuses.includes(paymentStatus)) {
      throw Object.assign(new Error('No tienes permiso para asignar este estado'), { status: 403 });
    }

    const [rows] = await db.query<any[]>(
      `SELECT ma.id, ma.payment_status, ma.gov_record_at
       FROM monthly_affiliations ma
       INNER JOIN client_employers ce ON ce.id = ma.client_employer_id
       INNER JOIN companies co ON co.id = ce.company_id
       WHERE ma.id = ? AND co.agency_id = ?
       LIMIT 1`,
      [affiliationId, agencyId]
    );

    if (!rows.length) {
      throw Object.assign(new Error('Afiliacion no encontrada'), { status: 404 });
    }

    const currentStatus = rows[0].payment_status as PaymentStatus;

    if (role === 'office_manager' && currentStatus === 'Pagado') {
      throw Object.assign(new Error('No puedes modificar una afiliacion pagada'), { status: 403 });
    }

    if (currentStatus === paymentStatus) {
      return {
        id: affiliationId,
        payment_status: paymentStatus,
        gov_record_at: rows[0].gov_record_at,
      };
    }

    await db.query(
      `UPDATE monthly_affiliations
       SET payment_status = ?,
           gov_record_at = CASE
             WHEN ? = 'Pagado' THEN CURRENT_TIMESTAMP(6)
             ELSE NULL
           END
       WHERE id = ?`,
      [paymentStatus, paymentStatus, affiliationId]
    );

    const [updatedRows] = await db.query<any[]>(
      'SELECT gov_record_at FROM monthly_affiliations WHERE id = ? LIMIT 1',
      [affiliationId]
    );

    return {
      id: affiliationId,
      payment_status: paymentStatus,
      gov_record_at: updatedRows[0]?.gov_record_at ?? null,
    };
  }
}
