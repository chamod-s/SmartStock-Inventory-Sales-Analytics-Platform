/**
 * SmartStock Reports Module Test Suite
 *
 * Verifies:
 * 1. Schema & Query Validation:
 *    - Sales, Purchases, Inventory, Customers, Expenses, Profit schemas
 * 2. Modular Report Exporter:
 *    - CSV escaping, quotation handling, nested property extraction, column formatting
 * 3. Sales Report Calculation:
 *    - Revenue, tax, discount, AOV aggregation, pagination, sorting
 * 4. Purchases Report Calculation:
 *    - Spend, total items, supplier linking, pagination
 * 5. Inventory Report Calculation:
 *    - Cost valuation, retail valuation, health status tags (LOW_STOCK, OVERSTOCK, etc.)
 * 6. Customers Report Calculation:
 *    - Lifetime spend, order count, AOV, buyer activity filtering
 * 7. Expenses Report Calculation:
 *    - Category breakdown, total operating overhead
 * 8. Profit & Loss Report Calculation:
 *    - Revenue, COGS, Gross Profit, Net Profit, Margin % with safe zero handling
 * 9. Role-Based Access Control (RBAC):
 *    - Admin and Manager authorized, Cashier blocked (403)
 */

import { ReportService } from '../services/report.service';
import {
  salesReportQuerySchema,
  purchasesReportQuerySchema,
  inventoryReportQuerySchema,
  customersReportQuerySchema,
  expensesReportQuerySchema,
  profitReportQuerySchema,
} from '../validators/report.validator';
import { ModularReportExporter } from '../utils/export.util';
import { UserRole } from '@prisma/client';
import { authorize } from '../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
}

// Mock Prisma Client for Reports
class MockReportPrismaClient {
  public sales = [
    {
      id: 's-1',
      invoiceNumber: 'INV-000001',
      totalAmount: 1500.0,
      subtotal: 1350.0,
      taxAmount: 150.0,
      discountAmount: 0.0,
      status: 'COMPLETED',
      createdAt: new Date('2026-03-05T10:00:00.000Z'),
      customerId: 'c-1',
      customer: { name: 'Acme Industries', code: 'CUST-001' },
      user: { name: 'Alice Manager' },
      payments: [{ paymentMethod: 'CARD', amount: 1500.0 }],
      items: [
        {
          quantity: 10,
          unitPrice: 150.0,
          unitCost: 90.0, // COGS = 900
          product: { name: 'Executive Desk', sku: 'DSK-001', purchasePrice: 90.0 },
        },
      ],
    },
    {
      id: 's-2',
      invoiceNumber: 'INV-000002',
      totalAmount: 500.0,
      subtotal: 480.0,
      taxAmount: 50.0,
      discountAmount: 30.0,
      status: 'COMPLETED',
      createdAt: new Date('2026-03-12T14:00:00.000Z'),
      customerId: 'c-1',
      customer: { name: 'Acme Industries', code: 'CUST-001' },
      user: { name: 'Alice Manager' },
      payments: [{ paymentMethod: 'CASH', amount: 500.0 }],
      items: [
        {
          quantity: 5,
          unitPrice: 100.0,
          unitCost: 60.0, // COGS = 300
          product: { name: 'Desk Chair', sku: 'CHR-002', purchasePrice: 60.0 },
        },
      ],
    },
  ];

  public purchases = [
    {
      id: 'po-1',
      purchaseOrderNumber: 'PO-2026-001',
      purchaseDate: new Date('2026-03-02T09:00:00.000Z'),
      supplierId: 'sup-1',
      supplier: { name: 'Global Wood Supply', code: 'SUP-001' },
      user: { name: 'Bob Admin' },
      subtotal: 2000.0,
      taxAmount: 200.0,
      totalAmount: 2200.0,
      status: 'RECEIVED',
      items: [
        { quantity: 20, unitCost: 100.0, subtotal: 2000.0, product: { name: 'Oak Timber' } },
      ],
    },
  ];

