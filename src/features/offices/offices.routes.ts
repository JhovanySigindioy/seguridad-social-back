import { Router } from 'express';
import { getOfficesController } from './controllers/get-offices.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/', authMiddleware, getOfficesController);

export default router;
