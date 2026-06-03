import type { Request, Response } from 'express';
import pool from '../../../config/database.js';
import logger from '../../../shared/utils/logger.js';
import { GenerateInvoicePdfService } from '../services/generate-invoice-pdf.service.js';

/**
 * POST /affiliations/invoices/generate-all
 * Generates and saves PDF invoices for ALL affiliations that are
 * "En Proceso" or "Pagado" and don't yet have a PDF on disk.
 * This is a one-time migration endpoint.
 */
export const generateAllInvoicesController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!['admin'].includes(user?.role)) {
      return res.status(403).json({ error: 'Solo administradores pueden ejecutar esta acción.' });
    }

    const agencyId: number = user.agency_id;

    // Fetch all eligible affiliations for this agency
    const [rows]: any = await pool.query(
      `SELECT mp.affiliation_id, mp.month, mp.year, mp.payment_status
       FROM monthly_payments mp
         INNER JOIN affiliations a  ON a.id  = mp.affiliation_id
         INNER JOIN client_employers ce ON ce.id = a.client_employer_id
         INNER JOIN companies co ON co.id = ce.company_id
       WHERE co.agency_id = ?
         AND mp.payment_status IN ('En Proceso', 'Pagado')
       ORDER BY mp.year DESC, mp.month DESC`,
      [agencyId]
    );

    logger.info('generate-all-invoices: found eligible rows', { count: rows.length, agencyId });

    const service = new GenerateInvoicePdfService();
    let generated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: { affiliationId: number; month: number; year: number; error: string }[] = [];

    for (const row of rows) {
      try {
        const existed = await service.executeWithCheck(row.affiliation_id, row.month, row.year, agencyId);
        if (existed) {
          skipped++;
        } else {
          generated++;
        }
      } catch (err: any) {
        failed++;
        errors.push({
          affiliationId: row.affiliation_id,
          month: row.month,
          year: row.year,
          error: err.message,
        });
        logger.warn('generate-all-invoices: failed for row', {
          affiliationId: row.affiliation_id, month: row.month, year: row.year,
          error: err.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      summary: {
        total: rows.length,
        generated,
        skipped,
        failed,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    logger.error('generate-all-invoices: unexpected error', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
};
