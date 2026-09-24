export type DashboardPeriod =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export interface KPICardData {
  value: number;
  previousValue: number;
  percentageChange: number;
  formattedValue: string;
}

export interface DashboardKPISummary {
  totalRevenue: KPICardData;
  grossProfit: KPICardData;
  netProfit: KPICardData;
  totalOrders: KPICardData;
  totalCustomers: { value: number; formattedValue: string };
  totalProducts: { value: number; formattedValue: string };
  inventoryValue: { value: number; formattedValue: string };
  totalExpenses: KPICardData;
}

export interface SalesTrendDataPoint {
  date: string;
  timestamp: string;
  revenue: number;
  orders: number;
}

export interface RevenueProfitDataPoint {
  date: string;
  revenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

export interface CategorySalesDataPoint {
  category: string;
  revenue: number;
  unitsSold: number;
  percentage: number;
}

export interface TopProductDataPoint {
  productId: string;
  name: string;
  sku: string;
  category: string;
  unitsSold: number;
  revenue: number;
  profit: number;
}

export interface LowStockAlertItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  reorderLevel: number;
  deficit: number;
  status: 'OUT_OF_STOCK' | 'LOW_STOCK';
  unit: string;
}

export interface RecentSaleItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  cashierName: string;
  itemCount: number;
}

export interface DashboardResponseData {
  period: DashboardPeriod;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  kpis: DashboardKPISummary;
  charts: {
    salesTrend: SalesTrendDataPoint[];
    revenueVsProfit: RevenueProfitDataPoint[];
    salesByCategory: CategorySalesDataPoint[];
    topSellingProducts: TopProductDataPoint[];
    lowStockProducts: LowStockAlertItem[];
    recentSales: RecentSaleItem[];
  };
  permissions: {
    userRole: string;
    canViewFinancials: boolean;
  };
}
