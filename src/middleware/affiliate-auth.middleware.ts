import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sendError } from '../shared/utils/api-response.js';

export const affiliateAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 'Token de afiliado no proporcionado', 401);
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as Record<string, unknown>;

    if (decoded.scope !== 'affiliate' || decoded.role !== 'affiliate') {
      return sendError(res, 'Token de afiliado invalido', 401);
    }

    (req as any).affiliate = decoded;
    next();
  } catch {
    return sendError(res, 'Token de afiliado invalido o expirado', 401);
  }
};
