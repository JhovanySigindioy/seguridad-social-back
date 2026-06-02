import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { getAffiliationsController } from './controllers/get-affiliations.controller.js';
import { getDailyAffiliationsController } from './controllers/get-daily-affiliations.controller.js';
import { getFormDataController } from './controllers/get-form-data.controller.js';
import { createAffiliationController } from './controllers/create-affiliation.controller.js';
import { updateAffiliationController } from './controllers/update-affiliation.controller.js';
import { updateAffiliationStatusController } from './controllers/update-affiliation-status.controller.js';
import { closeAffiliationController } from './controllers/close-affiliation.controller.js';
import { getLatestByClientController } from './controllers/get-latest-by-client.controller.js';
import { getInvoiceController } from './controllers/get-invoice.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/daily', getDailyAffiliationsController);
router.get('/latest-by-client/:clientId', getLatestByClientController);
router.get('/', getAffiliationsController);
router.get('/form-data', getFormDataController);
router.put('/:id', updateAffiliationController);
router.patch('/:id/status', updateAffiliationStatusController);
router.patch('/:id/close', closeAffiliationController);
router.get('/:id/invoice', getInvoiceController);
router.post('/', createAffiliationController);

export default router;
