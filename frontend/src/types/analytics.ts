export type AnalyticsPeriod =
  | 'today'
  | '7d'
  | '30d'
  | '90d'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'all_time'
  | 'custom';

export interface FinancialAnalytics {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
  netMargin: number;
  formatted: {
    revenue: string;
    cogs: string;
    grossProfit: string;
    expenses: string;
    netProfit: string;
    profitMargin: string;
    netMargin: string;
  };
}

export interface SalesAnalytics {
  revenue: number;
  orders: number;
  averageOrderValue: number;
  salesGrowth: number;
  orderGrowth: number;
  dailySales: Array<{ date: string; label: string; revenue: number; orders: number; aov: number }>;
  weeklySales: Array<{ week: string; label: string; revenue: number; orders: number }>;
  monthlySales: Array<{ month: string; label: string; revenue: number; orders: number }>;
  yearlySales: Array<{ year: string; label: string; revenue: number; orders: number }>;
}

export interface ProductAnalyticsItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  reorderLevel: number;
  unitsSold: number;
  revenue: number;
  cogs: number;
  profit: number;
  profitMargin: number;
}

export interface ProductAnalytics {
  bestSellers: ProductAnalyticsItem[];
  slowMoving: ProductAnalyticsItem[];
  mostProfitable: ProductAnalyticsItem[];
  leastProfitable: ProductAnalyticsItem[];
  productTrends: Array<{
    date: string;
    [productName: string]: string | number;
  }>;
}

export interface InventoryAnalytics {
  stockValue: number;
  retailValue: number;
  potentialProfit: number;
  totalProducts: number;
  totalUnitsInStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  overstockCount: number;
  deadStockCount: number;
  inventoryTurnoverRatio: number;
  stockMovement: {
    unitsIn: number;
    unitsOut: number;
    netMovement: number;
  };
  deadStockItems: Array<{
    id: string;
    name: string;
    sku: string;
    category: string;
    currentStock: number;
    costValue: number;
    daysWithoutSale: number;
  }>;
  overstockItems: Array<{
    id: string;
    name: string;
    sku: string;
    category: string;
    currentStock: number;
    reorderLevel: number;
    excessUnits: number;
    costValue: number;
  }>;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  repeatCustomerRate: number;
  totalCustomerSpend: number;
  averageCustomerValue: number;
  topCustomers: Array<{
    id: string;
    name: string;
    code: string;
    email: string | null;
    ordersCount: number;
    totalSpent: number;
    averageOrderValue: number;
  }>;
}

export interface ComprehensiveAnalyticsResponse {
  period: AnalyticsPeriod;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  financials: FinancialAnalytics;
  sales: SalesAnalytics;
  products: ProductAnalytics;
  inventory: InventoryAnalytics;
  customers: CustomerAnalytics;
}
