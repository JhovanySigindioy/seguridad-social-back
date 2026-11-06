import { Router } from 'express';
import { loginController } from './controllers/login.controller.js';
import { logoutController } from './controllers/logout.controller.js';
import { sessionController } from './controllers/session.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/login', loginController);
router.post('/logout', logoutController);
router.get('/session', authMiddleware, sessionController);

export default router;
