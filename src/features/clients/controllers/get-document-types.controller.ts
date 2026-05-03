import type { Request, Response } from 'express';
import { GetDocumentTypesService } from '../services/get-document-types.service.js';
import { sendError, sendSuccess } from '../../../shared/utils/api-response.js';

export const getDocumentTypesController = async (_req: Request, res: Response) => {
  try {
    const service = new GetDocumentTypesService();
    const documentTypes = await service.execute();
    return sendSuccess(res, documentTypes);
  } catch (error: any) {
    return sendError(res, error.message || 'Error al obtener tipos de documento', 500);
  }
};
