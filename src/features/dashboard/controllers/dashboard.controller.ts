import type { Response } from 'express';
import type { AuthRequest } from '../../../types/express.types.js';
import { GetDashboardStatsService } from '../services/get-dashboard-stats.service.js';
import { asyncHandler } from '../../../middleware/asyncHandler.js';

const service = new GetDashboardStatsService();

export const getDashboardStatsController = asyncHandler(async (req, res: Response) => {
  const { agency_id, id: userId, role } = (req as AuthRequest).user;
  const officeId = req.query.office_id ? Number(req.query.office_id) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;
  const year = req.query.year ? Number(req.query.year) : undefined;

  const result = await service.execute(agency_id, userId, role, officeId, month, year);
  res.json(result);
});
