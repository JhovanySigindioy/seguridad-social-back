import type { Request, Response } from 'express';
import { GenerateInvoicePdfService } from '../services/generate-invoice-pdf.service.js';
import logger from '../../../shared/utils/logger.js';

export const getInvoiceController = async (req: Request, res: Response) => {
  try {
    const affiliationId = parseInt(req.params.id as string);
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    if (isNaN(affiliationId) || isNaN(month) || isNaN(year)) {
      return res.status(400).json({ error: 'Faltan parámetros: id, month, year' });
    }

    const service = new GenerateInvoicePdfService();
    const user = (req as any).user;
    const pdfBuffer = await service.execute(affiliationId, month, year, user.agency_id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="factura-${year}-${month.toString().padStart(2, '0')}-${affiliationId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Error in getInvoiceController', { error });
    res.status(error.status || 500).json({ error: error.message || 'Error generating invoice' });
  }
};
