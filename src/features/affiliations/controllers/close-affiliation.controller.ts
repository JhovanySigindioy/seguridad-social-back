import { z } from 'zod';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { CloseAffiliationService } from '../services/close-affiliation.service.js';
import type { AuthRequest } from '../../../types/express.types.js';
import logger from '../../../shared/utils/logger.js';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const bodySchema = z.object({
  end_date: z.string(),
  withdrawal_reason: z.enum(['Voluntario', 'FinContrato', 'Licencia', 'Otro']),
  withdrawal_observations: z.string().optional().nullable(),
});

const service = new CloseAffiliationService();

export const closeAffiliationController = asyncHandler(async (req, res) => {
  const authUser = (req as AuthRequest).user;
  logger.info('Affiliation close request received', {
    path: req.path,
    rawParams: req.params,
    rawBody: {
      end_date: req.body?.end_date,
      withdrawal_reason: req.body?.withdrawal_reason,
      hasWithdrawalObservations: Boolean(req.body?.withdrawal_observations),
    },
    authUser: {
      id: authUser?.id,
      idType: typeof authUser?.id,
      agencyId: authUser?.agency_id,
      agencyIdType: typeof authUser?.agency_id,
      agencyIdIsFinite: Number.isFinite(Number(authUser?.agency_id)),
      role: authUser?.role,
    },
  });

  const { id } = paramsSchema.parse(req.params);
  const { end_date, withdrawal_reason, withdrawal_observations } = bodySchema.parse(req.body);
  const { agency_id, id: createdBy } = authUser;

  if (!Number.isSafeInteger(agency_id) || agency_id <= 0 || !Number.isSafeInteger(createdBy) || createdBy <= 0) {
    logger.error('Affiliation close rejected due to invalid authenticated user context', {
      affiliationId: id,
      agencyId: agency_id,
      createdBy,
    });
    throw Object.assign(new Error('La sesión del usuario no contiene una agencia válida.'), { status: 401 });
  }

  logger.info('Affiliation close request validated', {
    affiliationId: id,
    endDate: end_date,
    withdrawalReason: withdrawal_reason,
    agencyId: agency_id,
    agencyIdType: typeof agency_id,
    agencyIdIsFinite: Number.isFinite(Number(agency_id)),
    createdBy,
    createdByType: typeof createdBy,
  });

  const data = await service.execute({
    affiliationId: id,
    endDate: end_date,
    withdrawalReason: withdrawal_reason,
    withdrawalObservations: withdrawal_observations ?? undefined,
    agencyId: agency_id,
    createdBy,
  });

  return sendSuccess(res, data);
});
