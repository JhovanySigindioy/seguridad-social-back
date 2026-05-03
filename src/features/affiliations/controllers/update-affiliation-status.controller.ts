import type { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../../shared/utils/api-response.js';
import { PAYMENT_STATUSES } from '../types/affiliation.types.js';
import { UpdateAffiliationStatusService } from '../services/update-affiliation-status.service.js';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const bodySchema = z.object({
  payment_status: z.enum(PAYMENT_STATUSES),
});

const service = new UpdateAffiliationStatusService();

export const updateAffiliationStatusController = async (req: Request, res: Response) => {
  try {
    const { id } = paramsSchema.parse(req.params);
    const { payment_status } = bodySchema.parse(req.body);
    const user = (req as any).user;

    if (!user?.agency_id || !user?.role) {
      return sendError(res, 'Sesion invalida', 401);
    }

    const data = await service.execute({
      affiliationId: id,
      paymentStatus: payment_status,
      agencyId: Number(user.agency_id),
      role: String(user.role),
    });

    return sendSuccess(res, data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Datos de estado invalidos', 400);
    }

    return sendError(res, error.message || 'Error al actualizar el estado', error.status || 500);
  }
};
