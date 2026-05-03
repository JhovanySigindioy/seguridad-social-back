import type { Request, Response } from 'express';
import { DeleteClientService } from '../services/delete-client.service.js';
import { sendError, sendSuccess } from '../../../shared/utils/api-response.js';

export const deleteClientController = async (req: Request, res: Response) => {
  try {
    const clientId = Number(req.params.id);
    if (!clientId) {
      return sendError(res, 'ID de cliente inválido', 400);
    }

    const service = new DeleteClientService();
    const result = await service.execute(clientId);

    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error.message || 'Error al eliminar cliente', error.status || 500);
  }
};
