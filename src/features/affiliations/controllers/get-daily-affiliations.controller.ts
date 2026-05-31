import { GetDailyAffiliationsService } from '../services/get-daily-affiliations.service.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AuthRequest } from '../../../types/express.types.js';

const service = new GetDailyAffiliationsService();

export const getDailyAffiliationsController = asyncHandler(async (req, res) => {
  const { agency_id } = (req as AuthRequest).user;
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const officeId = req.query.office_id ? parseInt(req.query.office_id as string, 10) : undefined;

  const data = await service.execute(agency_id, date, officeId);
  return sendSuccess(res, data);
});
