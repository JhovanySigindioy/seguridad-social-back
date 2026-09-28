import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import type { AffiliateAuthRequest } from '../../../types/affiliate-request.types.js';
import { GetAffiliatePortalDocumentsService } from '../services/get-affiliate-documents.service.js';

const service = new GetAffiliatePortalDocumentsService();

export const getAffiliateDocumentsController = asyncHandler(async (req, res) => {
  const { client_id, agency_id } = (req as AffiliateAuthRequest).affiliate;
  const documents = await service.execute(client_id, agency_id);
  return sendSuccess(res, documents);
});
