import { Router } from 'express';
import { affiliateAuthMiddleware } from '../../middleware/affiliate-auth.middleware.js';
import { affiliateLoginController } from './controllers/affiliate-login.controller.js';
import { getAffiliateMeController } from './controllers/get-affiliate-me.controller.js';
import { affiliateLoginRateLimit } from '../../middleware/affiliate-login-rate-limit.middleware.js';
import { changeAffiliatePasswordController } from './controllers/change-affiliate-password.controller.js';

const router = Router();

router.post('/login', affiliateLoginRateLimit, affiliateLoginController);
router.get('/me', affiliateAuthMiddleware, getAffiliateMeController);
router.patch('/password', affiliateAuthMiddleware, changeAffiliatePasswordController);

export default router;
