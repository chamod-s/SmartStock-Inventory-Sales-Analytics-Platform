import { Request, Response } from 'express';
import { healthService } from '../services/health.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';

export const getHealthDiagnostics = asyncHandler(
  async (_req: Request, res: Response) => {
    const healthData = await healthService.getHealthDiagnostics();
    return ApiResponse.success(
      res,
      'SmartStock API is healthy and operational',
      healthData
    );
  }
);
