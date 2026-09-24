import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { dashboardQuerySchema } from '../validators/dashboard.validator';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';
import { UserRole } from '@prisma/client';

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const query = dashboardQuerySchema.parse(req.query);
  const userRole = (req.user?.role as UserRole) || UserRole.ADMIN;
  const data = await dashboardService.getDashboardData(query, userRole);
  return ApiResponse.success(res, 'Dashboard statistics retrieved successfully', data);
});
