import { z } from 'zod';
import { PurchaseStatus } from '@prisma/client';

export const createPurchaseItemSchema = z.object({
  productId: z
    .string({ required_error: 'Product ID is required' })
    .uuid('Invalid product ID format'),
  quantity: z.coerce
    .number({ required_error: 'Quantity is required', invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be an integer')
    .positive('Quantity must be greater than zero'),
  unitCost: z.coerce
    .number({ required_error: 'Unit cost is required', invalid_type_error: 'Unit cost must be a number' })
    .min(0, 'Unit cost cannot be negative'),
  subtotal: z.coerce
    .number()
    .min(0, 'Subtotal cannot be negative')
    .optional(),
});

export const createPurchaseSchema = z.object({
  supplierId: z
    .string({ required_error: 'Supplier ID is required' })
    .uuid('Invalid supplier ID format'),
  purchaseOrderNumber: z
    .string()
    .trim()
    .max(50, 'Purchase order number cannot exceed 50 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Purchase order number must contain only alphanumeric characters, hyphens, and underscores')
    .optional(),
  purchaseDate: z
    .string()
    .or(z.date())
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
  status: z
    .nativeEnum(PurchaseStatus, {
      errorMap: () => ({ message: 'Status must be PENDING, RECEIVED, or CANCELLED' }),
    })
    .optional()
    .default(PurchaseStatus.RECEIVED),
  items: z
    .array(createPurchaseItemSchema, { required_error: 'Items array is required' })
    .min(1, 'At least one product item is required in the purchase order'),
  discount: z.coerce
    .number()
    .min(0, 'Discount cannot be negative')
    .optional()
    .default(0),
  discountAmount: z.coerce
    .number()
    .min(0, 'Discount amount cannot be negative')
    .optional(),
  tax: z.coerce
    .number()
    .min(0, 'Tax cannot be negative')
    .optional()
    .default(0),
  taxAmount: z.coerce
    .number()
    .min(0, 'Tax amount cannot be negative')
    .optional(),
  subtotal: z.coerce
    .number()
    .min(0, 'Subtotal cannot be negative')
    .optional(),
  totalAmount: z.coerce
    .number()
    .min(0, 'Total amount cannot be negative')
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val ? val.trim() : null)),
});

export const updatePurchaseSchema = z.object({
  status: z
    .nativeEnum(PurchaseStatus, {
      errorMap: () => ({ message: 'Status must be PENDING, RECEIVED, or CANCELLED' }),
    })
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val ? val.trim() : null)),
});

export const purchaseQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
  search: z.string().optional(),
  supplierId: z.string().uuid('Invalid supplier ID format').optional(),
  status: z.enum(['all', 'PENDING', 'RECEIVED', 'CANCELLED']).optional().default('all'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'purchaseDate', 'totalAmount', 'purchaseOrderNumber']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreatePurchaseItemInput = z.input<typeof createPurchaseItemSchema>;
export type CreatePurchaseInput = z.input<typeof createPurchaseSchema>;
export type UpdatePurchaseInput = z.input<typeof updatePurchaseSchema>;
export type PurchaseQueryInput = z.infer<typeof purchaseQuerySchema>;
