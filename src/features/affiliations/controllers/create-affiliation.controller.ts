import type { Request, Response, NextFunction } from 'express';
import { createAffiliationService } from '../services/create-affiliation.service.js';
import logger from '../../../shared/utils/logger.js';

export const createAffiliationController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const agencyId = Number(user?.agency_id);
    const userId = Number(user?.id);

    if (!agencyId || !userId) {
      throw Object.assign(new Error('Sesion invalida'), { status: 401 });
    }

    const newAffiliation = await createAffiliationService(req.body, userId, agencyId);

    logger.info('Nueva afiliacion creada:', { id: newAffiliation.id, by: userId });

    res.status(201).json({
      success: true,
      data: newAffiliation,
      message: 'Afiliacion creada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};
