import { Request, Response } from 'express';
import { inventoryService } from '../services/inventory.service';
import {
  inventoryQuerySchema,
  inventoryHistoryQuerySchema,
  inventoryAdjustmentSchema,
} from '../validators/inventory.validator';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';

export const getInventory = asyncHandler(async (req: Request, res: Response) => {
  const query = inventoryQuerySchema.parse(req.query);
  const result = await inventoryService.listInventory(query);
  return ApiResponse.success(res, 'Inventory items retrieved successfully', result);
});

export const getInventoryHistory = asyncHandler(async (req: Request, res: Response) => {
  const query = inventoryHistoryQuerySchema.parse(req.query);
  const result = await inventoryService.listHistory(query);
  return ApiResponse.success(res, 'Inventory audit history retrieved successfully', result);
});

export const adjustInventory = asyncHandler(async (req: Request, res: Response) => {
  const validatedInput = inventoryAdjustmentSchema.parse(req.body);
  const userId = req.user?.id || '';
  const result = await inventoryService.adjustStock(validatedInput, userId);
  return ApiResponse.success(res, 'Inventory stock adjustment recorded successfully', result);
});

export const getInventorySummary = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await inventoryService.getSummary();
  return ApiResponse.success(res, 'Inventory summary metrics retrieved successfully', summary);
});

export const getLowStockAlerts = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Math.min(100, Math.max(1, Number(req.query.limit))) : 50;
  const alerts = await inventoryService.getLowStockAlerts(limit);
  return ApiResponse.success(res, 'Low-stock alerts retrieved successfully', alerts);
});
