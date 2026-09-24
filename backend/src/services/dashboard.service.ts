import { PrismaClient, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { DashboardQueryOutput } from '../validators/dashboard.validator';

export interface DateRangeBounds {
  startDate: Date;
  endDate: Date;
  prevStartDate: Date;
  prevEndDate: Date;
  interval: 'hour' | 'day' | 'month';
}

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
  period: string;
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

export class DashboardService {
  constructor(private client: PrismaClient = prisma) {}

  public resolveDateRange(query: DashboardQueryOutput): DateRangeBounds {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;
    let interval: 'hour' | 'day' | 'month' = 'day';

    switch (query.period) {
      case 'today': {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
        prevEndDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        interval = 'hour';
        break;
      }

      case 'this_week': {
        const dayOfWeek = now.getDay();
        const diff = (dayOfWeek + 6) % 7; // Monday = 0
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff, 0, 0, 0, 0);
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        prevEndDate = new Date(startDate.getTime() - 1);
        interval = 'day';
        break;
      }

      case 'this_month': {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        interval = 'day';
        break;
      }

      case 'last_month': {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
        prevEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
        interval = 'day';
        break;
      }

      case 'this_year': {
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        prevStartDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
        prevEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        interval = 'month';
        break;
      }

      case 'custom': {
        const [sYear, sMonth, sDay] = query.startDate!.split('-').map(Number);
        const [eYear, eMonth, eDay] = query.endDate!.split('-').map(Number);
        startDate = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
        endDate = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);

        const durationMs = endDate.getTime() - startDate.getTime();
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getTime() - durationMs);

        const days = durationMs / (24 * 60 * 60 * 1000);
        if (days <= 1) interval = 'hour';
        else if (days > 120) interval = 'month';
        else interval = 'day';
        break;
      }

      default: {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        interval = 'day';
      }
    }

    return { startDate, endDate, prevStartDate, prevEndDate, interval };
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    const change = ((current - previous) / Math.abs(previous)) * 100;
    return Number(change.toFixed(1));
  }

  public async getDashboardData(
    query: DashboardQueryOutput,
    userRole: UserRole = UserRole.ADMIN
  ): Promise<DashboardResponseData> {
    const bounds = this.resolveDateRange(query);
    const canViewFinancials = userRole === UserRole.ADMIN || userRole === UserRole.MANAGER;

    // 1. Fetch Sales for current and previous period
    const currentSales = await this.client.sale.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: bounds.startDate,
          lte: bounds.endDate,
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        customer: true,
        user: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const previousSales = await this.client.sale.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: bounds.prevStartDate,
          lte: bounds.prevEndDate,
        },
      },
      include: {
        items: true,
      },
    });

    // 2. Fetch Expenses for current and previous period
    const currentExpenses = await this.client.expense.findMany({
      where: {
        isActive: true,
        expenseDate: {
          gte: bounds.startDate,
          lte: bounds.endDate,
        },
      },
    });

    const previousExpenses = await this.client.expense.findMany({
      where: {
        isActive: true,
        expenseDate: {
          gte: bounds.prevStartDate,
          lte: bounds.prevEndDate,
        },
      },
    });

    // 3. Compute Current Period Financials
    const totalRevenue = currentSales.reduce((acc, s) => acc + Number(s.totalAmount), 0);
    const cogs = currentSales.reduce((acc, s) => {
      const saleCogs = s.items.reduce((itemSum, item) => {
        const cost = Number(item.unitCost) > 0 ? Number(item.unitCost) : 0;
        return itemSum + cost * item.quantity;
      }, 0);
      return acc + saleCogs;
    }, 0);

    const grossProfit = totalRevenue - cogs;
    const totalExpenses = currentExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const netProfit = grossProfit - totalExpenses;
    const totalOrders = currentSales.length;

    // 4. Compute Previous Period Financials
    const prevRevenue = previousSales.reduce((acc, s) => acc + Number(s.totalAmount), 0);
    const prevCogs = previousSales.reduce((acc, s) => {
      const saleCogs = s.items.reduce((itemSum, item) => {
        const cost = Number(item.unitCost) > 0 ? Number(item.unitCost) : 0;
        return itemSum + cost * item.quantity;
      }, 0);
      return acc + saleCogs;
    }, 0);

    const prevGrossProfit = prevRevenue - prevCogs;
    const prevExpenses = previousExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const prevNetProfit = prevGrossProfit - prevExpenses;
    const prevOrders = previousSales.length;

    // 5. Global Inventory & Store Counters
    const totalCustomers = await this.client.customer.count();
    const activeProducts = await this.client.product.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        purchasePrice: true,
        currentStock: true,
        reorderLevel: true,
        name: true,
        sku: true,
        unit: true,
        category: {
          select: { name: true },
        },
      },
    });

    const totalProducts = activeProducts.length;
    const inventoryValue = activeProducts.reduce((acc, p) => {
      return acc + Number(p.purchasePrice) * p.currentStock;
    }, 0);

    // 6. Build KPI Cards Summary
    const kpis: DashboardKPISummary = {
      totalRevenue: {
        value: Number(totalRevenue.toFixed(2)),
        previousValue: Number(prevRevenue.toFixed(2)),
        percentageChange: this.calculatePercentageChange(totalRevenue, prevRevenue),
        formattedValue: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
      grossProfit: {
        value: Number(grossProfit.toFixed(2)),
        previousValue: Number(prevGrossProfit.toFixed(2)),
        percentageChange: this.calculatePercentageChange(grossProfit, prevGrossProfit),
        formattedValue: `$${grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
      netProfit: {
        value: Number(netProfit.toFixed(2)),
        previousValue: Number(prevNetProfit.toFixed(2)),
        percentageChange: this.calculatePercentageChange(netProfit, prevNetProfit),
        formattedValue: `$${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
      totalOrders: {
        value: totalOrders,
        previousValue: prevOrders,
        percentageChange: this.calculatePercentageChange(totalOrders, prevOrders),
        formattedValue: totalOrders.toLocaleString(),
      },
      totalCustomers: {
        value: totalCustomers,
        formattedValue: totalCustomers.toLocaleString(),
      },
      totalProducts: {
        value: totalProducts,
        formattedValue: totalProducts.toLocaleString(),
      },
      inventoryValue: {
        value: Number(inventoryValue.toFixed(2)),
        formattedValue: `$${inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
      totalExpenses: {
        value: Number(totalExpenses.toFixed(2)),
        previousValue: Number(prevExpenses.toFixed(2)),
        percentageChange: this.calculatePercentageChange(totalExpenses, prevExpenses),
        formattedValue: `$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    };

    // 7. Chart 1: Sales Trend & Chart 2: Revenue vs Profit (Time Series)
    const timeBucketsMap = new Map<
      string,
      {
        date: string;
        timestamp: string;
        revenue: number;
        orders: number;
        cogs: number;
        expenses: number;
      }
    >();

    // Generate continuous date/time labels
    if (bounds.interval === 'hour') {
      for (let h = 0; h < 24; h++) {
        const key = `${h.toString().padStart(2, '0')}:00`;
        timeBucketsMap.set(key, {
          date: key,
          timestamp: key,
          revenue: 0,
          orders: 0,
          cogs: 0,
          expenses: 0,
        });
      }
    } else if (bounds.interval === 'day') {
      const cur = new Date(bounds.startDate);
      while (cur <= bounds.endDate) {
        const key = cur.toISOString().split('T')[0];
        const dateLabel = cur.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        timeBucketsMap.set(key, {
          date: dateLabel,
          timestamp: key,
          revenue: 0,
          orders: 0,
          cogs: 0,
          expenses: 0,
        });
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      // Month
      for (let m = 0; m < 12; m++) {
        const monthDate = new Date(bounds.startDate.getFullYear(), m, 1);
        const key = `${bounds.startDate.getFullYear()}-${(m + 1).toString().padStart(2, '0')}`;
        const dateLabel = monthDate.toLocaleDateString(undefined, { month: 'short' });
        timeBucketsMap.set(key, {
          date: dateLabel,
          timestamp: key,
          revenue: 0,
          orders: 0,
          cogs: 0,
          expenses: 0,
        });
      }
    }

    // Populate sales into buckets
    for (const sale of currentSales) {
      const d = new Date(sale.createdAt);
      let key = '';
      if (bounds.interval === 'hour') {
        key = `${d.getHours().toString().padStart(2, '0')}:00`;
      } else if (bounds.interval === 'day') {
        key = d.toISOString().split('T')[0];
      } else {
        key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      }

      let bucket = timeBucketsMap.get(key);
      if (!bucket) {
        bucket = {
          date: key,
          timestamp: key,
          revenue: 0,
          orders: 0,
          cogs: 0,
          expenses: 0,
        };
        timeBucketsMap.set(key, bucket);
      }

      bucket.revenue += Number(sale.totalAmount);
      bucket.orders += 1;
      const saleCogs = sale.items.reduce((sum, item) => {
        const cost = Number(item.unitCost) > 0 ? Number(item.unitCost) : 0;
        return sum + cost * item.quantity;
      }, 0);
      bucket.cogs += saleCogs;
    }

    // Populate expenses into buckets
    for (const exp of currentExpenses) {
      const d = new Date(exp.expenseDate);
      let key = '';
      if (bounds.interval === 'hour') {
        key = `${d.getHours().toString().padStart(2, '0')}:00`;
      } else if (bounds.interval === 'day') {
        key = d.toISOString().split('T')[0];
      } else {
        key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      }

      const bucket = timeBucketsMap.get(key);
      if (bucket) {
        bucket.expenses += Number(exp.amount);
      }
    }

    const salesTrend: SalesTrendDataPoint[] = [];
    const revenueVsProfit: RevenueProfitDataPoint[] = [];

    timeBucketsMap.forEach((b) => {
      const rev = Number(b.revenue.toFixed(2));
      const gross = Number((rev - b.cogs).toFixed(2));
      const exp = Number(b.expenses.toFixed(2));
      const net = Number((gross - exp).toFixed(2));

      salesTrend.push({
        date: b.date,
        timestamp: b.timestamp,
        revenue: rev,
        orders: b.orders,
      });

      revenueVsProfit.push({
        date: b.date,
        revenue: rev,
        grossProfit: gross,
        expenses: exp,
        netProfit: net,
      });
    });

    // 8. Chart 3: Sales by Category
    const categoryMap = new Map<string, { revenue: number; unitsSold: number }>();
    for (const sale of currentSales) {
      for (const item of sale.items) {
        const catName = item.product?.category?.name || 'Uncategorized';
        const existing = categoryMap.get(catName) || { revenue: 0, unitsSold: 0 };
        existing.revenue += Number(item.subtotal);
        existing.unitsSold += item.quantity;
        categoryMap.set(catName, existing);
      }
    }

    const salesByCategory: CategorySalesDataPoint[] = [];
    categoryMap.forEach((val, cat) => {
      const pct = totalRevenue > 0 ? (val.revenue / totalRevenue) * 100 : 0;
      salesByCategory.push({
        category: cat,
        revenue: Number(val.revenue.toFixed(2)),
        unitsSold: val.unitsSold,
        percentage: Number(pct.toFixed(1)),
      });
    });
    salesByCategory.sort((a, b) => b.revenue - a.revenue);

    // 9. Chart 4: Top Selling Products
    const productSalesMap = new Map<
      string,
      {
        name: string;
        sku: string;
        category: string;
        unitsSold: number;
        revenue: number;
        cost: number;
      }
    >();

    for (const sale of currentSales) {
      for (const item of sale.items) {
        const pId = item.productId;
        const existing = productSalesMap.get(pId) || {
          name: item.product?.name || 'Unknown Product',
          sku: item.product?.sku || 'N/A',
          category: item.product?.category?.name || 'General',
          unitsSold: 0,
          revenue: 0,
          cost: 0,
        };

        existing.unitsSold += item.quantity;
        existing.revenue += Number(item.subtotal);
        const unitCost = Number(item.unitCost) > 0 ? Number(item.unitCost) : 0;
        existing.cost += unitCost * item.quantity;
        productSalesMap.set(pId, existing);
      }
    }

    const topSellingProducts: TopProductDataPoint[] = [];
    productSalesMap.forEach((val, pId) => {
      const profit = val.revenue - val.cost;
      topSellingProducts.push({
        productId: pId,
        name: val.name,
        sku: val.sku,
        category: val.category,
        unitsSold: val.unitsSold,
        revenue: Number(val.revenue.toFixed(2)),
        profit: Number(profit.toFixed(2)),
      });
    });
    topSellingProducts.sort((a, b) => b.revenue - a.revenue);
    const topProducts = topSellingProducts.slice(0, 5);

    // 10. Chart 5 / Alert: Low-Stock Products
    const lowStockCandidates = activeProducts
      .filter((p) => p.currentStock <= p.reorderLevel)
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 6);

    const lowStockProducts: LowStockAlertItem[] = lowStockCandidates.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category?.name || 'General',
      currentStock: p.currentStock,
      reorderLevel: p.reorderLevel,
      deficit: Math.max(p.reorderLevel - p.currentStock, 0),
      status: p.currentStock <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
      unit: p.unit || 'pcs',
    }));

    // 11. Chart 6 / Feed: Recent Sales
    const recentSales: RecentSaleItem[] = currentSales.slice(0, 8).map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      customerName: s.customer?.name || 'Walk-in Customer',
      totalAmount: Number(Number(s.totalAmount).toFixed(2)),
      paymentMethod: (s.payments && s.payments[0]?.paymentMethod) ? s.payments[0].paymentMethod : 'CASH',
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      cashierName: s.user?.name || 'Cashier',
      itemCount: s.items ? s.items.length : 0,
    }));

    return {
      period: query.period,
      dateRange: {
        startDate: bounds.startDate.toISOString(),
        endDate: bounds.endDate.toISOString(),
      },
      kpis,
      charts: {
        salesTrend,
        revenueVsProfit,
        salesByCategory,
        topSellingProducts: topProducts,
        lowStockProducts,
        recentSales,
      },
      permissions: {
        userRole,
        canViewFinancials,
      },
    };
  }
}

export const dashboardService = new DashboardService();
