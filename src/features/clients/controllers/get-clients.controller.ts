import type { Request, Response } from 'express';
import { GetClientsService } from '../services/get-clients.service.js';
import { sendError, sendSuccess } from '../../../shared/utils/api-response.js';

export const getClientsController = async (req: Request, res: Response) => {
  try {
    const agencyId = (req as any).user.agency_id;
    const officeId = req.query.office_id ? Number(req.query.office_id) : undefined;

    const service = new GetClientsService();
    const clients = await service.execute(agencyId, officeId);

    return sendSuccess(res, clients);
  } catch (error: any) {
    return sendError(res, error.message || 'Error al obtener clientes', error.status || 500);
  }
};
