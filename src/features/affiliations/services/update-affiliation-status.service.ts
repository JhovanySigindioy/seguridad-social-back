import db from '../../../config/database.js';
import type { PaymentStatus } from '../types/affiliation.types.js';

const ALLOWED_STATUSES_BY_ROLE: Record<string, PaymentStatus[]> = {
  admin: ['Pendiente', 'En Proceso', 'Pagado'],
  office_manager: ['Pendiente', 'En Proceso'],
};

interface UpdateAffiliationStatusDTO {
  affiliationId: number;
  paymentStatus: PaymentStatus;
  month: number;
  year: number;
  agencyId: number;
  role: string;
}

export class UpdateAffiliationStatusService {
  async execute({
    affiliationId,
    paymentStatus,
    month,
    year,
    agencyId,
    role,
  }: UpdateAffiliationStatusDTO) {
    const allowedStatuses = ALLOWED_STATUSES_BY_ROLE[role] ?? [];

    if (!allowedStatuses.includes(paymentStatus)) {
      throw Object.assign(new Error('No tienes permiso para asignar este estado'), { status: 403 });
    }

    // 1. Check if the receipt exists
    let [rows] = await db.query<any[]>(
      `SELECT mp.id, mp.payment_status, mp.gov_record_at
       FROM monthly_payments mp
       INNER JOIN affiliations a ON a.id = mp.affiliation_id
       INNER JOIN client_employers ce ON ce.id = a.client_employer_id
       INNER JOIN companies co ON co.id = ce.company_id
       WHERE mp.affiliation_id = ? AND mp.month = ? AND mp.year = ? AND co.agency_id = ?
       LIMIT 1`,
      [affiliationId, month, year, agencyId]
    );

    let currentStatus: PaymentStatus = 'Pendiente';
    let govRecordAt: any = null;

    if (!rows.length) {
      // 2. LAZY GENERATION: If the receipt doesn't exist, create it.
      // We need a value. Let's get the latest one from any month for this affiliation.
      const [latestPaymentRows]: any = await db.query(
        `SELECT value, payment_method FROM monthly_payments 
         WHERE affiliation_id = ? 
         ORDER BY id DESC LIMIT 1`,
        [affiliationId]
      );

      const defaultValue = latestPaymentRows.length > 0 ? latestPaymentRows[0].value : 0;
      const defaultMethod = latestPaymentRows.length > 0 ? latestPaymentRows[0].payment_method : 'Efectivo';

      // Use agency_id from params if needed, or fallback to 1
      await db.query(
        `INSERT INTO monthly_payments (affiliation_id, month, year, value, payment_status, payment_method, created_by)
         VALUES (?, ?, ?, ?, 'Pendiente', ?, 1)`, 
        [affiliationId, month, year, defaultValue, defaultMethod]
      );
      
      currentStatus = 'Pendiente';
    } else {
      currentStatus = rows[0].payment_status as PaymentStatus;
      govRecordAt = rows[0].gov_record_at;
    }

    if (role === 'office_manager' && currentStatus === 'Pagado') {
      throw Object.assign(new Error('No puedes modificar una afiliacion pagada'), { status: 403 });
    }

    if (currentStatus === paymentStatus) {
      return {
        id: affiliationId,
        payment_status: paymentStatus,
        gov_record_at: govRecordAt,
      };
    }

    await db.query(
      `UPDATE monthly_payments
       SET payment_status = ?,
           gov_record_at = CASE
             WHEN ? = 'Pagado' THEN CURRENT_TIMESTAMP(6)
             ELSE NULL
           END
       WHERE affiliation_id = ? AND month = ? AND year = ?`,
      [paymentStatus, paymentStatus, affiliationId, month, year]
    );

    const [updatedRows] = await db.query<any[]>(
      'SELECT gov_record_at FROM monthly_payments WHERE affiliation_id = ? AND month = ? AND year = ? LIMIT 1',
      [affiliationId, month, year]
    );

    return {
      id: affiliationId,
      payment_status: paymentStatus,
      gov_record_at: updatedRows[0]?.gov_record_at ?? null,
    };
  }
}
