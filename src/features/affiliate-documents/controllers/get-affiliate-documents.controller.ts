import { z } from 'zod';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AuthRequest } from '../../../types/express.types.js';
import { GetAffiliateDocumentsService } from '../services/get-affiliate-documents.service.js';

const querySchema = z.object({
  client_id: z.coerce.number().positive().optional(),
  affiliation_id: z.coerce.number().positive().optional(),
  monthly_payment_id: z.coerce.number().positive().optional(),
});

export const getAffiliateDocumentsController = asyncHandler(async (req, res) => {
  const { agency_id, id: userId, role } = (req as AuthRequest).user;
  const filters = querySchema.parse(req.query);
  const service = new GetAffiliateDocumentsService();
  const documents = await service.execute(agency_id, userId, role, filters);

  return sendSuccess(res, documents);
});
