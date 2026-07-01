import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { getOfficesController } from './controllers/get-offices.controller.js';
import { createOfficeController } from './controllers/create-office.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/', getOfficesController);
router.post('/', createOfficeController);

export default router;
