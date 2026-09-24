import { z } from 'zod';
import { PaymentMethod, SaleStatus } from '@prisma/client';

export const createSaleItemSchema = z.object({
  productId: z
    .string({ required_error: 'Product ID is required' })
    .uuid('Invalid product ID format'),
  quantity: z
    .coerce
    .number({ invalid_type_error: 'Quantity must be an integer' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1'),
  unitPrice: z
    .coerce
    .number({ invalid_type_error: 'Unit price must be a number' })
    .min(0, 'Unit price cannot be negative')
    .optional(),
});

export type CreateSaleItemInput = z.input<typeof createSaleItemSchema>;

export const createSaleSchema = z.object({
  customerId: z
    .string()
    .uuid('Invalid customer ID format')
    .optional()
    .nullable()
    .or(z.literal('walk-in'))
    .or(z.literal('')),
  items: z
    .array(createSaleItemSchema, { required_error: 'At least one item is required in cart' })
    .min(1, 'At least one item is required to complete a sale'),
  discountAmount: z
    .coerce
    .number({ invalid_type_error: 'Discount must be a number' })
    .min(0, 'Discount amount cannot be negative')
    .optional()
    .default(0),
  discount: z.coerce.number().min(0).optional(),
  taxAmount: z
    .coerce
    .number({ invalid_type_error: 'Tax must be a number' })
    .min(0, 'Tax amount cannot be negative')
    .optional()
    .default(0),
  tax: z.coerce.number().min(0).optional(),
  paymentMethod: z
    .nativeEnum(PaymentMethod, {
      errorMap: () => ({
        message: 'Payment method must be CASH, CARD, BANK_TRANSFER, or ONLINE',
      }),
    })
    .default(PaymentMethod.CASH),
  amountPaid: z
    .coerce
    .number({ invalid_type_error: 'Amount paid must be a number' })
    .min(0, 'Amount paid cannot be negative')
    .optional(),
  transactionRef: z
    .string()
    .trim()
    .max(100, 'Transaction reference cannot exceed 100 characters')
    .optional()
    .nullable(),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .nullable(),
});

export type CreateSaleInput = z.input<typeof createSaleSchema>;
export type CreateSaleOutput = z.output<typeof createSaleSchema>;

export const saleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  status: z.nativeEnum(SaleStatus).or(z.literal('all')).default('all'),
  paymentMethod: z.nativeEnum(PaymentMethod).or(z.literal('all')).default('all'),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'totalAmount', 'invoiceNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type SaleQueryInput = z.input<typeof saleQuerySchema>;
export type SaleQueryOutput = z.output<typeof saleQuerySchema>;
