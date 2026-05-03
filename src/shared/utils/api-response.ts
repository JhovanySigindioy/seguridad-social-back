import type { Response } from 'express';

export const sendSuccess = (res: Response, data: any, statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
  });
};

export const sendError = (res: Response, error: string, statusCode: number = 500) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error,
  });
};
