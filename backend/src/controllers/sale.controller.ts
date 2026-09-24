import { Request, Response } from 'express';
import { saleService } from '../services/sale.service';
import { createSaleSchema, saleQuerySchema } from '../validators/sale.validator';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';

export const getSales = asyncHandler(async (req: Request, res: Response) => {
  const query = saleQuerySchema.parse(req.query);
  const result = await saleService.listSales(query);
  return ApiResponse.success(res, 'Sales transactions retrieved successfully', result);
});

export const getSaleById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const sale = await saleService.getSaleById(id);
  return ApiResponse.success(res, 'Sale details retrieved successfully', sale);
});

export const createSale = asyncHandler(async (req: Request, res: Response) => {
  const validatedInput = createSaleSchema.parse(req.body);
  const userId = req.user?.id || '';
  const sale = await saleService.createSale(validatedInput, userId);
  return ApiResponse.created(res, 'Sale completed successfully', sale);
});

export const getSaleSummary = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await saleService.getSummary();
  return ApiResponse.success(res, 'Sales summary retrieved successfully', summary);
});

export const getSaleByInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { invoiceNumber } = req.params;
  const sale = await saleService.getSaleByInvoice(invoiceNumber);
  return ApiResponse.success(res, 'Sale invoice retrieved successfully', sale);
});
