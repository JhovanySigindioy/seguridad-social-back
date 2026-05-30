import { GetClientsService } from '../services/get-clients.service.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AuthRequest } from '../../../types/express.types.js';

export const getClientsController = asyncHandler(async (req, res) => {
  const { agency_id } = (req as AuthRequest).user;
  const officeId = req.query.office_id ? Number(req.query.office_id) : undefined;

  const service = new GetClientsService();
  const clients = await service.execute(agency_id, officeId);

  return sendSuccess(res, clients);
});
