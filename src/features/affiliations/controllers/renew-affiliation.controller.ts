import { z } from 'zod';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import type { AuthRequest } from '../../../types/express.types.js';
import { RenewAffiliationService } from '../services/renew-affiliation.service.js';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
const bodySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).optional(),
});

const service = new RenewAffiliationService();

export const renewAffiliationController = asyncHandler(async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const { month, year } = bodySchema.parse(req.body || {});
  const { agency_id: agencyId, id: createdBy } = (req as AuthRequest).user;
  const result = await service.execute({ affiliationId: id, agencyId, createdBy, ...(month ? { targetMonth: month } : {}), ...(year ? { targetYear: year } : {}) });
  return sendSuccess(res, result, 201);
});
