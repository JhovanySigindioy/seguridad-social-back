import type { Request, Response, NextFunction } from 'express';
import { sendError } from '../shared/utils/api-response.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

export const affiliateLoginRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  current.count += 1;
  if (current.count > MAX_ATTEMPTS) {
    return sendError(res, 'Demasiados intentos. Intenta nuevamente más tarde.', 429);
  }

  return next();
};
