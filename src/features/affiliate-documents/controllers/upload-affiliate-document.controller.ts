import { z } from 'zod';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AuthRequest } from '../../../types/express.types.js';
import { UploadAffiliateDocumentService } from '../services/upload-affiliate-document.service.js';

const optionalNumericField = z.union([z.string(), z.undefined()]).transform((value) => {
  if (!value) {
    return undefined;
  }

  return Number(value);
}).refine((value) => value === undefined || (Number.isInteger(value) && value > 0), {
  message: 'Campo numerico invalido.',
});

const bodySchema = z.object({
  client_id: z.string().transform((value) => Number(value)).refine((value) => Number.isInteger(value) && value > 0, {
    message: 'client_id invalido.',
  }),
  affiliation_id: optionalNumericField,
  monthly_payment_id: optionalNumericField,
  document_type: z.string().trim().min(2).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  display_name: z.string().trim().min(1).max(255).optional(),
  is_visible_to_affiliate: z.union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0'), z.undefined()]).transform((value) => {
    if (value === undefined) {
      return true;
    }

    return value === 'true' || value === '1';
  }),
});

export const uploadAffiliateDocumentController = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw Object.assign(new Error('Debes adjuntar un archivo en el campo "file".'), { status: 400 });
  }

  const { agency_id, id: userId, role } = (req as AuthRequest).user;
  const payload = bodySchema.parse(req.body);
  const service = new UploadAffiliateDocumentService();
  const document = await service.execute({
    agencyId: agency_id,
    userId,
    role,
    payload,
    file: req.file,
  });

  return sendSuccess(res, document, 201);
});
