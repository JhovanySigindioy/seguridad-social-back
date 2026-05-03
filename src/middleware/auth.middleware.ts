import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../shared/utils/api-response.js';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Token no proporcionado', 401);
  }

  const token = authHeader.slice('Bearer '.length);

  if (!token) {
    return sendError(res, 'Token no proporcionado', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    (req as any).user = decoded;
    next();
  } catch (error) {
    return sendError(res, 'Token invalido o expirado', 401);
  }
};
