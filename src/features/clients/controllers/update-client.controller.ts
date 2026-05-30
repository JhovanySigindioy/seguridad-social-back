import { z } from 'zod';
import { UpdateClientService } from '../services/update-client.service.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';

const updateClientSchema = z.object({
  document_type_id: z.number().positive(),
  first_name: z.string().min(1),
  second_name: z.string().optional(),
  first_lastname: z.string().min(1),
  second_lastname: z.string().optional(),
  identification: z.string().min(4),
  email: z.string().email().optional().or(z.literal('')),
});

export const updateClientController = asyncHandler(async (req, res) => {
  const clientId = Number(req.params.id);
  if (!clientId) {
    const err: any = new Error('ID de cliente inválido');
    err.status = 400;
    throw err;
  }

  const validatedData = updateClientSchema.parse(req.body);
  const service = new UpdateClientService();
  const client = await service.execute(clientId, validatedData);

  return sendSuccess(res, client);
});
