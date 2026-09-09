import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryQuerySchema,
} from '../validators/category.validator';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const query = categoryQuerySchema.parse(req.query);
  const result = await categoryService.listCategories(query);
  return ApiResponse.success(res, 'Categories retrieved successfully', result);
});

export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const category = await categoryService.getCategoryById(id);
  return ApiResponse.success(res, 'Category retrieved successfully', category);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const validatedInput = createCategorySchema.parse(req.body);
  const category = await categoryService.createCategory(validatedInput);
  return ApiResponse.created(res, 'Category created successfully', category);
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedInput = updateCategorySchema.parse(req.body);
  const category = await categoryService.updateCategory(id, validatedInput);
  return ApiResponse.success(res, 'Category updated successfully', category);
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await categoryService.deleteCategory(id);
  return ApiResponse.success(res, 'Category deleted successfully', result);
});
