import type { Request, Response } from 'express';
import { z } from 'zod';
import { UpdateClientService } from '../services/update-client.service.js';
import { sendError, sendSuccess } from '../../../shared/utils/api-response.js';

const updateClientSchema = z.object({
  document_type_id: z.number().positive(),
  first_name: z.string().min(1),
  second_name: z.string().optional(),
  first_lastname: z.string().min(1),
  second_lastname: z.string().optional(),
  identification: z.string().min(4),
  email: z.string().email().optional().or(z.literal('')),
});

export const updateClientController = async (req: Request, res: Response) => {
  try {
    const clientId = Number(req.params.id);
    if (!clientId) {
      return sendError(res, 'ID de cliente inválido', 400);
    }

    const validatedData = updateClientSchema.parse(req.body);
    const service = new UpdateClientService();
    const client = await service.execute(clientId, validatedData);

    return sendSuccess(res, client);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return sendError(res, error.issues[0]?.message || 'Error de validación', 400);
    }
    return sendError(res, error.message || 'Error al actualizar cliente', error.status || 500);
  }
};
