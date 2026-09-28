import { z } from 'zod';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { sendError, sendSuccess } from '../../../shared/utils/api-response.js';
import { AffiliateLoginService } from '../services/affiliate-login.service.js';

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
});

export const affiliateLoginController = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const service = new AffiliateLoginService();
  const result = await service.execute(email, password);

  if (!result) {
    return sendError(res, 'Credenciales invalidas o cuenta inactiva', 401);
  }

  return sendSuccess(res, result);
});
