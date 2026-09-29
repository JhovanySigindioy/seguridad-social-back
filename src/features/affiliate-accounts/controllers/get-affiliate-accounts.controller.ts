import { z } from 'zod';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AuthRequest } from '../../../types/express.types.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { GetAffiliateAccountsService } from '../services/get-affiliate-accounts.service.js';

const querySchema = z.object({
  office_id: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'blocked', 'disabled', 'invited', 'none']).optional(),
  paid_only: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().optional(),
  page_size: z.coerce.number().int().min(10).max(100).optional(),
});

const service = new GetAffiliateAccountsService();

export const getAffiliateAccountsController = asyncHandler(async (req, res) => {
  const query = querySchema.parse(req.query);
  const user = (req as AuthRequest).user;
  const result = await service.execute({
    agencyId: user.agency_id,
    userId: user.id,
    role: user.role,
    ...(query.office_id ? { officeId: query.office_id } : {}),
    ...(query.search ? { search: query.search } : {}),
    ...(query.status ? { status: query.status } : {}),
    paidOnly: query.paid_only === 'true',
    ...(query.page ? { page: query.page } : {}),
    ...(query.page_size ? { pageSize: query.page_size } : {}),
  });
  return sendSuccess(res, result);
});
