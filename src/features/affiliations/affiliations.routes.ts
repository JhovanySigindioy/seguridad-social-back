import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { getAffiliationsController } from './controllers/get-affiliations.controller.js';
import { getFormDataController } from './controllers/get-form-data.controller.js';
import { createAffiliationController } from './controllers/create-affiliation.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getAffiliationsController);
router.get('/form-data', getFormDataController);
router.post('/', createAffiliationController);

export default router;
