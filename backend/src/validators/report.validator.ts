import { z } from 'zod';
import { SaleStatus, PurchaseStatus, PaymentMethod } from '@prisma/client';

export const baseReportQuerySchema = z.object({
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(20),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  format: z.enum(['json', 'csv']).default('json'),
});

export const salesReportQuerySchema = baseReportQuerySchema.extend({
  status: z.nativeEnum(SaleStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  customerId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

export const purchasesReportQuerySchema = baseReportQuerySchema.extend({
  status: z.nativeEnum(PurchaseStatus).optional(),
  supplierId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

export const inventoryReportQuerySchema = baseReportQuerySchema.extend({
  categoryId: z.string().uuid().optional(),
  stockStatus: z.enum(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK']).default('ALL'),
});

export const customersReportQuerySchema = baseReportQuerySchema.extend({
  activity: z.enum(['ALL', 'ACTIVE', 'INACTIVE']).default('ALL'),
});

export const expensesReportQuerySchema = baseReportQuerySchema.extend({
  category: z.string().trim().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
});

export const profitReportQuerySchema = baseReportQuerySchema.extend({
  groupBy: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
});

export type BaseReportQuery = z.infer<typeof baseReportQuerySchema>;
export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;
export type PurchasesReportQuery = z.infer<typeof purchasesReportQuerySchema>;
export type InventoryReportQuery = z.infer<typeof inventoryReportQuerySchema>;
export type CustomersReportQuery = z.infer<typeof customersReportQuerySchema>;
export type ExpensesReportQuery = z.infer<typeof expensesReportQuerySchema>;
export type ProfitReportQuery = z.infer<typeof profitReportQuerySchema>;
