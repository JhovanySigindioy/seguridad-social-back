import { GetDocumentTypesService } from '../services/get-document-types.service.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';

export const getDocumentTypesController = asyncHandler(async (_req, res) => {
  const service = new GetDocumentTypesService();
  const documentTypes = await service.execute();
  return sendSuccess(res, documentTypes);
});
