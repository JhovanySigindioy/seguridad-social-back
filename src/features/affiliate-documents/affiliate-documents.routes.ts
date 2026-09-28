import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { uploadAffiliateDocumentMiddleware } from './middleware/document-upload.middleware.js';
import { getAffiliateDocumentsController } from './controllers/get-affiliate-documents.controller.js';
import { uploadAffiliateDocumentController } from './controllers/upload-affiliate-document.controller.js';
import { downloadAffiliateDocumentController } from './controllers/download-affiliate-document.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getAffiliateDocumentsController);
router.get('/:id/download', downloadAffiliateDocumentController);
router.post('/', uploadAffiliateDocumentMiddleware, uploadAffiliateDocumentController);

export default router;
