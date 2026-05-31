import { GetAffiliationsService } from '../services/get-affiliations.service.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AuthRequest } from '../../../types/express.types.js';

const service = new GetAffiliationsService();

export const getAffiliationsController = asyncHandler(async (req, res) => {
  const { agency_id, id: userId, role } = (req as AuthRequest).user;
  const { month, year } = req.query;

  const parsedMonth = month ? parseInt(month as string, 10) : undefined;
  const parsedYear = year ? parseInt(year as string, 10) : undefined;

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const data = await service.execute(agency_id, userId, role, parsedMonth, parsedYear);

  return sendSuccess(res, data);
});
