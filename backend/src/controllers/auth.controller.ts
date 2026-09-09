import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';
import { ApiError } from '../utils/apiError';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const validatedInput = registerSchema.parse(req.body);
  const result = await authService.register(validatedInput);
  return ApiResponse.created(res, 'User registered successfully', result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const validatedInput = loginSchema.parse(req.body);
  const result = await authService.login(validatedInput);
  return ApiResponse.success(res, 'Login successful', result);
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  // Stateless JWT logout - clients clear local tokens
  return ApiResponse.success(res, 'Logged out successfully', {});
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }
  const currentUser = await authService.getCurrentUser(req.user.id);
  return ApiResponse.success(res, 'User profile retrieved successfully', currentUser);
});
