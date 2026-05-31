import { Router } from 'express';
import { getDashboardStatsController } from '../controllers/dashboard.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/stats', getDashboardStatsController);

export default router;
