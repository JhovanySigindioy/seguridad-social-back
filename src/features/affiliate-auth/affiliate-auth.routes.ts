import { Router } from 'express';
import { affiliateAuthMiddleware } from '../../middleware/affiliate-auth.middleware.js';
import { affiliateLoginController } from './controllers/affiliate-login.controller.js';
import { getAffiliateMeController } from './controllers/get-affiliate-me.controller.js';
import { affiliateLoginRateLimit } from '../../middleware/affiliate-login-rate-limit.middleware.js';

const router = Router();

router.post('/login', affiliateLoginRateLimit, affiliateLoginController);
router.get('/me', affiliateAuthMiddleware, getAffiliateMeController);

export default router;
