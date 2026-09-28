import { z } from 'zod';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import type { AuthRequest } from '../../../types/express.types.js';
import { RejectAffiliationCandidateService } from '../services/reject-affiliation-candidate.service.js';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
const bodySchema = z.object({
  reason: z.enum(['Voluntario', 'FinContrato', 'Licencia', 'Otro']),
  observations: z.string().nullable().optional(),
});
const service = new RejectAffiliationCandidateService();

export const rejectAffiliationCandidateController = asyncHandler(async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const { reason, observations } = bodySchema.parse(req.body);
  const { agency_id: agencyId, id: createdBy } = (req as AuthRequest).user;
  const result = await service.execute({
    affiliationId: id,
    agencyId,
    createdBy,
    reason,
    observations: observations ?? null,
  });
  return sendSuccess(res, result);
});
