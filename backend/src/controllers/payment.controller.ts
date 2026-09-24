import { Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { createPaymentSchema, paymentQuerySchema } from '../validators/payment.validator';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/asyncHandler';

export const getPayments = asyncHandler(async (req: Request, res: Response) => {
  const query = paymentQuerySchema.parse(req.query);
  const result = await paymentService.listPayments(query);
  return ApiResponse.success(res, 'Payments retrieved successfully', result);
});

export const getPaymentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payment = await paymentService.getPaymentById(id);
  return ApiResponse.success(res, 'Payment details retrieved successfully', payment);
});

export const getPaymentsBySale = asyncHandler(async (req: Request, res: Response) => {
  const { saleId } = req.params;
  const payments = await paymentService.getPaymentsBySaleId(saleId);
  return ApiResponse.success(res, 'Sale payments retrieved successfully', payments);
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const validatedInput = createPaymentSchema.parse(req.body);
  const result = await paymentService.recordPayment(validatedInput);
  return ApiResponse.created(res, 'Payment recorded successfully', result);
});

export const getPaymentSummary = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await paymentService.getSummary();
  return ApiResponse.success(res, 'Payments summary retrieved successfully', summary);
});
