import type { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../../shared/utils/api-response.js';
import { CloseAffiliationService } from '../services/close-affiliation.service.js';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const bodySchema = z.object({
  withdrawal_reason: z.enum(['Voluntario', 'FinContrato', 'Licencia', 'Otro']),
  withdrawal_observations: z.string().optional().nullable(),
});

const service = new CloseAffiliationService();

export const closeAffiliationController = async (req: Request, res: Response) => {
  try {
    const { id } = paramsSchema.parse(req.params);
    const { withdrawal_reason, withdrawal_observations } = bodySchema.parse(req.body);
    const user = (req as any).user;

    if (!user?.agency_id) {
      return sendError(res, 'Sesion invalida', 401);
    }

    const data = await service.execute({
      affiliationId: id,
      withdrawalReason: withdrawal_reason,
      withdrawalObservations: withdrawal_observations ?? undefined,
      agencyId: Number(user.agency_id),
    });

    return sendSuccess(res, data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Datos invalidos para cerrar afiliación', 400);
    }

    return sendError(res, error.message || 'Error al cerrar la afiliación', error.status || 500);
  }
};