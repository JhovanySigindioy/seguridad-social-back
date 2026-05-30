import { createAffiliationService } from '../services/create-affiliation.service.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import logger from '../../../shared/utils/logger.js';
import type { AuthRequest } from '../../../types/express.types.js';

export const createAffiliationController = asyncHandler(async (req, res) => {
  const { id: userId, agency_id: agencyId } = (req as AuthRequest).user;

  const newAffiliation = await createAffiliationService(req.body, userId, agencyId);

  logger.info('Nueva afiliacion creada:', { id: newAffiliation.id, by: userId });

  return sendSuccess(res, newAffiliation, 201);
});
