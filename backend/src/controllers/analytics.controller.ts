import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { analyticsQuerySchema } from '../validators/analytics.validator';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';

export const getComprehensiveAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const query = analyticsQuerySchema.parse(req.query);
  const data = await analyticsService.getComprehensiveAnalytics(query);
  return ApiResponse.success(res, 'Analytics calculated successfully', data);
});

export const getFinancialAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const query = analyticsQuerySchema.parse(req.query);
  const data = await analyticsService.getComprehensiveAnalytics(query);
  return ApiResponse.success(res, 'Financial analytics calculated successfully', data.financials);
});

export const getSalesAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const query = analyticsQuerySchema.parse(req.query);
  const data = await analyticsService.getComprehensiveAnalytics(query);
  return ApiResponse.success(res, 'Sales analytics calculated successfully', data.sales);
});

export const getProductAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const query = analyticsQuerySchema.parse(req.query);
  const data = await analyticsService.getComprehensiveAnalytics(query);
  return ApiResponse.success(res, 'Product analytics calculated successfully', data.products);
});

export const getInventoryAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const query = analyticsQuerySchema.parse(req.query);
  const data = await analyticsService.getComprehensiveAnalytics(query);
  return ApiResponse.success(res, 'Inventory analytics calculated successfully', data.inventory);
});

export const getCustomerAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const query = analyticsQuerySchema.parse(req.query);
  const data = await analyticsService.getComprehensiveAnalytics(query);
  return ApiResponse.success(res, 'Customer analytics calculated successfully', data.customers);
});
