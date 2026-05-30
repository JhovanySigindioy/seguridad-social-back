import { GetOfficesService } from '../services/get-offices.service.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AuthRequest } from '../../../types/express.types.js';

export const getOfficesController = asyncHandler(async (req, res) => {
  const { agency_id } = (req as AuthRequest).user;
  const getOfficesService = new GetOfficesService();
  const offices = await getOfficesService.execute(agency_id);

  return sendSuccess(res, offices);
});
