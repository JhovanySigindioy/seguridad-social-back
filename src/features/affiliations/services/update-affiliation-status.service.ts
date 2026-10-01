import db from '../../../config/database.js';
import logger from '../../../shared/utils/logger.js';
import type { PaymentDisplayStatus, PaymentStatus } from '../types/affiliation.types.js';
import { GenerateInvoicePdfService } from './generate-invoice-pdf.service.js';

const ALLOWED_STATUSES_BY_ROLE: Record<string, PaymentDisplayStatus[]> = {
  admin: ['Por Confirmar', 'Pendiente', 'En Proceso', 'Pagado'],
  office_manager: ['Por Confirmar', 'Pendiente', 'En Proceso'],
};

interface UpdateAffiliationStatusDTO {
  affiliationId: number;
  paymentStatus: PaymentDisplayStatus;
  month: number;
  year: number;
  agencyId: number;
  role: string;
  createdBy: number;
}

export class UpdateAffiliationStatusService {
  async execute({ affiliationId, paymentStatus, month, year, agencyId, role, createdBy }: UpdateAffiliationStatusDTO) {
    const allowedStatuses = ALLOWED_STATUSES_BY_ROLE[role] ?? [];
    if (!allowedStatuses.includes(paymentStatus)) {
      throw Object.assign(new Error('No tienes permiso para asignar este estado'), { status: 403 });
    }

    const [affiliationRows]: any = await db.query(
      `SELECT a.start_date, a.decision_status, a.proposed_value,
              MONTH(a.start_date) AS start_month, YEAR(a.start_date) AS start_year
       FROM affiliations a
       INNER JOIN client_employers ce ON ce.id = a.client_employer_id
       INNER JOIN companies co ON co.id = ce.company_id
       WHERE a.id = ? AND co.agency_id = ?
       LIMIT 1`,
      [affiliationId, agencyId]
    );

    if (!affiliationRows.length || Number(month) !== Number(affiliationRows[0].start_month) || Number(year) !== Number(affiliationRows[0].start_year)) {
      throw Object.assign(new Error('La afiliación mensual debe corresponder al periodo de la afiliación.'), { status: 409 });
    }

    const [paymentRows]: any = await db.query(
      `SELECT id, payment_status, gov_record_at
       FROM monthly_payments
       WHERE affiliation_id = ? AND month = ? AND year = ?
       LIMIT 1`,
      [affiliationId, month, year]
    );

    const currentStatus = paymentRows[0]?.payment_status as PaymentStatus | undefined;

    if (paymentStatus === 'Por Confirmar') {
      if (paymentRows.length) {
        throw Object.assign(new Error('No se puede volver a Por Confirmar después de crear el pago.'), { status: 409 });
      }
      if (affiliationRows[0].decision_status === 'No Continúa') {
        throw Object.assign(new Error('Una afiliación retirada no puede volver a Por Confirmar.'), { status: 409 });
      }
      await db.query(`UPDATE affiliations SET decision_status = 'Por Confirmar' WHERE id = ?`, [affiliationId]);
      return { id: affiliationId, payment_status: 'Por Confirmar', gov_record_at: null };
    }

    if (affiliationRows[0].decision_status === 'No Continúa') {
      throw Object.assign(new Error('Una afiliación marcada como No Continúa no puede recibir pagos.'), { status: 409 });
    }

    if (currentStatus === 'Pagado' && paymentStatus !== 'Pagado') {
      throw Object.assign(new Error('Un pago Pagado no puede retroceder a otro estado.'), { status: 409 });
    }
    let govRecordAt = paymentRows[0]?.gov_record_at ?? null;

    if (!paymentRows.length) {
      const [latestPaymentRows]: any = await db.query(
        `SELECT value, payment_method FROM monthly_payments
         WHERE affiliation_id = ? ORDER BY id DESC LIMIT 1`,
        [affiliationId]
      );
      const value = latestPaymentRows[0]?.value ?? affiliationRows[0].proposed_value ?? 0;
      const paymentMethod = latestPaymentRows[0]?.payment_method ?? 'Efectivo';

      await db.query(
        `INSERT INTO monthly_payments
          (affiliation_id, month, year, value, payment_status, payment_method, created_by, gov_record_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'Pagado' THEN CURRENT_TIMESTAMP(6) ELSE NULL END)`,
        [affiliationId, month, year, value, paymentStatus, paymentMethod, createdBy, paymentStatus]
      );
      await db.query(`UPDATE affiliations SET decision_status = 'Confirmada' WHERE id = ?`, [affiliationId]);
      govRecordAt = paymentStatus === 'Pagado' ? new Date() : null;
    } else if (currentStatus !== paymentStatus) {
      await db.query(
        `UPDATE monthly_payments
         SET payment_status = ?,
             gov_record_at = CASE
               WHEN ? = 'Pagado' THEN CURRENT_TIMESTAMP(6)
               ELSE NULL
             END
         WHERE id = ?`,
        [paymentStatus, paymentStatus, paymentRows[0].id]
      );
      const [updatedRows]: any = await db.query(
        `SELECT gov_record_at FROM monthly_payments WHERE id = ? LIMIT 1`,
        [paymentRows[0].id]
      );
      govRecordAt = updatedRows[0]?.gov_record_at ?? null;
    }

    if (['En Proceso', 'Pagado'].includes(paymentStatus)) {
      const pdfService = new GenerateInvoicePdfService();
      pdfService.generateAndSave(affiliationId, month, year, agencyId).catch((err: Error) => {
        logger.warn('Auto-generation of invoice PDF failed (non-blocking)', {
          affiliationId, month, year, error: err.message,
        });
      });
    }

    return { id: affiliationId, payment_status: paymentStatus, gov_record_at: govRecordAt };
  }
}
