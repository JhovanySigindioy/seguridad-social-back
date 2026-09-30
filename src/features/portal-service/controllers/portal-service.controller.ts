import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AuthRequest } from '../../../types/express.types.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { PortalServiceService } from '../services/portal-service.service.js';

const service = new PortalServiceService();

export const getPortalServiceStatusController = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  return sendSuccess(res, await service.getStatus(user.agency_id));
});

export const activatePortalServiceController = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  return sendSuccess(res, await service.activate(user.agency_id, user.id));
});
