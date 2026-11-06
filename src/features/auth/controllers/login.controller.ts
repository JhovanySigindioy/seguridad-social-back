import { z } from 'zod';
import { LoginService } from '../services/login.service.js';
import { sendError, sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { setDashboardSessionCookie } from '../services/session-cookie.js';

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
});

export const loginController = asyncHandler(async (req, res) => {
  const validatedData = loginSchema.parse(req.body);
  const tabId = req.header('X-Session-Tab-Id');
  if (!tabId) {
    return sendError(res, 'Identificador de pestaña no proporcionado.', 400);
  }

  const loginService = new LoginService();

  const result = await loginService.execute(validatedData.email, validatedData.password, tabId);

  if (!result) {
    return sendError(res, 'Credenciales invalidas o usuario inactivo', 401);
  }

  setDashboardSessionCookie(res, result.token);
  const { token: _token, ...publicResult } = result;
  return sendSuccess(res, publicResult);
});
