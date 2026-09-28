import { Router } from 'express';
import { toggleAgencyPaymentLockController } from './controllers/toggle-agency-payment-lock.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRoles } from '../../middleware/role.middleware.js';

const router = Router();

router.post('/agencies/:agencyId/payment-lock', authMiddleware, requireRoles('admin'), toggleAgencyPaymentLockController);

export default router;
