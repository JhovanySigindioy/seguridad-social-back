import { z } from 'zod';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { PAYMENT_STATUSES } from '../types/affiliation.types.js';
import { UpdateAffiliationStatusService } from '../services/update-affiliation-status.service.js';
import type { AuthRequest } from '../../../types/express.types.js';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const bodySchema = z.object({
  payment_status: z.enum(PAYMENT_STATUSES),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000),
});

const service = new UpdateAffiliationStatusService();

export const updateAffiliationStatusController = asyncHandler(async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const { payment_status, month, year } = bodySchema.parse(req.body);
  const { agency_id, role } = (req as AuthRequest).user;

  const data = await service.execute({
    affiliationId: id,
    paymentStatus: payment_status,
    month,
    year,
    agencyId: agency_id,
    role,
  });

  return sendSuccess(res, data);
});
