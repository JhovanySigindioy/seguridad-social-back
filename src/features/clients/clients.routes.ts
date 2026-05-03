import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { getClientsController } from './controllers/get-clients.controller.js';
import { createClientController } from './controllers/create-client.controller.js';
import { updateClientController } from './controllers/update-client.controller.js';
import { deleteClientController } from './controllers/delete-client.controller.js';
import { getDocumentTypesController } from './controllers/get-document-types.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/document-types', getDocumentTypesController);
router.get('/', getClientsController);
router.post('/', createClientController);
router.put('/:id', updateClientController);
router.delete('/:id', deleteClientController);

export default router;
