import { z } from 'zod';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { CloseAffiliationService } from '../services/close-affiliation.service.js';
import type { AuthRequest } from '../../../types/express.types.js';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const bodySchema = z.object({
  withdrawal_reason: z.enum(['Voluntario', 'FinContrato', 'Licencia', 'Otro']),
  withdrawal_observations: z.string().optional().nullable(),
});

const service = new CloseAffiliationService();

export const closeAffiliationController = asyncHandler(async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const { withdrawal_reason, withdrawal_observations } = bodySchema.parse(req.body);
  const { agency_id } = (req as AuthRequest).user;

  const data = await service.execute({
    affiliationId: id,
    withdrawalReason: withdrawal_reason,
    withdrawalObservations: withdrawal_observations ?? undefined,
    agencyId: agency_id,
  });

  return sendSuccess(res, data);
});