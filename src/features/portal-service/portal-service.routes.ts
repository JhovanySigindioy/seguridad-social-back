import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { activatePortalServiceController, getPortalServiceStatusController } from './controllers/portal-service.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/status', getPortalServiceStatusController);
router.post('/activate', activatePortalServiceController);

export default router;
