import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AnalyticsQueryOutput } from '../validators/analytics.validator';

export interface DateRangeBounds {
  startDate: Date;
  endDate: Date;
  prevStartDate: Date;
  prevEndDate: Date;
}

export interface FinancialAnalytics {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  profitMargin: number; // Gross Profit / Revenue * 100
  netMargin: number; // Net Profit / Revenue * 100
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
  salesGrowth: number; // vs previous period %
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
  repeatCustomerRate: number; // %
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
  period: string;
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

export class AnalyticsService {
  constructor(private client: PrismaClient = prisma) {}

  public resolveDateRange(query: AnalyticsQueryOutput): DateRangeBounds {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (query.period) {
      case 'today': {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      }
      case '7d': {
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000 + 1);
        break;
      }
      case '30d': {
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000 + 1);
        break;
      }
      case '90d': {
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000 + 1);
        break;
      }
      case 'this_month': {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      }
      case 'last_month': {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      }
      case 'this_year': {
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      }
      case 'all_time': {
        startDate = new Date(2020, 0, 1, 0, 0, 0, 0);
        endDate = new Date(2099, 11, 31, 23, 59, 59, 999);
        break;
      }
      case 'custom': {
        const [sY, sM, sD] = query.startDate!.split('-').map(Number);
        const [eY, eM, eD] = query.endDate!.split('-').map(Number);
        startDate = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
        endDate = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
        break;
      }
      default: {
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000 + 1);
      }
    }

    const durationMs = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - durationMs);

    return { startDate, endDate, prevStartDate, prevEndDate };
  }

  public safeDivision(numerator: number, denominator: number): number {
    if (!denominator || isNaN(denominator) || denominator === 0) {
      return 0;
    }
    const res = numerator / denominator;
    return isNaN(res) || !isFinite(res) ? 0 : res;
  }

  public calculateGrowth(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    const val = ((current - previous) / Math.abs(previous)) * 100;
    return Number(val.toFixed(1));
  }

  public async getComprehensiveAnalytics(
    query: AnalyticsQueryOutput
  ): Promise<ComprehensiveAnalyticsResponse> {
    const bounds = this.resolveDateRange(query);

    // 1. Fetch Sales for current period
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
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Fetch Sales for previous period (for growth metrics)
    const prevSales = await this.client.sale.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: bounds.prevStartDate,
          lte: bounds.prevEndDate,
        },
      },
      select: {
        totalAmount: true,
      },
    });

    // 3. Fetch Expenses for current period
    const currentExpenses = await this.client.expense.findMany({
      where: {
        isActive: true,
        expenseDate: {
          gte: bounds.startDate,
          lte: bounds.endDate,
        },
      },
    });

    // 4. Fetch Products and Categories
    const allProducts = await this.client.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        category: true,
      },
    });

    // 5. Fetch Customers
    const allCustomers = await this.client.customer.findMany({
      include: {
        sales: {
          where: { status: 'COMPLETED' },
          select: { totalAmount: true, createdAt: true },
        },
      },
    });

    // 6. Fetch Inventory Transactions in period
    const inventoryTransactions = await this.client.inventoryTransaction.findMany({
      where: {
        createdAt: {
          gte: bounds.startDate,
          lte: bounds.endDate,
        },
      },
    });

    // =========================================================
    // SECTION A: Financial Analytics Calculations
    // =========================================================
    const revenue = currentSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

    const cogs = currentSales.reduce((acc, s) => {
      const saleCogs = s.items.reduce((itemSum, item) => {
        const cost = Number(item.unitCost) > 0 ? Number(item.unitCost) : 0;
        return itemSum + cost * item.quantity;
      }, 0);
      return acc + saleCogs;
    }, 0);

    const grossProfit = revenue - cogs;
    const expenses = currentExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = grossProfit - expenses;

    // Profit Margin = (Gross Profit / Revenue) * 100 (Safe Zero Handling!)
    const profitMargin = revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(2)) : 0;
    const netMargin = revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(2)) : 0;

    const financials: FinancialAnalytics = {
      revenue: Number(revenue.toFixed(2)),
      cogs: Number(cogs.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      expenses: Number(expenses.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      profitMargin,
      netMargin,
      formatted: {
        revenue: `$${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        cogs: `$${cogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        grossProfit: `$${grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        expenses: `$${expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        netProfit: `$${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        profitMargin: `${profitMargin}%`,
        netMargin: `${netMargin}%`,
      },
    };

    // =========================================================
    // SECTION B: Sales Analytics Calculations
    // =========================================================
    const orders = currentSales.length;
    const prevRevenue = prevSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const prevOrders = prevSales.length;

    const averageOrderValue = this.safeDivision(revenue, orders);
    const salesGrowth = this.calculateGrowth(revenue, prevRevenue);
    const orderGrowth = this.calculateGrowth(orders, prevOrders);

    // Grouping by Day
    const dailyMap = new Map<string, { label: string; revenue: number; orders: number }>();
    // Grouping by Week (ISO week)
    const weeklyMap = new Map<string, { label: string; revenue: number; orders: number }>();
    // Grouping by Month
    const monthlyMap = new Map<string, { label: string; revenue: number; orders: number }>();
    // Grouping by Year
    const yearlyMap = new Map<string, { label: string; revenue: number; orders: number }>();

    for (const sale of currentSales) {
      const d = new Date(sale.createdAt);
      const dayKey = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const saleAmt = Number(sale.totalAmount);

      // Day
      const dayEntry = dailyMap.get(dayKey) || { label: dayLabel, revenue: 0, orders: 0 };
      dayEntry.revenue += saleAmt;
      dayEntry.orders += 1;
      dailyMap.set(dayKey, dayEntry);

      // Week: compute Monday of week
      const dayNum = d.getDay();
      const diffToMonday = (dayNum + 6) % 7;
      const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diffToMonday);
      const weekKey = monday.toISOString().split('T')[0];
      const weekLabel = `Week of ${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      const weekEntry = weeklyMap.get(weekKey) || { label: weekLabel, revenue: 0, orders: 0 };
      weekEntry.revenue += saleAmt;
      weekEntry.orders += 1;
      weeklyMap.set(weekKey, weekEntry);

      // Month
      const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      const monthEntry = monthlyMap.get(monthKey) || { label: monthLabel, revenue: 0, orders: 0 };
      monthEntry.revenue += saleAmt;
      monthEntry.orders += 1;
      monthlyMap.set(monthKey, monthEntry);

      // Year
      const yearKey = d.getFullYear().toString();
      const yearLabel = d.getFullYear().toString();
      const yearEntry = yearlyMap.get(yearKey) || { label: yearLabel, revenue: 0, orders: 0 };
      yearEntry.revenue += saleAmt;
      yearEntry.orders += 1;
      yearlyMap.set(yearKey, yearEntry);
    }

    const dailySales = Array.from(dailyMap.entries()).map(([date, val]) => ({
      date,
      label: val.label,
      revenue: Number(val.revenue.toFixed(2)),
      orders: val.orders,
      aov: Number(this.safeDivision(val.revenue, val.orders).toFixed(2)),
    }));

    const weeklySales = Array.from(weeklyMap.entries()).map(([week, val]) => ({
      week,
      label: val.label,
      revenue: Number(val.revenue.toFixed(2)),
      orders: val.orders,
    }));

    const monthlySales = Array.from(monthlyMap.entries()).map(([month, val]) => ({
      month,
      label: val.label,
      revenue: Number(val.revenue.toFixed(2)),
      orders: val.orders,
    }));

    const yearlySales = Array.from(yearlyMap.entries()).map(([year, val]) => ({
      year,
      label: val.label,
      revenue: Number(val.revenue.toFixed(2)),
      orders: val.orders,
    }));

    const sales: SalesAnalytics = {
      revenue: Number(revenue.toFixed(2)),
      orders,
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      salesGrowth,
      orderGrowth,
      dailySales,
      weeklySales,
      monthlySales,
      yearlySales,
    };

    // =========================================================
    // SECTION C: Product Analytics Calculations
    // =========================================================
    const productStatsMap = new Map<
      string,
      {
        id: string;
        name: string;
        sku: string;
        category: string;
        currentStock: number;
        reorderLevel: number;
        unitsSold: number;
        revenue: number;
        cogs: number;
      }
    >();

    // Initialize all active products to capture zero-sale products
    for (const p of allProducts) {
      productStatsMap.set(p.id, {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category?.name || 'General',
        currentStock: p.currentStock,
        reorderLevel: p.reorderLevel,
        unitsSold: 0,
        revenue: 0,
        cogs: 0,
      });
    }

    // Accumulate sales numbers
    for (const sale of currentSales) {
      for (const item of sale.items) {
        let entry = productStatsMap.get(item.productId);
        if (!entry) {
          entry = {
            id: item.productId,
            name: item.product?.name || 'Unknown',
            sku: item.product?.sku || 'N/A',
            category: item.product?.category?.name || 'General',
            currentStock: item.product?.currentStock || 0,
            reorderLevel: item.product?.reorderLevel || 0,
            unitsSold: 0,
            revenue: 0,
            cogs: 0,
          };
          productStatsMap.set(item.productId, entry);
        }

        entry.unitsSold += item.quantity;
        entry.revenue += Number(item.subtotal);
        const cost = Number(item.unitCost) > 0 ? Number(item.unitCost) : 0;
        entry.cogs += cost * item.quantity;
      }
    }

    const allProductItems: ProductAnalyticsItem[] = Array.from(productStatsMap.values()).map(
      (p) => {
        const profit = p.revenue - p.cogs;
        const profitMargin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          currentStock: p.currentStock,
          reorderLevel: p.reorderLevel,
          unitsSold: p.unitsSold,
          revenue: Number(p.revenue.toFixed(2)),
          cogs: Number(p.cogs.toFixed(2)),
          profit: Number(profit.toFixed(2)),
          profitMargin: Number(profitMargin.toFixed(1)),
        };
      }
    );

    // 1. Best Sellers: Top products by units sold (and revenue)
    const bestSellers = [...allProductItems]
      .filter((p) => p.unitsSold > 0)
      .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
      .slice(0, 10);

    // 2. Slow-Moving Products: Products with inventory but low units sold (<= 2)
    const slowMoving = [...allProductItems]
      .filter((p) => p.currentStock > 0 && p.unitsSold <= 2)
      .sort((a, b) => a.unitsSold - b.unitsSold || b.currentStock - a.currentStock)
      .slice(0, 10);

    // 3. Most Profitable Products: Highest gross profit
    const mostProfitable = [...allProductItems]
      .filter((p) => p.unitsSold > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    // 4. Least Profitable Products: Lowest gross profit or margin
    const leastProfitable = [...allProductItems]
      .sort((a, b) => a.profit - b.profit)
      .slice(0, 10);

    // 5. Product Trends (Daily units sold for top 5 products)
    const top5Ids = bestSellers.slice(0, 5).map((p) => p.id);
    const trendDatesMap = new Map<string, Record<string, number>>();

    for (const sale of currentSales) {
      const dateKey = new Date(sale.createdAt).toISOString().split('T')[0];
      const entry = trendDatesMap.get(dateKey) || {};

      for (const item of sale.items) {
        if (top5Ids.includes(item.productId)) {
          const prodName = item.product?.name || item.productId;
          entry[prodName] = (entry[prodName] || 0) + item.quantity;
        }
      }
      trendDatesMap.set(dateKey, entry);
    }

    const productTrends = Array.from(trendDatesMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    const products: ProductAnalytics = {
      bestSellers,
      slowMoving,
      mostProfitable,
      leastProfitable,
      productTrends,
    };

    // =========================================================
    // SECTION D: Inventory Analytics Calculations
    // =========================================================
    let stockValue = 0;
    let retailValue = 0;
    let totalUnitsInStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let overstockCount = 0;
    let deadStockCount = 0;

    const overstockItems: InventoryAnalytics['overstockItems'] = [];
    const deadStockItems: InventoryAnalytics['deadStockItems'] = [];

    for (const p of allProducts) {
      const current = p.currentStock;
      const reorder = p.reorderLevel;
      const purchasePrice = Number(p.purchasePrice);
      const sellingPrice = Number(p.sellingPrice);

      const itemStockVal = current * purchasePrice;
      const itemRetailVal = current * sellingPrice;

      stockValue += itemStockVal;
      retailValue += itemRetailVal;
      totalUnitsInStock += current;

      if (current <= 0) {
        outOfStockCount++;
      } else if (current <= reorder) {
        lowStockCount++;
      }

      // Overstock: Stock > 3x Reorder level and at least 15 units
      if (current > reorder * 3 && current >= 15) {
        overstockCount++;
        overstockItems.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category?.name || 'General',
          currentStock: current,
          reorderLevel: reorder,
          excessUnits: current - reorder * 2,
          costValue: Number((current * purchasePrice).toFixed(2)),
        });
      }

      // Dead Stock: Has stock > 0 but ZERO units sold in current period
      const stats = productStatsMap.get(p.id);
      if (current > 0 && (!stats || stats.unitsSold === 0)) {
        deadStockCount++;
        deadStockItems.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category?.name || 'General',
          currentStock: current,
          costValue: Number(itemStockVal.toFixed(2)),
          daysWithoutSale: Math.floor(
            (bounds.endDate.getTime() - bounds.startDate.getTime()) / (24 * 60 * 60 * 1000)
          ),
        });
      }
    }

    // Inventory Turnover Ratio = COGS / Average Stock Value
    const inventoryTurnoverRatio =
      stockValue > 0 ? Number((cogs / stockValue).toFixed(2)) : 0;

    // Stock Movement in period
    let unitsIn = 0;
    let unitsOut = 0;

    for (const tx of inventoryTransactions) {
      if (tx.quantity > 0) {
        unitsIn += tx.quantity;
      } else {
        unitsOut += Math.abs(tx.quantity);
      }
    }

    const inventory: InventoryAnalytics = {
      stockValue: Number(stockValue.toFixed(2)),
      retailValue: Number(retailValue.toFixed(2)),
      potentialProfit: Number((retailValue - stockValue).toFixed(2)),
      totalProducts: allProducts.length,
      totalUnitsInStock,
      lowStockCount,
      outOfStockCount,
      overstockCount,
      deadStockCount,
      inventoryTurnoverRatio,
      stockMovement: {
        unitsIn,
        unitsOut,
        netMovement: unitsIn - unitsOut,
      },
      deadStockItems: deadStockItems.sort((a, b) => b.costValue - a.costValue).slice(0, 10),
      overstockItems: overstockItems.sort((a, b) => b.costValue - a.costValue).slice(0, 10),
    };

    // =========================================================
    // SECTION E: Customer Analytics Calculations
    // =========================================================
    const totalCustomers = allCustomers.length;

    // New Customers registered within analyzed period
    const newCustomers = allCustomers.filter((c) => {
      const created = new Date(c.createdAt);
      return created >= bounds.startDate && created <= bounds.endDate;
    }).length;

    // Repeat customers: have > 1 completed sales
    let repeatCustomers = 0;
    let totalCustomerSpend = 0;
    const topCustomersList: CustomerAnalytics['topCustomers'] = [];

    for (const c of allCustomers) {
      const orderCount = c.sales.length;
      const spent = c.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
      totalCustomerSpend += spent;

      if (orderCount > 1) {
        repeatCustomers++;
      }

      if (orderCount > 0) {
        topCustomersList.push({
          id: c.id,
          name: c.name,
          code: c.code,
          email: c.email,
          ordersCount: orderCount,
          totalSpent: Number(spent.toFixed(2)),
          averageOrderValue: Number(this.safeDivision(spent, orderCount).toFixed(2)),
        });
      }
    }

    const activeCustomerCount = topCustomersList.length;
    const repeatCustomerRate =
      activeCustomerCount > 0
        ? Number(((repeatCustomers / activeCustomerCount) * 100).toFixed(1))
        : 0;

    const averageCustomerValue =
      totalCustomers > 0 ? Number((revenue / totalCustomers).toFixed(2)) : 0;

    const topCustomers = topCustomersList
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    const customers: CustomerAnalytics = {
      totalCustomers,
      newCustomers,
      repeatCustomers,
      repeatCustomerRate,
      totalCustomerSpend: Number(totalCustomerSpend.toFixed(2)),
      averageCustomerValue,
      topCustomers,
    };

    return {
      period: query.period,
      dateRange: {
        startDate: bounds.startDate.toISOString(),
        endDate: bounds.endDate.toISOString(),
      },
      financials,
      sales,
      products,
      inventory,
      customers,
    };
  }
}

export const analyticsService = new AnalyticsService();
