import pool from '../../../config/database.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import type { AuthRequest } from '../../../types/express.types.js';

export const sessionController = asyncHandler(async (req, res) => {
  const { id: userId, role } = (req as AuthRequest).user;
  let officeIds: number[];

  if (role === 'admin') {
    const [rows]: any = await pool.query(
      'SELECT id FROM offices WHERE agency_id = ? AND is_active = 1',
      [(req as AuthRequest).user.agency_id]
    );
    officeIds = rows.map((row: { id: number }) => row.id);
  } else {
    const [rows]: any = await pool.query(
      'SELECT office_id FROM user_offices WHERE user_id = ?',
      [userId]
    );
    officeIds = rows.map((row: { office_id: number }) => row.office_id);
  }

  return sendSuccess(res, {
    user: (req as AuthRequest).user,
    offices: officeIds,
  });
});
