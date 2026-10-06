export type ReportType =
  | 'sales'
  | 'purchases'
  | 'inventory'
  | 'customers'
  | 'expenses'
  | 'profit';

export interface BaseReportSummary {
  [key: string]: any;
}

export interface ReportPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// 1. Sales Report
export interface SalesReportItem {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  customerName: string;
  customerCode: string | null;
  cashierName: string;
  itemsCount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: string;
  paymentMethods: string[];
}

export interface SalesReportSummary {
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalTax: number;
  totalDiscounts: number;
  averageOrderValue: number;
}

// 2. Purchases Report
export interface PurchasesReportItem {
  id: string;
  purchaseOrderNumber: string;
  purchaseDate: string;
  supplierName: string;
  supplierCode: string;
  userName: string;
  itemsCount: number;
  totalUnits: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
}

export interface PurchasesReportSummary {
  totalPurchases: number;
  receivedPurchases: number;
  totalSpend: number;
  totalItemsProcured: number;
}

// 3. Inventory Report
export interface InventoryReportItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  stockValue: number;
  retailValue: number;
  potentialProfit: number;
  statusTag: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'OVERSTOCK' | 'IN_STOCK';
}

export interface InventoryReportSummary {
  totalProducts: number;
  totalStockUnits: number;
  totalCostValuation: number;
  totalRetailValuation: number;
  potentialGrossProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  overstockCount: number;
}

// 4. Customers Report
export interface CustomersReportItem {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  creditLimit: number;
  ordersCount: number;
  totalSpent: number;
  averageOrderValue: number;
  lastPurchaseDate: string | null;
  createdAt: string;
}

export interface CustomersReportSummary {
  totalCustomers: number;
  activeBuyersCount: number;
  inactiveCustomersCount: number;
  totalCustomerSpend: number;
  averageSpendPerCustomer: number;
}

// 5. Expenses Report
export interface ExpensesReportItem {
  id: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  userName: string;
}

export interface ExpensesReportSummary {
  totalExpensesCount: number;
  totalExpenseAmount: number;
  categoryBreakdown: Record<string, number>;
}

// 6. Profit & Loss Report
export interface ProfitReportItem {
  date: string;
  label: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
}

export interface ProfitReportSummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
  netMargin: number;
}
