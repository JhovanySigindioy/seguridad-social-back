import { Router } from 'express';
import { toggleAgencyPaymentLockController } from './controllers/toggle-agency-payment-lock.controller.js';

const router = Router();

router.post('/agencies/:agencyId/payment-lock', toggleAgencyPaymentLockController);

export default router;
