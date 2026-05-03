import type { Request, Response, NextFunction } from 'express';
import { createAffiliationService } from '../services/create-affiliation.service.js';
import logger from '../../../shared/utils/logger.js';

export const createAffiliationController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agencyId = req.user?.agencyId;
    const userId = req.user?.id;
    
    if (!agencyId || !userId) {
      throw Object.assign(new Error('Sesión inválida'), { status: 401 });
    }

    const newAffiliation = await createAffiliationService(req.body, userId, agencyId);
    
    logger.info('✅ Nueva afiliación creada:', { id: newAffiliation.id, by: userId });

    res.status(201).json({
      success: true,
      data: newAffiliation,
      message: 'Afiliación creada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};
