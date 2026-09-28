import multer from 'multer';
import { env } from '../../../config/env.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const uploadAffiliateDocumentMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_DOCUMENT_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(Object.assign(new Error('Tipo de archivo no permitido. Usa PDF, imagen o documento Word.'), { status: 400 }));
      return;
    }

    callback(null, true);
  },
}).single('file');
