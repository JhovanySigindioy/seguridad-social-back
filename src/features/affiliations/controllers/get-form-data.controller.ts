import type { Request, Response, NextFunction } from 'express';
import { getFormDataService } from '../services/get-form-data.service.js';
import logger from '../../../shared/utils/logger.js';

export const getFormDataController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agencyId = req.user?.agencyId;
    if (!agencyId) throw Object.assign(new Error('No agency context'), { status: 403 });

    const data = await getFormDataService(agencyId);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};
