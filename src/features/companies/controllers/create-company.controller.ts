import { z } from 'zod';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import type { AuthRequest } from '../../../types/express.types.js';
import { CreateCompanyService } from '../services/create-company.service.js';

const createCompanySchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio'),
  nit: z.string().trim().min(3, 'El NIT es obligatorio').max(20),
  email: z.string().trim().email('Correo invalido').optional().or(z.literal('')),
});

export const createCompanyController = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;

  if (user.role !== 'admin') {
    throw Object.assign(new Error('Solo administradores pueden crear empresas.'), { status: 403 });
  }

  const validatedData = createCompanySchema.parse(req.body);
  const service = new CreateCompanyService();
  const company = await service.execute({
    ...validatedData,
    email: validatedData.email || null,
    agencyId: user.agency_id,
  });

  return sendSuccess(res, company, 201);
});
