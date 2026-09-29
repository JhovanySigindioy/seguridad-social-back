import { z } from 'zod';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AuthRequest } from '../../../types/express.types.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { CreateAffiliateAccountService } from '../services/create-affiliate-account.service.js';

const bodySchema = z.object({
  client_id: z.coerce.number().int().positive(),
  email: z.string().trim().email().max(255).optional(),
});

const service = new CreateAffiliateAccountService();

export const createAffiliateAccountController = asyncHandler(async (req, res) => {
  const body = bodySchema.parse(req.body);
  const user = (req as AuthRequest).user;
  const result = await service.execute({
    agencyId: user.agency_id,
    userId: user.id,
    role: user.role,
    clientId: body.client_id,
    ...(body.email ? { email: body.email } : {}),
  });
  return sendSuccess(res, result, 201);
});
