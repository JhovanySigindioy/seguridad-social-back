import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { getAffiliateAccountsController } from './controllers/get-affiliate-accounts.controller.js';
import { createAffiliateAccountController } from './controllers/create-affiliate-account.controller.js';
import { resetAffiliateAccountPasswordController } from './controllers/reset-affiliate-account-password.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/', getAffiliateAccountsController);
router.post('/', createAffiliateAccountController);
router.post('/:id/reset-password', resetAffiliateAccountPasswordController);

export default router;
