import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  SalesReportQuery,
  PurchasesReportQuery,
  InventoryReportQuery,
  CustomersReportQuery,
  ExpensesReportQuery,
  ProfitReportQuery,
} from '../validators/report.validator';
import { reportExporter, ExportColumn } from '../utils/export.util';

export class ReportService {
  constructor(private client: PrismaClient = prisma) {}

  private parseDateRange(startDate?: string, endDate?: string): { gte?: Date; lte?: Date } | undefined {
    if (!startDate && !endDate) return undefined;
    const range: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      const [y, m, d] = startDate.split('-').map(Number);
      range.gte = new Date(y, m - 1, d, 0, 0, 0, 0);
    }
    if (endDate) {
      const [y, m, d] = endDate.split('-').map(Number);
      range.lte = new Date(y, m - 1, d, 23, 59, 59, 999);
    }
    return range;
  }

  // =========================================================================
  // 1. SALES REPORT
  // =========================================================================
  public async getSalesReport(query: SalesReportQuery) {
    const where: Prisma.SaleWhereInput = {};

    const dateFilter = this.parseDateRange(query.startDate, query.endDate);
    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.paymentMethod) {
      where.payments = {
        some: {
          paymentMethod: query.paymentMethod,
        },
      };
    }

    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        { customer: { code: { contains: query.search, mode: 'insensitive' } } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const total = await this.client.sale.count({ where });

    // Aggregate summary
    const allFilteredSales = await this.client.sale.findMany({
      where,
      select: {
        totalAmount: true,
        subtotal: true,
        taxAmount: true,
        discountAmount: true,
        status: true,
      },
    });

    const totalRevenue = allFilteredSales
      .filter((s) => s.status === 'COMPLETED')
      .reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalTax = allFilteredSales.reduce((sum, s) => sum + Number(s.taxAmount), 0);
    const totalDiscounts = allFilteredSales.reduce((sum, s) => sum + Number(s.discountAmount), 0);
    const completedOrders = allFilteredSales.filter((s) => s.status === 'COMPLETED').length;
    const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

    const summary = {
      totalOrders: total,
      completedOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalDiscounts: Number(totalDiscounts.toFixed(2)),
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
    };

    // If CSV export requested, fetch all rows without pagination limit
    if (query.format === 'csv') {
      const exportRows = await this.client.sale.findMany({
        where,
        include: {
          customer: true,
          user: true,
          payments: true,
          items: { include: { product: true } },
        },
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder },
        take: 5000,
      });

      const columns: ExportColumn<any>[] = [
        { header: 'Invoice Number', key: 'invoiceNumber' },
        {
          header: 'Date',
          key: 'createdAt',
          format: (val) => new Date(val).toISOString().split('T')[0],
        },
        { header: 'Customer Name', key: 'customer.name', format: (val) => val || 'Walk-in Customer' },
        { header: 'Customer Code', key: 'customer.code', format: (val) => val || 'N/A' },
        { header: 'Cashier', key: 'user.name' },
        { header: 'Items Count', key: 'items', format: (items) => String(items?.length || 0) },
        { header: 'Subtotal ($)', key: 'subtotal', format: (val) => Number(val).toFixed(2) },
        { header: 'Tax ($)', key: 'taxAmount', format: (val) => Number(val).toFixed(2) },
        { header: 'Discount ($)', key: 'discountAmount', format: (val) => Number(val).toFixed(2) },
        { header: 'Total Amount ($)', key: 'totalAmount', format: (val) => Number(val).toFixed(2) },
        { header: 'Status', key: 'status' },
        {
          header: 'Payment Methods',
          key: 'payments',
          format: (p) => (p && p.length > 0 ? p.map((x: any) => x.paymentMethod).join('; ') : 'CASH'),
        },
      ];

      const csvData = reportExporter.generateCsv(columns, exportRows);
      return { csvData, filename: `sales-report-${new Date().toISOString().split('T')[0]}.csv` };
    }

    // Paginated Data
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const sales = await this.client.sale.findMany({
      where,
      include: {
        customer: true,
        user: true,
        payments: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { [query.sortBy || 'createdAt']: query.sortOrder },
      skip,
      take: limit,
    });

    return {
      data: sales.map((s) => ({
        id: s.id,
        invoiceNumber: s.invoiceNumber,
        createdAt: s.createdAt,
        customerName: s.customer?.name || 'Walk-in Customer',
        customerCode: s.customer?.code || null,
        cashierName: s.user.name,
        itemsCount: s.items.length,
        subtotal: Number(s.subtotal),
        taxAmount: Number(s.taxAmount),
        discountAmount: Number(s.discountAmount),
        totalAmount: Number(s.totalAmount),
        status: s.status,
        paymentMethods: s.payments.map((p) => p.paymentMethod),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  // =========================================================================
  // 2. PURCHASES REPORT
  // =========================================================================
  public async getPurchasesReport(query: PurchasesReportQuery) {
    const where: Prisma.PurchaseWhereInput = {};

    const dateFilter = this.parseDateRange(query.startDate, query.endDate);
    if (dateFilter) {
      where.purchaseDate = dateFilter;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.search) {
      where.OR = [
        { purchaseOrderNumber: { contains: query.search, mode: 'insensitive' } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
        { supplier: { code: { contains: query.search, mode: 'insensitive' } } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const total = await this.client.purchase.count({ where });

    // Summary Aggregates
    const allFilteredPurchases = await this.client.purchase.findMany({
      where,
      include: {
        items: true,
      },
    });

    const totalSpend = allFilteredPurchases
      .filter((p) => p.status === 'RECEIVED')
      .reduce((sum, p) => sum + Number(p.totalAmount), 0);
    const totalItemsProcured = allFilteredPurchases.reduce((acc, p) => {
      return acc + p.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    const summary = {
      totalPurchases: total,
      receivedPurchases: allFilteredPurchases.filter((p) => p.status === 'RECEIVED').length,
      totalSpend: Number(totalSpend.toFixed(2)),
      totalItemsProcured,
    };

    if (query.format === 'csv') {
      const exportRows = await this.client.purchase.findMany({
        where,
        include: { supplier: true, user: true, items: true },
        orderBy: { [query.sortBy || 'purchaseDate']: query.sortOrder },
        take: 5000,
      });

      const columns: ExportColumn<any>[] = [
        { header: 'PO Number', key: 'purchaseOrderNumber' },
        {
          header: 'Date',
          key: 'purchaseDate',
          format: (val) => new Date(val).toISOString().split('T')[0],
        },
        { header: 'Supplier Name', key: 'supplier.name' },
        { header: 'Supplier Code', key: 'supplier.code' },
        { header: 'Received By', key: 'user.name' },
        {
          header: 'Total Units',
          key: 'items',
          format: (items) => String(items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0),
        },
        { header: 'Subtotal ($)', key: 'subtotal', format: (val) => Number(val).toFixed(2) },
        { header: 'Tax ($)', key: 'taxAmount', format: (val) => Number(val).toFixed(2) },
        { header: 'Total Amount ($)', key: 'totalAmount', format: (val) => Number(val).toFixed(2) },
        { header: 'Status', key: 'status' },
      ];

      const csvData = reportExporter.generateCsv(columns, exportRows);
      return { csvData, filename: `purchases-report-${new Date().toISOString().split('T')[0]}.csv` };
    }

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const purchases = await this.client.purchase.findMany({
      where,
      include: {
        supplier: true,
        user: true,
        items: true,
      },
      orderBy: { [query.sortBy || 'purchaseDate']: query.sortOrder },
      skip,
      take: limit,
    });

    return {
      data: purchases.map((p) => ({
        id: p.id,
        purchaseOrderNumber: p.purchaseOrderNumber,
        purchaseDate: p.purchaseDate,
        supplierName: p.supplier.name,
        supplierCode: p.supplier.code,
        userName: p.user.name,
        itemsCount: p.items.length,
        totalUnits: p.items.reduce((s, i) => s + i.quantity, 0),
        subtotal: Number(p.subtotal),
        taxAmount: Number(p.taxAmount),
        totalAmount: Number(p.totalAmount),
        status: p.status,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  // =========================================================================
  // 3. INVENTORY REPORT
  // =========================================================================
  public async getInventoryReport(query: InventoryReportQuery) {
    const where: Prisma.ProductWhereInput = {};

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Load products to compute accurate dynamic status & valuation
    const allProducts = await this.client.product.findMany({
      where,
      include: {
        category: true,
      },
    });

    let stockValueSum = 0;
    let retailValueSum = 0;
    let totalStockUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let overstockCount = 0;

    const enrichedProducts = allProducts.map((p) => {
      const stock = p.currentStock;
      const reorder = p.reorderLevel;
      const cost = Number(p.purchasePrice);
      const retail = Number(p.sellingPrice);
      const stockVal = stock * cost;
      const retailVal = stock * retail;

      stockValueSum += stockVal;
      retailValueSum += retailVal;
      totalStockUnits += stock;

      let statusTag: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'OVERSTOCK' | 'IN_STOCK' = 'IN_STOCK';
      if (stock <= 0) {
        statusTag = 'OUT_OF_STOCK';
        outOfStockCount++;
      } else if (stock <= reorder) {
        statusTag = 'LOW_STOCK';
        lowStockCount++;
      } else if (stock > reorder * 3 && stock >= 15) {
        statusTag = 'OVERSTOCK';
        overstockCount++;
      }

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category?.name || 'General',
        currentStock: stock,
        reorderLevel: reorder,
        unit: p.unit,
        purchasePrice: cost,
        sellingPrice: retail,
        stockValue: Number(stockVal.toFixed(2)),
        retailValue: Number(retailVal.toFixed(2)),
        potentialProfit: Number((retailVal - stockVal).toFixed(2)),
        statusTag,
      };
    });

    // Apply stockStatus filter in memory if specified
    let filteredList = enrichedProducts;
    if (query.stockStatus && query.stockStatus !== 'ALL') {
      filteredList = enrichedProducts.filter((p) => p.statusTag === query.stockStatus);
    }

    // Sorting
    const sortField = query.sortBy || 'name';
    const isAsc = query.sortOrder === 'asc';
    filteredList.sort((a: any, b: any) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string') {
        return isAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return isAsc ? aVal - bVal : bVal - aVal;
    });

    const summary = {
      totalProducts: allProducts.length,
      totalStockUnits,
      totalCostValuation: Number(stockValueSum.toFixed(2)),
      totalRetailValuation: Number(retailValueSum.toFixed(2)),
      potentialGrossProfit: Number((retailValueSum - stockValueSum).toFixed(2)),
      lowStockCount,
      outOfStockCount,
      overstockCount,
    };

    if (query.format === 'csv') {
      const columns: ExportColumn<any>[] = [
        { header: 'Product Name', key: 'name' },
        { header: 'SKU', key: 'sku' },
        { header: 'Category', key: 'category' },
        { header: 'Current Stock', key: 'currentStock' },
        { header: 'Reorder Level', key: 'reorderLevel' },
        { header: 'Wholesale Cost ($)', key: 'purchasePrice', format: (v) => Number(v).toFixed(2) },
        { header: 'Retail Price ($)', key: 'sellingPrice', format: (v) => Number(v).toFixed(2) },
        { header: 'Stock Value (Cost) ($)', key: 'stockValue', format: (v) => Number(v).toFixed(2) },
        { header: 'Retail Valuation ($)', key: 'retailValue', format: (v) => Number(v).toFixed(2) },
        { header: 'Potential Profit ($)', key: 'potentialProfit', format: (v) => Number(v).toFixed(2) },
        { header: 'Health Status', key: 'statusTag' },
      ];

      const csvData = reportExporter.generateCsv(columns, filteredList);
      return { csvData, filename: `inventory-report-${new Date().toISOString().split('T')[0]}.csv` };
    }

    const page = query.page;
    const limit = query.limit;
    const paginatedItems = filteredList.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedItems,
      pagination: {
        page,
        limit,
        total: filteredList.length,
        totalPages: Math.ceil(filteredList.length / limit),
      },
      summary,
    };
  }

  // =========================================================================
  // 4. CUSTOMERS REPORT
  // =========================================================================
  public async getCustomersReport(query: CustomersReportQuery) {
    const where: Prisma.CustomerWhereInput = {};

    const dateFilter = this.parseDateRange(query.startDate, query.endDate);
    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const allCustomers = await this.client.customer.findMany({
      where,
      include: {
        sales: {
          where: { status: 'COMPLETED' },
          select: { totalAmount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    let totalLifetimeSpend = 0;
    let activeBuyersCount = 0;

    const mappedCustomers = allCustomers.map((c) => {
      const orderCount = c.sales.length;
      const spent = c.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
      totalLifetimeSpend += spent;
      if (orderCount > 0) activeBuyersCount++;

      const aov = orderCount > 0 ? spent / orderCount : 0;
      const lastOrderDate = c.sales[0]?.createdAt || null;

      return {
        id: c.id,
        name: c.name,
        code: c.code,
        email: c.email,
        phone: c.phone,
        creditLimit: Number(c.creditLimit),
        ordersCount: orderCount,
        totalSpent: Number(spent.toFixed(2)),
        averageOrderValue: Number(aov.toFixed(2)),
        lastPurchaseDate: lastOrderDate,
        createdAt: c.createdAt,
      };
    });

    // Activity filter
    let filteredList = mappedCustomers;
    if (query.activity === 'ACTIVE') {
      filteredList = mappedCustomers.filter((c) => c.ordersCount > 0);
    } else if (query.activity === 'INACTIVE') {
      filteredList = mappedCustomers.filter((c) => c.ordersCount === 0);
    }

    // Sorting
    const sortField = query.sortBy || 'totalSpent';
    const isAsc = query.sortOrder === 'asc';
    filteredList.sort((a: any, b: any) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal instanceof Date && bVal instanceof Date) {
        return isAsc ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
      }
      if (typeof aVal === 'string') {
        return isAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return isAsc ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
    });

    const summary = {
      totalCustomers: allCustomers.length,
      activeBuyersCount,
      inactiveCustomersCount: allCustomers.length - activeBuyersCount,
      totalCustomerSpend: Number(totalLifetimeSpend.toFixed(2)),
      averageSpendPerCustomer:
        allCustomers.length > 0 ? Number((totalLifetimeSpend / allCustomers.length).toFixed(2)) : 0,
    };

    if (query.format === 'csv') {
      const columns: ExportColumn<any>[] = [
        { header: 'Customer Name', key: 'name' },
        { header: 'Customer Code', key: 'code' },
        { header: 'Email', key: 'email', format: (v) => v || '—' },
        { header: 'Phone', key: 'phone', format: (v) => v || '—' },
        { header: 'Orders Placed', key: 'ordersCount' },
        { header: 'Total Spent ($)', key: 'totalSpent', format: (v) => Number(v).toFixed(2) },
        { header: 'Average Order ($)', key: 'averageOrderValue', format: (v) => Number(v).toFixed(2) },
        {
          header: 'Last Purchase Date',
          key: 'lastPurchaseDate',
          format: (v) => (v ? new Date(v).toISOString().split('T')[0] : 'Never'),
        },
        {
          header: 'Registration Date',
          key: 'createdAt',
          format: (v) => new Date(v).toISOString().split('T')[0],
        },
      ];

      const csvData = reportExporter.generateCsv(columns, filteredList);
      return { csvData, filename: `customers-report-${new Date().toISOString().split('T')[0]}.csv` };
    }

    const page = query.page;
    const limit = query.limit;
    const paginatedItems = filteredList.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedItems,
      pagination: {
        page,
        limit,
        total: filteredList.length,
        totalPages: Math.ceil(filteredList.length / limit),
      },
      summary,
    };
  }

  // =========================================================================
  // 5. EXPENSES REPORT
  // =========================================================================
  public async getExpensesReport(query: ExpensesReportQuery) {
    const where: Prisma.ExpenseWhereInput = {
      isActive: true,
    };

    const dateFilter = this.parseDateRange(query.startDate, query.endDate);
    if (dateFilter) {
      where.expenseDate = dateFilter;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const total = await this.client.expense.count({ where });

    // Summary Aggregates
    const allExpenses = await this.client.expense.findMany({
      where,
      select: {
        amount: true,
        category: true,
      },
    });

    let totalExpenseAmount = 0;
    const categoryBreakdown: Record<string, number> = {};

    for (const exp of allExpenses) {
      const amt = Number(exp.amount);
      totalExpenseAmount += amt;
      categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + amt;
    }

    const summary = {
      totalExpensesCount: total,
      totalExpenseAmount: Number(totalExpenseAmount.toFixed(2)),
      categoryBreakdown,
    };

    if (query.format === 'csv') {
      const exportRows = await this.client.expense.findMany({
        where,
        include: { user: true },
        orderBy: { [query.sortBy || 'expenseDate']: query.sortOrder },
        take: 5000,
      });

      const columns: ExportColumn<any>[] = [
        {
          header: 'Date',
          key: 'expenseDate',
          format: (v) => new Date(v).toISOString().split('T')[0],
        },
        { header: 'Category', key: 'category' },
        { header: 'Description', key: 'description' },
        { header: 'Amount ($)', key: 'amount', format: (v) => Number(v).toFixed(2) },
        { header: 'Payment Method', key: 'paymentMethod' },
        { header: 'Recorded By', key: 'user.name' },
      ];

      const csvData = reportExporter.generateCsv(columns, exportRows);
      return { csvData, filename: `expenses-report-${new Date().toISOString().split('T')[0]}.csv` };
    }

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const expenses = await this.client.expense.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: { [query.sortBy || 'expenseDate']: query.sortOrder },
      skip,
      take: limit,
    });

    return {
      data: expenses.map((e) => ({
        id: e.id,
        expenseDate: e.expenseDate,
        category: e.category,
        description: e.description,
        amount: Number(e.amount),
        paymentMethod: e.paymentMethod,
        userName: e.user.name,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  // =========================================================================
  // 6. PROFIT REPORT (Profit & Loss / Margins)
  // =========================================================================
  public async getProfitReport(query: ProfitReportQuery) {
    const dateFilter = this.parseDateRange(query.startDate, query.endDate);

    const saleWhere: Prisma.SaleWhereInput = {
      status: 'COMPLETED',
    };
    if (dateFilter) {
      saleWhere.createdAt = dateFilter;
    }

    const expenseWhere: Prisma.ExpenseWhereInput = {
      isActive: true,
    };
    if (dateFilter) {
      expenseWhere.expenseDate = dateFilter;
    }

    // 1. Fetch Sales with items
    const sales = await this.client.sale.findMany({
      where: saleWhere,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Fetch Expenses
    const expenses = await this.client.expense.findMany({
      where: expenseWhere,
      orderBy: { expenseDate: 'asc' },
    });

    // Aggregate overall financials
    let totalRevenue = 0;
    let totalCogs = 0;

    for (const sale of sales) {
      totalRevenue += Number(sale.totalAmount);
      for (const item of sale.items) {
        const cost =
          Number(item.unitCost) > 0
            ? Number(item.unitCost)
            : Number(item.product?.purchasePrice) > 0
            ? Number(item.product.purchasePrice)
            : 0;
        totalCogs += cost * item.quantity;
      }
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit - totalExpenses;

    // Safe zero handling
    const profitMargin = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0;
    const netMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(2)) : 0;

    const summary = {
      revenue: Number(totalRevenue.toFixed(2)),
      cogs: Number(totalCogs.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      expenses: Number(totalExpenses.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      profitMargin,
      netMargin,
    };

    // Grouping by time interval (daily, weekly, monthly)
    const intervalMap = new Map<
      string,
      { label: string; revenue: number; cogs: number; expenses: number }
    >();

    const getKeyAndLabel = (d: Date, groupBy: 'daily' | 'weekly' | 'monthly') => {
      if (groupBy === 'monthly') {
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        const label = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        return { key, label };
      }
      if (groupBy === 'weekly') {
        const day = d.getDay();
        const diff = (day + 6) % 7;
        const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
        const key = monday.toISOString().split('T')[0];
        const label = `Week of ${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        return { key, label };
      }
      // Daily
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      return { key, label };
    };

    // Accumulate sales revenue & COGS
    for (const sale of sales) {
      const { key, label } = getKeyAndLabel(new Date(sale.createdAt), query.groupBy);
      const entry = intervalMap.get(key) || { label, revenue: 0, cogs: 0, expenses: 0 };
      entry.revenue += Number(sale.totalAmount);

      for (const item of sale.items) {
        const cost =
          Number(item.unitCost) > 0
            ? Number(item.unitCost)
            : Number(item.product?.purchasePrice) > 0
            ? Number(item.product.purchasePrice)
            : 0;
        entry.cogs += cost * item.quantity;
      }
      intervalMap.set(key, entry);
    }

    // Accumulate expenses
    for (const exp of expenses) {
      const { key, label } = getKeyAndLabel(new Date(exp.expenseDate), query.groupBy);
      const entry = intervalMap.get(key) || { label, revenue: 0, cogs: 0, expenses: 0 };
      entry.expenses += Number(exp.amount);
      intervalMap.set(key, entry);
    }

    // Convert map to sorted breakdown array
    const breakdown = Array.from(intervalMap.entries())
      .map(([dateKey, val]) => {
        const gp = val.revenue - val.cogs;
        const np = gp - val.expenses;
        const margin = val.revenue > 0 ? Number(((gp / val.revenue) * 100).toFixed(1)) : 0;
        return {
          date: dateKey,
          label: val.label,
          revenue: Number(val.revenue.toFixed(2)),
          cogs: Number(val.cogs.toFixed(2)),
          grossProfit: Number(gp.toFixed(2)),
          expenses: Number(val.expenses.toFixed(2)),
          netProfit: Number(np.toFixed(2)),
          profitMargin: margin,
        };
      })
      .sort((a, b) => (query.sortOrder === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));

    if (query.format === 'csv') {
      const columns: ExportColumn<any>[] = [
        { header: 'Period / Date', key: 'label' },
        { header: 'Revenue ($)', key: 'revenue', format: (v) => Number(v).toFixed(2) },
        { header: 'COGS ($)', key: 'cogs', format: (v) => Number(v).toFixed(2) },
        { header: 'Gross Profit ($)', key: 'grossProfit', format: (v) => Number(v).toFixed(2) },
        { header: 'Expenses ($)', key: 'expenses', format: (v) => Number(v).toFixed(2) },
        { header: 'Net Profit ($)', key: 'netProfit', format: (v) => Number(v).toFixed(2) },
        { header: 'Profit Margin (%)', key: 'profitMargin', format: (v) => `${v}%` },
      ];

      const csvData = reportExporter.generateCsv(columns, breakdown);
      return { csvData, filename: `profit-loss-report-${new Date().toISOString().split('T')[0]}.csv` };
    }

    const page = query.page;
    const limit = query.limit;
    const paginatedBreakdown = breakdown.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedBreakdown,
      pagination: {
        page,
        limit,
        total: breakdown.length,
        totalPages: Math.ceil(breakdown.length / limit),
      },
      summary,
    };
  }
}

export const reportService = new ReportService();
