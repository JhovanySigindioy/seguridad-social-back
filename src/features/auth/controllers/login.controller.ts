import type { Request, Response } from 'express';
import { z } from 'zod';
import { LoginService } from '../services/login.service.js';
import { sendError, sendSuccess } from '../../../shared/utils/api-response.js';

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
});

export const loginController = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const loginService = new LoginService();

    const result = await loginService.execute(validatedData.email, validatedData.password);

    if (!result) {
      return sendError(res, 'Credenciales invalidas o usuario inactivo', 401);
    }

    return sendSuccess(res, result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return sendError(res, error.issues[0]?.message || 'Error de validacion', 400);
    }

    return sendError(res, 'Error interno del servidor');
  }
};
