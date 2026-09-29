import { z } from 'zod';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AffiliateAuthRequest } from '../../../types/affiliate-request.types.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { ChangeAffiliatePasswordService } from '../services/change-affiliate-password.service.js';

const bodySchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(12).max(128),
});

const service = new ChangeAffiliatePasswordService();

export const changeAffiliatePasswordController = asyncHandler(async (req, res) => {
  const body = bodySchema.parse(req.body);
  const { account_id: accountId } = (req as AffiliateAuthRequest).affiliate;
  const result = await service.execute({ accountId, currentPassword: body.current_password, newPassword: body.new_password });
  return sendSuccess(res, result);
});
