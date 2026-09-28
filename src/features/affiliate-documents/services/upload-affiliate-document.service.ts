import { createHash, randomUUID } from 'crypto';
import db from '../../../config/database.js';
import { storageService } from '../../../shared/storage/storage.service.js';
import { buildAffiliateDocumentSelect, buildAffiliateDocumentStorageKey, buildOfficeScope, mapAffiliateDocumentRow, assertCanWriteDocuments } from './affiliate-document.helpers.js';
import type { UploadAffiliateDocumentDTO } from '../types/affiliate-document.types.js';

interface UploadAffiliateDocumentInput {
  agencyId: number;
  userId: number;
  role: string;
  payload: UploadAffiliateDocumentDTO;
  file: Express.Multer.File;
}

export class UploadAffiliateDocumentService {
  async execute({ agencyId, userId, role, payload, file }: UploadAffiliateDocumentInput) {
    assertCanWriteDocuments(role);

    const officeScope = buildOfficeScope(role, userId, 'c.office_id');
    const clientParams: Array<number | string> = [payload.client_id, agencyId, ...officeScope.params];
    const [clientRows]: any = await db.query(
      `SELECT c.id, c.office_id
       FROM clients c
       INNER JOIN offices o ON o.id = c.office_id
       WHERE c.id = ? AND o.agency_id = ?${officeScope.condition}
       LIMIT 1`,
      clientParams
    );

    if (!clientRows.length) {
      throw Object.assign(new Error('Cliente no encontrado o fuera del alcance del usuario.'), { status: 404 });
    }

    if (payload.affiliation_id) {
      const affiliationParams: Array<number | string> = [payload.affiliation_id, payload.client_id, agencyId, ...officeScope.params];
      const [affiliationRows]: any = await db.query(
        `SELECT a.id
         FROM affiliations a
         INNER JOIN client_employers ce ON ce.id = a.client_employer_id
         INNER JOIN companies co ON co.id = ce.company_id
         INNER JOIN clients c ON c.id = ce.client_id
         WHERE a.id = ? AND ce.client_id = ? AND co.agency_id = ?${officeScope.condition}
         LIMIT 1`,
        affiliationParams
      );

      if (!affiliationRows.length) {
        throw Object.assign(new Error('La afiliacion indicada no pertenece al cliente seleccionado.'), { status: 404 });
      }
    }

    let resolvedAffiliationId = payload.affiliation_id ?? null;

    if (payload.monthly_payment_id) {
      const paymentParams: Array<number | string> = [payload.monthly_payment_id, payload.client_id, agencyId, ...officeScope.params];
      const [paymentRows]: any = await db.query(
        `SELECT mp.id, mp.affiliation_id
         FROM monthly_payments mp
         INNER JOIN affiliations a ON a.id = mp.affiliation_id
         INNER JOIN client_employers ce ON ce.id = a.client_employer_id
         INNER JOIN companies co ON co.id = ce.company_id
         INNER JOIN clients c ON c.id = ce.client_id
         WHERE mp.id = ? AND ce.client_id = ? AND co.agency_id = ?${officeScope.condition}
         LIMIT 1`,
        paymentParams
      );

      if (!paymentRows.length) {
        throw Object.assign(new Error('El pago mensual indicado no pertenece al cliente seleccionado.'), { status: 404 });
      }

      const paymentAffiliationId = Number(paymentRows[0].affiliation_id);

      if (resolvedAffiliationId && resolvedAffiliationId !== paymentAffiliationId) {
        throw Object.assign(new Error('La afiliacion y el pago mensual no coinciden entre si.'), { status: 400 });
      }

      resolvedAffiliationId = paymentAffiliationId;
    }

    const uniqueSuffix = `${Date.now()}-${randomUUID()}`;
    const storageKey = buildAffiliateDocumentStorageKey({
      agencyId,
      clientId: payload.client_id,
      originalName: file.originalname,
      uniqueSuffix,
      ...(resolvedAffiliationId ? { affiliationId: resolvedAffiliationId } : {}),
      ...(payload.monthly_payment_id ? { monthlyPaymentId: payload.monthly_payment_id } : {}),
      ...(payload.display_name ? { displayName: payload.display_name } : {}),
    });
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const displayName = payload.display_name?.trim() || file.originalname;
    const source = role === 'admin' ? 'admin' : 'office_manager';

    await storageService.provider.putObject({
      key: storageKey,
      body: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
      metadata: {
        agencyId: String(agencyId),
        clientId: String(payload.client_id),
        affiliationId: resolvedAffiliationId ? String(resolvedAffiliationId) : 'none',
        monthlyPaymentId: payload.monthly_payment_id ? String(payload.monthly_payment_id) : 'none',
        documentType: payload.document_type,
      },
    });

    let result: any;
    try {
      [result] = await db.query(
        `INSERT INTO affiliate_documents (
           agency_id, client_id, affiliation_id, monthly_payment_id, uploaded_by_user_id,
           document_type, display_name, source, original_name, storage_key,
           mime_type, size_bytes, sha256, is_visible_to_affiliate
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          agencyId,
          payload.client_id,
          resolvedAffiliationId,
          payload.monthly_payment_id ?? null,
          userId,
          payload.document_type,
          displayName,
          source,
          file.originalname,
          storageKey,
          file.mimetype || 'application/octet-stream',
          file.size,
          sha256,
          payload.is_visible_to_affiliate ? 1 : 0,
        ]
      );
    } catch (error) {
      await storageService.provider.deleteObject(storageKey).catch(() => undefined);
      throw error;
    }

    const [rows]: any = await db.query(
      `${buildAffiliateDocumentSelect()}
       WHERE d.id = ? AND d.agency_id = ?
       LIMIT 1`,
      [result.insertId, agencyId]
    );

    return mapAffiliateDocumentRow(rows[0]);
  }
}
