import { z } from 'zod';
import { LoginService } from '../services/login.service.js';
import { sendError, sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
});

export const loginController = asyncHandler(async (req, res) => {
  const validatedData = loginSchema.parse(req.body);
  const loginService = new LoginService();

  const result = await loginService.execute(validatedData.email, validatedData.password);

  if (!result) {
    return sendError(res, 'Credenciales invalidas o usuario inactivo', 401);
  }

  return sendSuccess(res, result);
});
