import type { Request, Response } from 'express';
import { z } from 'zod';
import { UpdateAffiliationService } from '../services/update-affiliation.service.js';
import { sendError, sendSuccess } from '../../../shared/utils/api-response.js';

const updateSchema = z.object({
  client_id: z.number().positive(),
  company_id: z.number().positive(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  value: z.number().positive(),
  eps_id: z.number().nullable(),
  arl_id: z.number().nullable(),
  ccf_id: z.number().nullable(),
  pension_id: z.number().nullable(),
  risk_level: z.string().nullable(),
  payment_method: z.string().nullable(),
  is_auto_renewed: z.boolean(),
  observation: z.string().nullable().optional(),
});

export const updateAffiliationController = async (req: Request, res: Response) => {
  try {
    const affiliationId = Number(req.params.id);
    const agencyId = (req as any).user.agency_id;

    if (!affiliationId) {
      return sendError(res, 'ID de afiliación inválido', 400);
    }

    const validatedData = updateSchema.parse(req.body);
    const service = new UpdateAffiliationService();

    const result = await service.execute({
      client_id: validatedData.client_id,
      company_id: validatedData.company_id,
      start_date: validatedData.start_date ?? null,
      end_date: validatedData.end_date ?? null,
      value: validatedData.value,
      eps_id: validatedData.eps_id,
      arl_id: validatedData.arl_id,
      ccf_id: validatedData.ccf_id,
      pension_id: validatedData.pension_id,
      risk_level: validatedData.risk_level,
      payment_method: validatedData.payment_method,
      is_auto_renewed: validatedData.is_auto_renewed,
      observation: validatedData.observation ?? null,
      affiliationId,
      agencyId,
    });

    return sendSuccess(res, result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return sendError(res, error.issues[0]?.message || 'Error de validación', 400);
    }
    return sendError(res, error.message || 'Error interno del servidor', error.status || 500);
  }
};