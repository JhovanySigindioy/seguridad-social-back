import { z } from 'zod';
import { UpdateAffiliationService } from '../services/update-affiliation.service.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AuthRequest } from '../../../types/express.types.js';

const updateSchema = z.object({
  client_id: z.number().positive(),
  company_id: z.number().positive(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  value: z.number().positive(),
  eps_id: z.number().nullable(),
  arl_id: z.number().nullable(),
  ccf_id: z.number().nullable(),
  pension_id: z.number().nullable(),
  risk_level: z.string().nullable(),
  payment_method: z.string().nullable(),
  is_auto_renewed: z.boolean(),
  observation: z.string().nullable().optional(),
});

export const updateAffiliationController = asyncHandler(async (req, res) => {
  const affiliationId = Number(req.params.id);
  if (!affiliationId) {
    const err: any = new Error('ID de afiliación inválido');
    err.status = 400;
    throw err;
  }

  const { agency_id: agencyId, id: userId } = (req as AuthRequest).user;
  const validatedData = updateSchema.parse(req.body);
  const service = new UpdateAffiliationService();

  const result = await service.execute({
    ...validatedData,
    start_date: validatedData.start_date ?? null,
    end_date: validatedData.end_date ?? null,
    observation: validatedData.observation ?? null,
    affiliationId,
    agencyId,
    userId,
  });

  return sendSuccess(res, result);
});