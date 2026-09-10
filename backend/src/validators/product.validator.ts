import { z } from 'zod';
import { ProductStatus } from '@prisma/client';

export const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required' })
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(100, 'Product name cannot exceed 100 characters'),
  sku: z
    .string({ required_error: 'SKU is required' })
    .trim()
    .toUpperCase()
    .min(2, 'SKU must be at least 2 characters')
    .max(50, 'SKU cannot exceed 50 characters')
    .regex(/^[A-Z0-9_-]+$/, 'SKU must only contain alphanumeric characters, hyphens, and underscores'),
  categoryId: z
    .string({ required_error: 'Category is required' })
    .uuid('Invalid category ID format'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  purchasePrice: z
    .coerce
    .number({ invalid_type_error: 'Purchase price must be a number' })
    .min(0, 'Purchase price cannot be negative'),
  sellingPrice: z
    .coerce
    .number({ invalid_type_error: 'Selling price must be a number' })
    .min(0, 'Selling price cannot be negative'),
  reorderLevel: z
    .coerce
    .number({ invalid_type_error: 'Reorder level must be an integer' })
    .int('Reorder level must be an integer')
    .min(0, 'Reorder level cannot be negative')
    .optional()
    .default(10),
  unit: z
    .string()
    .trim()
    .max(20, 'Unit cannot exceed 20 characters')
    .optional()
    .default('pcs'),
  status: z
    .nativeEnum(ProductStatus, {
      errorMap: () => ({ message: 'Status must be ACTIVE, INACTIVE, or DISCONTINUED' }),
    })
    .optional()
    .default(ProductStatus.ACTIVE),
});

export const updateProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(100, 'Product name cannot exceed 100 characters')
    .optional(),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'SKU must be at least 2 characters')
    .max(50, 'SKU cannot exceed 50 characters')
    .regex(/^[A-Z0-9_-]+$/, 'SKU must only contain alphanumeric characters, hyphens, and underscores')
    .optional(),
  categoryId: z
    .string()
    .uuid('Invalid category ID format')
    .optional(),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val ? val.trim() : null)),
  purchasePrice: z
    .coerce
    .number({ invalid_type_error: 'Purchase price must be a number' })
    .min(0, 'Purchase price cannot be negative')
    .optional(),
  sellingPrice: z
    .coerce
    .number({ invalid_type_error: 'Selling price must be a number' })
    .min(0, 'Selling price cannot be negative')
    .optional(),
  reorderLevel: z
    .coerce
    .number({ invalid_type_error: 'Reorder level must be an integer' })
    .int('Reorder level must be an integer')
    .min(0, 'Reorder level cannot be negative')
    .optional(),
  unit: z
    .string()
    .trim()
    .max(20, 'Unit cannot exceed 20 characters')
    .optional(),
  status: z
    .nativeEnum(ProductStatus, {
      errorMap: () => ({ message: 'Status must be ACTIVE, INACTIVE, or DISCONTINUED' }),
    })
    .optional(),
});

export const productQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 10)),
  search: z.string().optional(),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(['all', 'ACTIVE', 'INACTIVE', 'DISCONTINUED']).optional().default('all'),
  stockStatus: z.enum(['all', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).optional().default('all'),
  sortBy: z
    .enum(['name', 'sku', 'purchasePrice', 'sellingPrice', 'currentStock', 'reorderLevel', 'createdAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateProductInput = z.input<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
