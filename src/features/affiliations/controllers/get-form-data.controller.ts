import { GetFormDataService } from '../services/get-form-data.service.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AuthRequest } from '../../../types/express.types.js';

export const getFormDataController = asyncHandler(async (req, res) => {
  const { agency_id } = (req as AuthRequest).user;
  const service = new GetFormDataService();
  const data = await service.execute(agency_id);

  return sendSuccess(res, data);
});
