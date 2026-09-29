import { z } from 'zod';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AuthRequest } from '../../../types/express.types.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { ResetAffiliateAccountPasswordService } from '../services/reset-affiliate-account-password.service.js';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
const service = new ResetAffiliateAccountPasswordService();

export const resetAffiliateAccountPasswordController = asyncHandler(async (req, res) => {
  const { id: accountId } = paramsSchema.parse(req.params);
  const user = (req as AuthRequest).user;
  const result = await service.execute({ accountId, agencyId: user.agency_id, userId: user.id, role: user.role });
  return sendSuccess(res, result);
});