  public products = [
    {
      id: 'p-1',
      name: 'Executive Desk',
      sku: 'DSK-001',
      purchasePrice: 90.0,
      sellingPrice: 150.0,
      currentStock: 25,
      reorderLevel: 10,
      unit: 'pcs',
      status: 'ACTIVE',
      category: { name: 'Furniture' },
    },
    {
      id: 'p-2',
      name: 'Desk Chair',
      sku: 'CHR-002',
      purchasePrice: 60.0,
      sellingPrice: 100.0,
      currentStock: 4, // LOW_STOCK (4 <= 10)
      reorderLevel: 10,
      unit: 'pcs',
      status: 'ACTIVE',
      category: { name: 'Furniture' },
    },
    {
      id: 'p-3',
      name: 'Mousepad Ultra',
      sku: 'PAD-003',
      purchasePrice: 10.0,
      sellingPrice: 25.0,
      currentStock: 60, // OVERSTOCK (> 3 * 10 and >= 15)
      reorderLevel: 10,
      unit: 'pcs',
      status: 'ACTIVE',
      category: { name: 'Accessories' },
    },
    {
      id: 'p-4',
      name: 'Broken Stand',
      sku: 'STN-004',
      purchasePrice: 20.0,
      sellingPrice: 40.0,
      currentStock: 0, // OUT_OF_STOCK
      reorderLevel: 5,
      unit: 'pcs',
      status: 'ACTIVE',
      category: { name: 'Accessories' },
    },
  ];

  public customers = [
    {
      id: 'c-1',
      name: 'Acme Industries',
      code: 'CUST-001',
      email: 'contact@acme.com',
      phone: '+1-555-0199',
      creditLimit: 5000.0,
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
      sales: [
        { totalAmount: 1500.0, createdAt: new Date('2026-03-05T10:00:00.000Z') },
        { totalAmount: 500.0, createdAt: new Date('2026-03-12T14:00:00.000Z') },
      ],
    },
    {
      id: 'c-2',
      name: 'Solo Startup',
      code: 'CUST-002',
      email: null,
      phone: null,
      creditLimit: 1000.0,
      createdAt: new Date('2026-02-20T00:00:00.000Z'),
      sales: [],
    },
  ];

  public expenses = [
    {
      id: 'exp-1',
      category: 'Rent',
      description: 'Store lease payment',
      amount: 400.0,
      paymentMethod: 'BANK_TRANSFER',
      isActive: true,
      expenseDate: new Date('2026-03-01T00:00:00.000Z'),
      user: { name: 'Bob Admin' },
    },
    {
      id: 'exp-2',
      category: 'Electricity',
      description: 'Monthly utility bill',
      amount: 100.0,
      paymentMethod: 'CASH',
      isActive: true,
      expenseDate: new Date('2026-03-15T00:00:00.000Z'),
      user: { name: 'Alice Manager' },
    },
  ];

  public sale = {
    count: async () => this.sales.length,
    findMany: async () => this.sales,
  };

  public purchase = {
    count: async () => this.purchases.length,
    findMany: async () => this.purchases,
  };

  public product = {
    count: async () => this.products.length,
    findMany: async () => this.products,
  };

  public customer = {
    count: async () => this.customers.length,
    findMany: async () => this.customers,
  };

  public expense = {
    count: async () => this.expenses.length,
    findMany: async () => this.expenses,
  };
}

