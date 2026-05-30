import { GetLatestByClientService } from '../services/get-latest-by-client.service.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AuthRequest } from '../../../types/express.types.js';

export const getLatestByClientController = asyncHandler(async (req, res) => {
  const clientId = Number(req.params.clientId);
  if (!clientId) {
    const err: any = new Error('ID de cliente requerido');
    err.status = 400;
    throw err;
  }

  const { agency_id } = (req as AuthRequest).user;
  const service = new GetLatestByClientService();
  const data = await service.execute(clientId, agency_id);

  return sendSuccess(res, data);
});
