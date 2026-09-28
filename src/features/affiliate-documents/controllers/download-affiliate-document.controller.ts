import { asyncHandler } from '../../../middleware/asyncHandler.js';
import type { AuthRequest } from '../../../types/express.types.js';
import { DownloadAffiliateDocumentService } from '../services/download-affiliate-document.service.js';

export const downloadAffiliateDocumentController = asyncHandler(async (req, res) => {
  const documentId = Number(req.params.id);

  if (!Number.isInteger(documentId) || documentId <= 0) {
    throw Object.assign(new Error('ID de documento invalido.'), { status: 400 });
  }

  const { agency_id, id: userId, role } = (req as AuthRequest).user;
  const service = new DownloadAffiliateDocumentService();
  const { buffer, mimeType, originalName } = await service.execute(documentId, agency_id, userId, role);

  res.setHeader('Content-Type', mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
  res.send(buffer);
});
