import type { Request, Response } from 'express';
import { GetOfficesService } from '../services/get-offices.service.js';
import { sendSuccess, sendError } from '../../../shared/utils/api-response.js';

export const getOfficesController = async (req: Request, res: Response) => {
  try {
    const agencyId = (req as any).user.agency_id;
    const getOfficesService = new GetOfficesService();
    
    const offices = await getOfficesService.execute(agencyId);

    return sendSuccess(res, offices);
  } catch (error: any) {
    return sendError(res, 'Error al obtener las sedes');
  }
};
