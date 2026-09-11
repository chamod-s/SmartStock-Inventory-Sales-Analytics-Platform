import { Request, Response } from 'express';
import { customerService } from '../services/customer.service';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
} from '../validators/customer.validator';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';

export const getCustomers = asyncHandler(async (req: Request, res: Response) => {
  const query = customerQuerySchema.parse(req.query);
  const result = await customerService.listCustomers(query);
  return ApiResponse.success(res, 'Customers retrieved successfully', result);
});

export const getWalkInCustomer = asyncHandler(async (_req: Request, res: Response) => {
  const customer = await customerService.getWalkInCustomer();
  return ApiResponse.success(res, 'Walk-in customer retrieved successfully', customer);
});

export const getCustomerById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const customer = await customerService.getCustomerById(id);
  return ApiResponse.success(res, 'Customer profile retrieved successfully', customer);
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const validatedInput = createCustomerSchema.parse(req.body);
  const customer = await customerService.createCustomer(validatedInput);
  return ApiResponse.created(res, 'Customer created successfully', customer);
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedInput = updateCustomerSchema.parse(req.body);
  const customer = await customerService.updateCustomer(id, validatedInput);
  return ApiResponse.success(res, 'Customer updated successfully', customer);
});

export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await customerService.deleteCustomer(id);
  return ApiResponse.success(res, 'Customer deleted successfully', result);
});
