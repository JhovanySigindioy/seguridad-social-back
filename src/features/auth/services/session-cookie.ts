import type { Request, Response } from 'express';
import { env } from '../../../config/env.js';

export const DASHBOARD_SESSION_COOKIE = 'dashboard_session';

export const getDashboardSessionToken = (req: Request): string | null => {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const item of header.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0) continue;

    const name = item.slice(0, separator).trim();
    if (name !== DASHBOARD_SESSION_COOKIE) continue;

    const value = item.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value) || null;
    } catch {
      return null;
    }
  }

  return null;
};

export const setDashboardSessionCookie = (res: Response, token: string) => {
  const maxAge = env.SESSION_ABSOLUTE_HOURS * 60 * 60;
  const secure = env.NODE_ENV === 'production' || env.SESSION_COOKIE_SECURE;
  const attributes = [
    `${DASHBOARD_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];

  if (secure) attributes.push('Secure');
  res.setHeader('Set-Cookie', attributes.join('; '));
};

export const clearDashboardSessionCookie = (res: Response) => {
  const secure = env.NODE_ENV === 'production' || env.SESSION_COOKIE_SECURE;
  const attributes = [
    `${DASHBOARD_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];

  if (secure) attributes.push('Secure');
  res.setHeader('Set-Cookie', attributes.join('; '));
};
