import { PaymentMethod } from './sale';

export type ExpenseCategory =
  | 'Rent'
  | 'Electricity'
  | 'Salary'
  | 'Transport'
  | 'Marketing'
  | 'Maintenance'
  | 'Other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Rent',
  'Electricity',
  'Salary',
  'Transport',
  'Marketing',
  'Maintenance',
  'Other',
];

export interface ExpenseUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ExpenseItem {
  id: string;
  userId: string;
  category: ExpenseCategory | string;
  amount: number;
  description: string;
  paymentMethod: PaymentMethod;
  isActive: boolean;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
  user?: ExpenseUser;
}

export interface ExpenseSummary {
  totalCount: number;
  totalAmount: number;
  categoryBreakdown: {
    rent: number;
    electricity: number;
    salary: number;
    transport: number;
    marketing: number;
    maintenance: number;
    other: number;
  };
  methodBreakdown: {
    cash: number;
    card: number;
    bankTransfer: number;
    online: number;
  };
}

export interface CreateExpensePayload {
  category: ExpenseCategory;
  amount: number;
  description: string;
  paymentMethod?: PaymentMethod;
  expenseDate?: string;
  isActive?: boolean;
}

export interface UpdateExpensePayload {
  category?: ExpenseCategory;
  amount?: number;
  description?: string;
  paymentMethod?: PaymentMethod;
  expenseDate?: string;
  isActive?: boolean;
}

export interface ExpensePaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ExpenseListResponse {
  items: ExpenseItem[];
  pagination: ExpensePaginationMeta;
  summary: ExpenseSummary;
}
