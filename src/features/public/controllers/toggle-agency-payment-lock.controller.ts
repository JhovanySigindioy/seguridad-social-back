import { z } from 'zod';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { ToggleAgencyPaymentLockService } from '../services/toggle-agency-payment-lock.service.js';
import type { AuthRequest } from '../../../types/express.types.js';

const bodySchema = z.object({
  blocked: z.boolean(),
});

export const toggleAgencyPaymentLockController = asyncHandler(async (req, res) => {
  const agencyId = Number(req.params.agencyId);

  if (!agencyId) {
    throw Object.assign(new Error('ID de agencia invalido'), { status: 400 });
  }

  const { blocked } = bodySchema.parse(req.body);
  const { agency_id: userAgencyId } = (req as AuthRequest).user;
  if (agencyId !== userAgencyId) {
    throw Object.assign(new Error('No puedes modificar otra agencia'), { status: 403 });
  }
  const service = new ToggleAgencyPaymentLockService();
  const result = await service.execute({ agencyId, blocked });

  return sendSuccess(res, {
    ...result,
    message: blocked ? 'Agencia bloqueada por pago' : 'Agencia activada correctamente',
  });
});
