import { Request, Response } from 'express';
import { supplierService } from '../services/supplier.service';
import {
  createSupplierSchema,
  updateSupplierSchema,
  supplierQuerySchema,
} from '../validators/supplier.validator';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';

export const getSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const query = supplierQuerySchema.parse(req.query);
  const result = await supplierService.listSuppliers(query);
  return ApiResponse.success(res, 'Suppliers retrieved successfully', result);
});

export const getSupplierById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const supplier = await supplierService.getSupplierById(id);
  return ApiResponse.success(res, 'Supplier retrieved successfully', supplier);
});

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const validatedInput = createSupplierSchema.parse(req.body);
  const supplier = await supplierService.createSupplier(validatedInput);
  return ApiResponse.created(res, 'Supplier created successfully', supplier);
});

export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedInput = updateSupplierSchema.parse(req.body);
  const supplier = await supplierService.updateSupplier(id, validatedInput);
  return ApiResponse.success(res, 'Supplier updated successfully', supplier);
});

export const deleteSupplier = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await supplierService.deleteSupplier(id);
  return ApiResponse.success(res, 'Supplier deleted successfully', result);
});
