import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity',
  'Salary',
  'Transport',
  'Marketing',
  'Maintenance',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const createExpenseSchema = z.object({
  category: z
    .string({ required_error: 'Category is required' })
    .trim()
    .refine(
      (val) => EXPENSE_CATEGORIES.some((c) => c.toLowerCase() === val.toLowerCase()),
      {
        message: `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`,
      }
    )
    .transform((val) => {
      const match = EXPENSE_CATEGORIES.find((c) => c.toLowerCase() === val.toLowerCase());
      return match || val;
    }),
  amount: z
    .coerce
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Expense amount must be greater than zero'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(3, 'Description must be at least 3 characters')
    .max(255, 'Description cannot exceed 255 characters'),
  paymentMethod: z
    .nativeEnum(PaymentMethod, {
      errorMap: () => ({
        message: 'Payment method must be CASH, CARD, BANK_TRANSFER, or ONLINE',
      }),
    })
    .default(PaymentMethod.CASH),
  expenseDate: z.string().optional(),
});

export type CreateExpenseInput = z.input<typeof createExpenseSchema>;
export type CreateExpenseOutput = z.output<typeof createExpenseSchema>;

export const updateExpenseSchema = z.object({
  category: z
    .string()
    .trim()
    .refine(
      (val) => EXPENSE_CATEGORIES.some((c) => c.toLowerCase() === val.toLowerCase()),
      {
        message: `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`,
      }
    )
    .transform((val) => {
      const match = EXPENSE_CATEGORIES.find((c) => c.toLowerCase() === val.toLowerCase());
      return match || val;
    })
    .optional(),
  amount: z
    .coerce
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Expense amount must be greater than zero')
    .optional(),
  description: z
    .string()
    .trim()
    .min(3, 'Description must be at least 3 characters')
    .max(255, 'Description cannot exceed 255 characters')
    .optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  expenseDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateExpenseInput = z.input<typeof updateExpenseSchema>;
export type UpdateExpenseOutput = z.output<typeof updateExpenseSchema>;

export const expenseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  category: z.string().trim().default('all'),
  paymentMethod: z.nativeEnum(PaymentMethod).or(z.literal('all')).default('all'),
  status: z.enum(['all', 'active', 'inactive']).default('all'),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  sortBy: z.enum(['expenseDate', 'amount', 'createdAt']).default('expenseDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ExpenseQueryInput = z.input<typeof expenseQuerySchema>;
export type ExpenseQueryOutput = z.output<typeof expenseQuerySchema>;