async function runReportsTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Reports Module Test Suite');
  console.log('🧪 ===============================================\n');

  const mockClient = new MockReportPrismaClient();
  const service = new ReportService(mockClient as any);

  // =========================================================
  // SECTION 1: Query Validation Schemas
  // =========================================================
  console.log('--- 1. Query Validation Schemas ---');

  const validSalesQuery = salesReportQuerySchema.safeParse({
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    status: 'COMPLETED',
    paymentMethod: 'CARD',
    page: 1,
    limit: 50,
  });
  assert(validSalesQuery.success, '1. Sales Query: Accepts valid status, date range, and pagination');

  const validPurchasesQuery = purchasesReportQuerySchema.safeParse({
    status: 'RECEIVED',
    page: 1,
  });
  assert(validPurchasesQuery.success, '1b. Purchases Query: Accepts valid status and pagination');

  const validInventoryQuery = inventoryReportQuerySchema.safeParse({
    stockStatus: 'LOW_STOCK',
    sortBy: 'currentStock',
    sortOrder: 'asc',
  });
  assert(validInventoryQuery.success, '2. Inventory Query: Accepts stockStatus filter and sorting');

  const validCustomersQuery = customersReportQuerySchema.safeParse({
    activity: 'ACTIVE',
    format: 'csv',
  });
  assert(validCustomersQuery.success, '3. Customers Query: Accepts activity filter and CSV format');

  const validExpensesQuery = expensesReportQuerySchema.safeParse({
    category: 'Rent',
  });
  assert(validExpensesQuery.success, '3b. Expenses Query: Accepts category filter');

  const validProfitQuery = profitReportQuerySchema.safeParse({
    groupBy: 'monthly',
  });
  assert(validProfitQuery.success, '4. Profit Query: Accepts monthly group by');

  // =========================================================
  // SECTION 2: Modular Exporter (CSV Engine)
  // =========================================================
  console.log('\n--- 2. Modular Report Exporter Engine ---');

  const exporter = new ModularReportExporter();
  const sampleData = [
    { name: 'Desk, "Executive"', price: 150.5, meta: { tag: 'Office' } },
    { name: 'Plain Chair', price: 99.0, meta: { tag: 'Seating' } },
  ];

  const csvOutput = exporter.generateCsv(
    [
      { header: 'Product Name', key: 'name' },
      { header: 'Price ($)', key: 'price', format: (v) => `$${Number(v).toFixed(2)}` },
      { header: 'Category', key: 'meta.tag' },
    ],
    sampleData
  );

  assert(csvOutput.includes('Product Name,Price ($),Category'), '5. CSV Exporter: Generates correct RFC header row');
  assert(csvOutput.includes('"Desk, ""Executive"""'), '6. CSV Exporter: Escapes commas and quotation marks safely');
  assert(csvOutput.includes('$150.50'), '7. CSV Exporter: Formats values using custom column formatters');
  assert(csvOutput.includes('Office'), '8. CSV Exporter: Extracts nested object properties (meta.tag)');

  // =========================================================
  // SECTION 3: Sales Report Calculations
  // =========================================================
  console.log('\n--- 3. Sales Report Calculations ---');

  const salesReport = (await service.getSalesReport({ page: 1, limit: 10, sortOrder: 'desc', format: 'json' })) as any;
  assert(!('csvData' in salesReport), '9. Sales Report: Returns structured JSON pagination payload');
  assert(salesReport.data && salesReport.data.length === 2, '10. Sales Report: Returns 2 sales records');
  assert(salesReport.summary.totalRevenue === 2000.0, '11. Sales Report: Sums total revenue ($2,000.00)');
  assert(salesReport.summary.totalTax === 200.0, '12. Sales Report: Sums total tax ($200.00)');
  assert(salesReport.summary.totalDiscounts === 30.0, '13. Sales Report: Sums discounts ($30.00)');
  assert(salesReport.summary.averageOrderValue === 1000.0, '14. Sales Report: Computes Average Order Value ($1,000.00)');

  // Sales CSV export
  const salesCsv = (await service.getSalesReport({ page: 1, limit: 10, sortOrder: 'desc', format: 'csv' })) as any;
  assert(salesCsv.csvData && salesCsv.csvData.includes('Invoice Number'), '15. Sales Report: Generates CSV export on demand');

  // =========================================================
  // SECTION 4: Purchases Report Calculations
  // =========================================================
  console.log('\n--- 4. Purchases Report Calculations ---');

  const purchaseReport = (await service.getPurchasesReport({ page: 1, limit: 10, sortOrder: 'desc', format: 'json' })) as any;
  assert(purchaseReport.data && purchaseReport.data.length === 1, '16. Purchases Report: Returns purchase orders');
  assert(purchaseReport.summary.totalSpend === 2200.0, '17. Purchases Report: Sums total spend ($2,200.00)');
  assert(purchaseReport.summary.totalItemsProcured === 20, '18. Purchases Report: Counts procured items (20 units)');
  assert(purchaseReport.data[0].supplierName === 'Global Wood Supply', '19. Purchases Report: Resolves supplier relation');

  // =========================================================
  // SECTION 5: Inventory Valuation & Health Report
  // =========================================================
  console.log('\n--- 5. Inventory Report Calculations ---');

  const invReport = (await service.getInventoryReport({ page: 1, limit: 10, sortOrder: 'desc', format: 'json', stockStatus: 'ALL' })) as any;
  // Total cost value = (25 * 90) + (4 * 60) + (60 * 10) + (0 * 20) = 2250 + 240 + 600 + 0 = 3090.00
  assert(invReport.summary.totalCostValuation === 3090.0, '20. Inventory Report: Dynamic cost valuation ($3,090.00)');
  // Total retail value = (25 * 150) + (4 * 100) + (60 * 25) + (0 * 40) = 3750 + 400 + 1500 + 0 = 5650.00
  assert(invReport.summary.totalRetailValuation === 5650.0, '21. Inventory Report: Dynamic retail valuation ($5,650.00)');
  assert(invReport.summary.lowStockCount === 1, '22. Inventory Report: Flags low-stock item (CHR-002)');
  assert(invReport.summary.overstockCount === 1, '23. Inventory Report: Flags overstocked item (PAD-003)');
  assert(invReport.summary.outOfStockCount === 1, '24. Inventory Report: Flags out-of-stock item (STN-004)');

  const chair = invReport.data.find((p: any) => p.sku === 'CHR-002');
  assert(chair?.statusTag === 'LOW_STOCK', '25. Inventory Report: Product tagged with LOW_STOCK status');

  // =========================================================
  // SECTION 6: Customers Ledger Report
  // =========================================================
  console.log('\n--- 6. Customers Report Calculations ---');

  const custReport = (await service.getCustomersReport({ page: 1, limit: 10, sortOrder: 'desc', format: 'json', activity: 'ALL' })) as any;
  assert(custReport.summary.totalCustomers === 2, '26. Customers Report: Counts total customers (2)');
  assert(custReport.summary.activeBuyersCount === 1, '27. Customers Report: Identifies active buyers (1)');
  assert(custReport.summary.totalCustomerSpend === 2000.0, '28. Customers Report: Aggregates lifetime spend ($2,000.00)');
  assert(custReport.summary.averageSpendPerCustomer === 1000.0, '29. Customers Report: Computes average spend per account ($1,000.00)');

  // =========================================================
  // SECTION 7: Expenses Report
  // =========================================================
  console.log('\n--- 7. Expenses Report Calculations ---');

  const expReport = (await service.getExpensesReport({ page: 1, limit: 10, sortOrder: 'desc', format: 'json' })) as any;
  assert(expReport.summary.totalExpenseAmount === 500.0, '30. Expenses Report: Sums total expenses ($500.00)');
  assert(expReport.summary.categoryBreakdown['Rent'] === 400.0, '31. Expenses Report: Rent category breakdown ($400.00)');
  assert(expReport.summary.categoryBreakdown['Electricity'] === 100.0, '32. Expenses Report: Electricity category breakdown ($100.00)');

  // =========================================================
  // SECTION 8: Profit & Loss Statement Report
  // =========================================================
  console.log('\n--- 8. Profit & Loss Report Calculations ---');

  const profitReport = (await service.getProfitReport({ page: 1, limit: 10, sortOrder: 'desc', format: 'json', groupBy: 'daily' })) as any;
  // Revenue: 2000.00
  // COGS: 900 + 300 = 1200.00
  // Gross Profit: 2000 - 1200 = 800.00
  // Expenses: 500.00
  // Net Profit: 800 - 500 = 300.00
  assert(profitReport.summary.revenue === 2000.0, '33. Profit Report: Total Revenue = $2,000.00');
  assert(profitReport.summary.cogs === 1200.0, '34. Profit Report: COGS = sum(quantity * unitCost) = $1,200.00');
  assert(profitReport.summary.grossProfit === 800.0, '35. Profit Report: Gross Profit = Revenue - COGS = $800.00');
  assert(profitReport.summary.expenses === 500.0, '36. Profit Report: Operating Expenses = $500.00');
  assert(profitReport.summary.netProfit === 300.0, '37. Profit Report: Net Profit = Gross Profit - Expenses = $300.00');
  assert(profitReport.summary.profitMargin === 40.0, '38. Profit Report: Gross Margin % = 40.0%');
  assert(profitReport.summary.netMargin === 15.0, '39. Profit Report: Net Margin % = 15.0%');

  // =========================================================
  // SECTION 9: Role-Based Access Control (RBAC)
  // =========================================================
  console.log('\n--- 9. Role-Based Permissions ---');

  const checkRole = (role: UserRole, allowed: UserRole[]): boolean => {
    let ok = false;
    const req = { user: { role } } as unknown as Request;
    const res = { status: () => ({ json: () => {} }) } as unknown as Response;
    const next: NextFunction = ((err?: any) => {
      if (!err) ok = true;
    }) as any;
    try {
      const mw = authorize(...allowed);
      mw(req, res, next);
    } catch {
      ok = false;
    }
    return ok;
  };

  const allowedRoles = [UserRole.ADMIN, UserRole.MANAGER];
  assert(!checkRole(UserRole.CASHIER, allowedRoles), '40. RBAC: Cashier role is strictly BLOCKED from reports (403)');
  assert(checkRole(UserRole.MANAGER, allowedRoles), '41. RBAC: Manager role is PERMITTED to view reports');
  assert(checkRole(UserRole.ADMIN, allowedRoles), '42. RBAC: Admin role is PERMITTED to view reports');

  console.log(`\n📊 Reports Module Test Suite Results: ${passedTests}/${totalTests} Passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runReportsTests().catch((err) => {
  console.error('Unhandled error in Reports test suite:', err);
  process.exit(1);
});
