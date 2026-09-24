import { z } from 'zod';
import { TransactionType } from '@prisma/client';

export const inventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  stockStatus: z.enum(['all', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).default('all'),
  sortBy: z
    .enum(['name', 'sku', 'currentStock', 'reorderLevel', 'purchasePrice', 'sellingPrice', 'stockValue', 'createdAt'])
    .default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type InventoryQueryInput = z.input<typeof inventoryQuerySchema>;
export type InventoryQueryOutput = z.output<typeof inventoryQuerySchema>;

export const inventoryHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  productId: z.string().trim().optional(),
  type: z
    .nativeEnum(TransactionType, {
      errorMap: () => ({
        message: 'Invalid transaction type. Must be PURCHASE, SALE, RETURN, DAMAGE, or ADJUSTMENT',
      }),
    })
    .or(z.literal('all'))
    .default('all'),
  search: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'quantity', 'stockBefore', 'stockAfter']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type InventoryHistoryQueryInput = z.input<typeof inventoryHistoryQuerySchema>;
export type InventoryHistoryQueryOutput = z.output<typeof inventoryHistoryQuerySchema>;

export const inventoryAdjustmentSchema = z
  .object({
    productId: z
      .string({ required_error: 'Product ID is required' })
      .uuid('Invalid product ID format'),
    type: z
      .nativeEnum(TransactionType, {
        errorMap: () => ({
          message: 'Transaction type must be PURCHASE, SALE, RETURN, DAMAGE, or ADJUSTMENT',
        }),
      })
      .default(TransactionType.ADJUSTMENT),
    mode: z.enum(['ADD', 'DEDUCT', 'SET', 'DELTA']).default('DELTA'),
    quantity: z
      .coerce
      .number({ invalid_type_error: 'Quantity must be an integer' })
      .int('Quantity must be an integer')
      .optional(),
    targetStock: z
      .coerce
      .number({ invalid_type_error: 'Target stock must be an integer' })
      .int('Target stock must be an integer')
      .min(0, 'Target stock cannot be negative')
      .optional(),
    reason: z
      .string({ required_error: 'Reason for adjustment is required' })
      .trim()
      .min(3, 'Reason must be at least 3 characters')
      .max(500, 'Reason cannot exceed 500 characters'),
    reference: z
      .string()
      .trim()
      .max(100, 'Reference identifier cannot exceed 100 characters')
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.mode === 'SET') {
        return data.targetStock !== undefined && data.targetStock >= 0;
      }
      return data.quantity !== undefined;
    },
    {
      message: "Either 'quantity' must be provided or 'targetStock' must be provided when mode is SET",
      path: ['quantity'],
    }
  )
  .refine(
    (data) => {
      if ((data.mode === 'ADD' || data.mode === 'DEDUCT') && data.quantity !== undefined) {
        return data.quantity > 0;
      }
      return true;
    },
    {
      message: 'Quantity must be a positive integer when mode is ADD or DEDUCT',
      path: ['quantity'],
    }
  );

export type InventoryAdjustmentInput = z.input<typeof inventoryAdjustmentSchema>;
export type InventoryAdjustmentOutput = z.output<typeof inventoryAdjustmentSchema>;
