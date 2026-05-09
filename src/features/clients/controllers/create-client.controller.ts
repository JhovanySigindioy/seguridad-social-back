import type { Request, Response } from 'express';
import { z } from 'zod';
import { CreateClientService } from '../services/create-client.service.js';
import { sendError, sendSuccess } from '../../../shared/utils/api-response.js';

const createClientSchema = z.object({
  document_type_id: z.number().positive(),
  first_name: z.string().min(1),
  second_name: z.string().optional(),
  first_lastname: z.string().min(1),
  second_lastname: z.string().optional(),
  identification: z.string().min(4),
  email: z.string().email().optional().or(z.literal('')),
  phone_1: z.string().optional().or(z.literal('')),
  phone_2: z.string().optional().or(z.literal('')),
  office_id: z.number().positive(),
});

export const createClientController = async (req: Request, res: Response) => {
  try {
    const validatedData = createClientSchema.parse(req.body);
    const service = new CreateClientService();
    const client = await service.execute(validatedData);

    return sendSuccess(res, client, 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return sendError(res, error.issues[0]?.message || 'Error de validación', 400);
    }
    return sendError(res, error.message || 'Error al crear cliente', error.status || 500);
  }
};
