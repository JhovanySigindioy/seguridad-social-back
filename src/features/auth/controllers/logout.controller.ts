import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { clearDashboardSessionCookie, getDashboardSessionToken } from '../services/session-cookie.js';
import { DashboardSessionService } from '../services/session.service.js';

const sessionService = new DashboardSessionService();

export const logoutController = asyncHandler(async (req, res) => {
  const token = getDashboardSessionToken(req);
  if (token) {
    await sessionService.revoke(token, 'logout');
  }

  clearDashboardSessionCookie(res);
  return sendSuccess(res, { loggedOut: true });
});
