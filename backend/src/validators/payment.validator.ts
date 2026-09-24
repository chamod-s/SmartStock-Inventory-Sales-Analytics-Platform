import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const createPaymentSchema = z.object({
  saleId: z
    .string({ required_error: 'Sale ID is required' })
    .min(1, 'Sale ID is required'),
  amount: z
    .coerce
    .number({ invalid_type_error: 'Payment amount must be a number' })
    .positive('Payment amount must be greater than zero'),
  paymentMethod: z
    .nativeEnum(PaymentMethod, {
      errorMap: () => ({
        message: 'Payment method must be CASH, CARD, BANK_TRANSFER, or ONLINE',
      }),
    })
    .default(PaymentMethod.CASH),
  transactionRef: z
    .string()
    .trim()
    .max(100, 'Transaction reference cannot exceed 100 characters')
    .optional()
    .nullable(),
  paidAt: z.string().optional(),
});

export type CreatePaymentInput = z.input<typeof createPaymentSchema>;
export type CreatePaymentOutput = z.output<typeof createPaymentSchema>;

export const paymentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  saleId: z.string().trim().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).or(z.literal('all')).default('all'),
  search: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  sortBy: z.enum(['paidAt', 'amount']).default('paidAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaymentQueryInput = z.input<typeof paymentQuerySchema>;
export type PaymentQueryOutput = z.output<typeof paymentQuerySchema>;
