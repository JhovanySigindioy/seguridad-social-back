import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { getCompaniesController } from './controllers/get-companies.controller.js';
import { createCompanyController } from './controllers/create-company.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/', getCompaniesController);
router.post('/', createCompanyController);

export default router;
