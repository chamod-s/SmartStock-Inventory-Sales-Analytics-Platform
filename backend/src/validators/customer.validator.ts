import { z } from 'zod';

export const createCustomerSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Customer code must be at least 2 characters')
    .max(30, 'Customer code cannot exceed 30 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Customer code must only contain alphanumeric characters, hyphens, and underscores')
    .optional(),
  name: z
    .string({ required_error: 'Customer name is required' })
    .trim()
    .min(2, 'Customer name must be at least 2 characters')
    .max(100, 'Customer name cannot exceed 100 characters'),
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
  creditLimit: z
    .coerce
    .number({ invalid_type_error: 'Credit limit must be a number' })
    .min(0, 'Credit limit cannot be negative')
    .optional()
    .default(0.0),
});

export const updateCustomerSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Customer code must be at least 2 characters')
    .max(30, 'Customer code cannot exceed 30 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Customer code must only contain alphanumeric characters, hyphens, and underscores')
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, 'Customer name must be at least 2 characters')
    .max(100, 'Customer name cannot exceed 100 characters')
    .optional(),
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
  creditLimit: z
    .coerce
    .number({ invalid_type_error: 'Credit limit must be a number' })
    .min(0, 'Credit limit cannot be negative')
    .optional(),
});

export const customerQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 10)),
  search: z.string().optional(),
  segment: z
    .enum(['all', 'VIP', 'LOYAL', 'NEW', 'AT_RISK', 'OCCASIONAL', 'PROSPECT', 'WALK_IN'])
    .optional()
    .default('all'),
  sortBy: z
    .enum(['name', 'code', 'totalSpent', 'totalOrders', 'creditLimit', 'createdAt', 'lastPurchaseDate'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateCustomerInput = z.input<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
