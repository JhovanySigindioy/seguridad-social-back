import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import type { AffiliateAuthRequest } from '../../../types/affiliate-request.types.js';
import { GetAffiliationsService } from '../../affiliations/services/get-affiliations.service.js';

const service = new GetAffiliationsService();

export const getAffiliateAffiliationsController = asyncHandler(async (req, res) => {
  const { client_id, agency_id } = (req as AffiliateAuthRequest).affiliate;
  const result = await service.executeByClient(client_id, agency_id);
  return sendSuccess(res, result);
});
