import { z } from 'zod';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import type { AuthRequest } from '../../../types/express.types.js';
import { CreateOfficeService } from '../services/create-office.service.js';

const createOfficeSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio').max(100),
  address: z.string().trim().max(255).optional().or(z.literal('')),
  logo_url: z.string().trim().url('La URL del logo no es valida').optional().or(z.literal('')),
});

export const createOfficeController = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;

  if (user.role !== 'admin') {
    throw Object.assign(new Error('Solo administradores pueden crear sedes.'), { status: 403 });
  }

  const validatedData = createOfficeSchema.parse(req.body);
  const service = new CreateOfficeService();
  const office = await service.execute({
    ...validatedData,
    address: validatedData.address || null,
    logo_url: validatedData.logo_url || null,
    agencyId: user.agency_id,
  });

  return sendSuccess(res, office, 201);
});
