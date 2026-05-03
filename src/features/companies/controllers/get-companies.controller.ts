import type { Request, Response } from 'express';
import { GetCompaniesService } from '../services/get-companies.service.js';
import { sendError, sendSuccess } from '../../../shared/utils/api-response.js';

export const getCompaniesController = async (req: Request, res: Response) => {
  try {
    const agencyId = (req as any).user.agency_id;
    const service = new GetCompaniesService();
    const companies = await service.execute(agencyId);
    return sendSuccess(res, companies);
  } catch (error: any) {
    return sendError(res, error.message || 'Error al obtener empresas', 500);
  }
};
