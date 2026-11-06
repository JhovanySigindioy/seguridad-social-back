import type { Request, Response, NextFunction } from 'express';
import { sendError } from '../shared/utils/api-response.js';
import { DashboardSessionService, SessionError } from '../features/auth/services/session.service.js';
import { clearDashboardSessionCookie, getDashboardSessionToken } from '../features/auth/services/session-cookie.js';

const sessionService = new DashboardSessionService();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = getDashboardSessionToken(req);
  const tabId = req.header('X-Session-Tab-Id');

  if (!token || !tabId) {
    return sendError(res, 'Sesión administrativa no proporcionada.', 401);
  }

  try {
    const session = await sessionService.validate(token, tabId);
    (req as any).user = session.user;
    (req as any).sessionId = session.sessionId;
    next();
  } catch (error) {
    if (error instanceof SessionError) {
      clearDashboardSessionCookie(res);
      return sendError(res, error.message, error.status);
    }

    return next(error);
  }
};
