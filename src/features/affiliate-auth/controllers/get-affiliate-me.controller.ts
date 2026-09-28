import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { sendError, sendSuccess } from '../../../shared/utils/api-response.js';
import type { AffiliateAuthRequest } from '../../../types/affiliate-request.types.js';
import { AffiliateLoginService } from '../services/affiliate-login.service.js';

export const getAffiliateMeController = asyncHandler(async (req, res) => {
  const { account_id } = (req as AffiliateAuthRequest).affiliate;
  const service = new AffiliateLoginService();
  const user = await service.getProfile(account_id);

  if (!user) {
    return sendError(res, 'Cuenta de afiliado no encontrada', 404);
  }

  return sendSuccess(res, user);
});
