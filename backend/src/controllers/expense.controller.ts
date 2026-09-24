import { Request, Response } from 'express';
import { expenseService } from '../services/expense.service';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseQuerySchema,
} from '../validators/expense.validator';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';

export const getExpenses = asyncHandler(async (req: Request, res: Response) => {
  const query = expenseQuerySchema.parse(req.query);
  const result = await expenseService.listExpenses(query);
  return ApiResponse.success(res, 'Expenses retrieved successfully', result);
});

export const getExpenseById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const expense = await expenseService.getExpenseById(id);
  return ApiResponse.success(res, 'Expense details retrieved successfully', expense);
});

export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const validatedInput = createExpenseSchema.parse(req.body);
  const userId = req.user?.id || '';
  const expense = await expenseService.createExpense(validatedInput, userId);
  return ApiResponse.created(res, 'Expense recorded successfully', expense);
});

export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedInput = updateExpenseSchema.parse(req.body);
  const userId = req.user?.id || '';
  const expense = await expenseService.updateExpense(id, validatedInput, userId);
  return ApiResponse.success(res, 'Expense updated successfully', expense);
});

export const deactivateExpense = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id || '';
  const expense = await expenseService.deactivateExpense(id, userId);
  return ApiResponse.success(res, 'Expense deactivated successfully', expense);
});

export const activateExpense = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id || '';
  const expense = await expenseService.activateExpense(id, userId);
  return ApiResponse.success(res, 'Expense reactivated successfully', expense);
});

export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id || '';
  const result = await expenseService.deleteExpense(id, userId);
  return ApiResponse.success(res, 'Expense deleted successfully', result);
});

export const getExpenseSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await expenseService.getSummary(req.query);
  return ApiResponse.success(res, 'Expense summary retrieved successfully', summary);
});
