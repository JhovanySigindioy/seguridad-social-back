import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AffiliateAuthRequest } from '../../../types/affiliate-request.types.js';
import { DownloadAffiliatePortalDocumentService } from '../services/download-affiliate-document.service.js';

const service = new DownloadAffiliatePortalDocumentService();

export const downloadAffiliateDocumentController = asyncHandler(async (req, res) => {
  const documentId = Number(req.params.id);

  if (!Number.isInteger(documentId) || documentId <= 0) {
    throw Object.assign(new Error('ID de documento invalido.'), { status: 400 });
  }

  const { client_id, agency_id } = (req as AffiliateAuthRequest).affiliate;
  const { buffer, mimeType, originalName } = await service.execute(documentId, client_id, agency_id);

  res.setHeader('Content-Type', mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
  res.send(buffer);
});
