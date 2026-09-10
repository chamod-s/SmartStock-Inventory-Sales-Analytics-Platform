import { Request, Response } from 'express';
import { productService } from '../services/product.service';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '../validators/product.validator';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = productQuerySchema.parse(req.query);
  const result = await productService.listProducts(query);
  return ApiResponse.success(res, 'Products retrieved successfully', result);
});

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = await productService.getProductById(id);
  return ApiResponse.success(res, 'Product retrieved successfully', product);
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const validatedInput = createProductSchema.parse(req.body);
  const product = await productService.createProduct(validatedInput);
  return ApiResponse.created(res, 'Product created successfully', product);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedInput = updateProductSchema.parse(req.body);
  const product = await productService.updateProduct(id, validatedInput);
  return ApiResponse.success(res, 'Product updated successfully', product);
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await productService.deleteProduct(id);
  return ApiResponse.success(res, 'Product deleted successfully', result);
});
