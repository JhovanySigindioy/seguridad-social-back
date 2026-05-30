import { GetCompaniesService } from '../services/get-companies.service.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AuthRequest } from '../../../types/express.types.js';

export const getCompaniesController = asyncHandler(async (req, res) => {
  const { agency_id } = (req as AuthRequest).user;
  const service = new GetCompaniesService();
  const companies = await service.execute(agency_id);

  return sendSuccess(res, companies);
});
