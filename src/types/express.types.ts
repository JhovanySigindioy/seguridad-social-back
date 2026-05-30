import type { Request } from 'express';

/**
 * Extiende el Request de Express para tipado estricto del usuario autenticado.
 * El middleware auth.middleware.ts inyecta este objeto en req.user.
 */
export interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    role: string;
    agency_id: number;
  };
}
