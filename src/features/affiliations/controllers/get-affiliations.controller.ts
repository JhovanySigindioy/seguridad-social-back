import type { Request, Response } from 'express';
import { GetAffiliationsService } from '../services/get-affiliations.service.js';
import { sendSuccess, sendError } from '../../../shared/utils/api-response.js';

const service = new GetAffiliationsService();

export const getAffiliationsController = async (req: Request, res: Response) => {
  try {
    const agencyId = (req as any).user.agency_id;
    const data = await service.execute(agencyId);
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};
