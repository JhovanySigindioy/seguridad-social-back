import { z } from 'zod';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import type { AuthRequest } from '../../../types/express.types.js';
import { ConfirmAffiliationService } from '../services/confirm-affiliation.service.js';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
const service = new ConfirmAffiliationService();

export const confirmAffiliationController = asyncHandler(async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const { agency_id: agencyId, id: createdBy } = (req as AuthRequest).user;
  const result = await service.execute(id, agencyId, createdBy);
  return sendSuccess(res, result, 201);
});
