import { z } from 'zod';

export const createSupplierSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Supplier code must be at least 2 characters')
    .max(30, 'Supplier code cannot exceed 30 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Supplier code must only contain alphanumeric characters, hyphens, and underscores')
    .optional(),
  name: z
    .string({ required_error: 'Supplier name is required' })
    .trim()
    .min(2, 'Supplier name must be at least 2 characters')
    .max(100, 'Supplier name cannot exceed 100 characters'),
  contactPerson: z
    .string()
    .trim()
    .max(100, 'Contact person name cannot exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  email: z
    .string()
    .trim()
    .email('Invalid email address format')
    .max(100, 'Email address cannot exceed 100 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val && val.trim().length > 0 ? val.trim().toLowerCase() : null)),
  phone: z
    .string()
    .trim()
    .min(5, 'Phone number must be at least 5 digits')
    .max(30, 'Phone number cannot exceed 30 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  address: z
    .string()
    .trim()
    .max(500, 'Address cannot exceed 500 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  taxId: z
    .string()
    .trim()
    .max(50, 'Tax ID cannot exceed 50 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val && val.trim().length > 0 ? val.trim().toUpperCase() : null)),
  isActive: z
    .boolean()
    .optional()
    .default(true),
});

export const updateSupplierSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Supplier code must be at least 2 characters')
    .max(30, 'Supplier code cannot exceed 30 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Supplier code must only contain alphanumeric characters, hyphens, and underscores')
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, 'Supplier name must be at least 2 characters')
    .max(100, 'Supplier name cannot exceed 100 characters')
    .optional(),
  contactPerson: z
    .string()
    .trim()
    .max(100, 'Contact person name cannot exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val ? val.trim() : null)),
  email: z
    .string()
    .trim()
    .email('Invalid email address format')
    .max(100, 'Email address cannot exceed 100 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) =>
      val === undefined ? undefined : val && val.trim().length > 0 ? val.trim().toLowerCase() : null
    ),
  phone: z
    .string()
    .trim()
    .min(5, 'Phone number must be at least 5 digits')
    .max(30, 'Phone number cannot exceed 30 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) =>
      val === undefined ? undefined : val && val.trim().length > 0 ? val.trim() : null
    ),
  address: z
    .string()
    .trim()
    .max(500, 'Address cannot exceed 500 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) =>
      val === undefined ? undefined : val && val.trim().length > 0 ? val.trim() : null
    ),
  taxId: z
    .string()
    .trim()
    .max(50, 'Tax ID cannot exceed 50 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) =>
      val === undefined ? undefined : val && val.trim().length > 0 ? val.trim().toUpperCase() : null
    ),
  isActive: z
    .boolean()
    .optional(),
});

export const supplierQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 10)),
  search: z.string().optional(),
  status: z.enum(['all', 'ACTIVE', 'INACTIVE']).optional().default('all'),
  sortBy: z
    .enum(['name', 'code', 'createdAt', 'totalPurchases', 'totalPurchaseAmount'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateSupplierInput = z.input<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.input<typeof updateSupplierSchema>;
export type SupplierQueryInput = z.infer<typeof supplierQuerySchema>;
