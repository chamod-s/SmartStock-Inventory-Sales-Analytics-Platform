import { Request, Response } from 'express';
import { purchaseService } from '../services/purchase.service';
import {
  createPurchaseSchema,
  updatePurchaseSchema,
  purchaseQuerySchema,
} from '../validators/purchase.validator';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';
import { ApiError } from '../utils/apiError';

export const getPurchases = asyncHandler(async (req: Request, res: Response) => {
  const query = purchaseQuerySchema.parse(req.query);
  const result = await purchaseService.listPurchases(query);
  return ApiResponse.success(res, 'Purchases retrieved successfully', result);
});

export const getPurchaseById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const purchase = await purchaseService.getPurchaseById(id);
  return ApiResponse.success(res, 'Purchase retrieved successfully', purchase);
});

export const createPurchase = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }
  const validatedInput = createPurchaseSchema.parse(req.body);
  const purchase = await purchaseService.createPurchase(validatedInput, req.user.id);
  return ApiResponse.created(res, 'Purchase order created successfully', purchase);
});

export const updatePurchase = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }
  const { id } = req.params;
  const validatedInput = updatePurchaseSchema.parse(req.body);
  const purchase = await purchaseService.updatePurchase(id, validatedInput, req.user.id);
  return ApiResponse.success(res, 'Purchase order updated successfully', purchase);
});
