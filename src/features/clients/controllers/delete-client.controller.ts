import { DeleteClientService } from '../services/delete-client.service.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';

export const deleteClientController = asyncHandler(async (req, res) => {
  const clientId = Number(req.params.id);
  if (!clientId) {
    const err: any = new Error('ID de cliente inválido');
    err.status = 400;
    throw err;
  }

  const service = new DeleteClientService();
  const result = await service.execute(clientId);

  return sendSuccess(res, result);
});
