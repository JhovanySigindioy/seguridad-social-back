import { Router } from 'express';
import { affiliateAuthMiddleware } from '../../middleware/affiliate-auth.middleware.js';
import { getAffiliateAffiliationsController } from './controllers/get-affiliate-affiliations.controller.js';
import { getAffiliateDocumentsController } from './controllers/get-affiliate-documents.controller.js';
import { downloadAffiliateDocumentController } from './controllers/download-affiliate-document.controller.js';

const router = Router();

router.use(affiliateAuthMiddleware);
router.get('/affiliations', getAffiliateAffiliationsController);
router.get('/documents', getAffiliateDocumentsController);
router.get('/documents/:id/download', downloadAffiliateDocumentController);

export default router;
