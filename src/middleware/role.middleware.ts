import type { NextFunction, Request, Response } from 'express';
import { sendError } from '../shared/utils/api-response.js';
import type { AuthRequest } from '../types/express.types.js';

export const requireRoles = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  const role = (req as AuthRequest).user?.role;
  if (!role || !roles.includes(role)) {
    return sendError(res, 'No tienes permisos para realizar esta operación', 403);
  }
  next();
};
