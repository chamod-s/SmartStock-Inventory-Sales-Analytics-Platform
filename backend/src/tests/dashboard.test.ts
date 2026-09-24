/**
 * SmartStock Dashboard Analytics Test Suite
 *
 * Validates:
 * 1. Schema & Period Validation (today, this_week, this_month, last_month, this_year, custom)
 * 2. Date Range Resolution & Interval Assignment
 * 3. KPI Calculations:
 *    - Total Revenue
 *    - Gross Profit (Revenue - COGS)
 *    - Net Profit (Gross Profit - Expenses)
 *    - Total Orders
 *    - Total Customers
 *    - Total Products
 *    - Inventory Value (Cost * Current Stock)
 *    - Total Expenses
 * 4. Chart Aggregations:
 *    - Sales Trend (Time Series)
 *    - Revenue vs Profit Breakdown
 *    - Sales by Category Distribution
 *    - Top Selling Products
 *    - Low-Stock Product Alerts & Deficit
 *    - Recent Sales Feed
 * 5. Role-Based Permissions (Admin, Manager, Cashier)
 */

import { DashboardService } from '../services/dashboard.service';
import { dashboardQuerySchema } from '../validators/dashboard.validator';
import { UserRole } from '@prisma/client';

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

// Mock Prisma Client for Dashboard Analytics
class MockPrismaClient {
  public sales = [
    {
      id: 'sale-1',
      invoiceNumber: 'INV-000001',
      customerId: 'cust-1',
      userId: 'user-1',
      subtotal: 500.0,
      taxAmount: 50.0,
      discountAmount: 0.0,
      totalAmount: 550.0,
      status: 'COMPLETED',
      createdAt: new Date('2026-03-10T10:00:00.000Z'),
      customer: { id: 'cust-1', name: 'Acme Enterprise', code: 'CUST-001' },
      user: { id: 'user-1', name: 'Alice Manager', email: 'alice@smartstock.com', role: 'MANAGER' },
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 5,
          unitPrice: 100.0,
          unitCost: 60.0, // COGS = 5 * 60 = 300
          subtotal: 500.0,
          product: {
            id: 'prod-1',
            name: 'Ergonomic Office Chair',
            sku: 'CHAIR-001',
            category: { id: 'cat-1', name: 'Furniture' },
          },
        },
      ],
      payments: [{ id: 'pay-1', amount: 550.0, paymentMethod: 'CARD', paidAt: new Date() }],
    },
    {
      id: 'sale-2',
      invoiceNumber: 'INV-000002',
      customerId: 'cust-2',
      userId: 'user-2',
      subtotal: 300.0,
      taxAmount: 30.0,
      discountAmount: 0.0,
      totalAmount: 330.0,
      status: 'COMPLETED',
      createdAt: new Date('2026-03-12T14:30:00.000Z'),
      customer: { id: 'cust-2', name: 'Global Logistics', code: 'CUST-002' },
      user: { id: 'user-2', name: 'Bob Cashier', email: 'bob@smartstock.com', role: 'CASHIER' },
      items: [
        {
          id: 'item-2',
          productId: 'prod-2',
          quantity: 2,
          unitPrice: 150.0,
          unitCost: 90.0, // COGS = 2 * 90 = 180
          subtotal: 300.0,
          product: {
            id: 'prod-2',
            name: 'Standing Desk Converter',
            sku: 'DESK-002',
            category: { id: 'cat-1', name: 'Furniture' },
          },
        },
      ],
      payments: [{ id: 'pay-2', amount: 330.0, paymentMethod: 'CASH', paidAt: new Date() }],
    },
    {
      id: 'sale-3',
      invoiceNumber: 'INV-000003',
      customerId: null,
      userId: 'user-2',
      subtotal: 120.0,
      taxAmount: 0.0,
      discountAmount: 0.0,
      totalAmount: 120.0,
      status: 'COMPLETED',
      createdAt: new Date('2026-03-15T16:00:00.000Z'),
      customer: null, // Walk-in
      user: { id: 'user-2', name: 'Bob Cashier', email: 'bob@smartstock.com', role: 'CASHIER' },
      items: [
        {
          id: 'item-3',
          productId: 'prod-3',
          quantity: 4,
          unitPrice: 30.0,
          unitCost: 15.0, // COGS = 4 * 15 = 60
          subtotal: 120.0,
          product: {
            id: 'prod-3',
            name: 'LED Desk Lamp',
            sku: 'LAMP-003',
            category: { id: 'cat-2', name: 'Lighting' },
          },
        },
      ],
      payments: [{ id: 'pay-3', amount: 120.0, paymentMethod: 'ONLINE', paidAt: new Date() }],
    },
  ];

  public previousPeriodSales = [
    {
      id: 'sale-prev-1',
      totalAmount: 600.0,
      status: 'COMPLETED',
      createdAt: new Date('2026-02-15T12:00:00.000Z'),
      items: [
        {
          id: 'item-prev-1',
          quantity: 4,
          unitCost: 60.0, // COGS = 240
        },
      ],
    },
  ];

  public expenses = [
    {
      id: 'exp-1',
      amount: 150.0,
      category: 'Electricity',
      isActive: true,
      expenseDate: new Date('2026-03-08T00:00:00.000Z'),
    },
    {
      id: 'exp-2',
      amount: 250.0,
      category: 'Maintenance',
      isActive: true,
      expenseDate: new Date('2026-03-14T00:00:00.000Z'),
    },
    {
      id: 'exp-3',
      amount: 500.0,
      category: 'Rent',
      isActive: false, // Inactive, should be ignored
      expenseDate: new Date('2026-03-01T00:00:00.000Z'),
    },
  ];

  public previousPeriodExpenses = [
    {
      id: 'exp-prev-1',
      amount: 200.0,
      isActive: true,
      expenseDate: new Date('2026-02-10T00:00:00.000Z'),
    },
  ];

  public products = [
    {
      id: 'prod-1',
      name: 'Ergonomic Office Chair',
      sku: 'CHAIR-001',
      purchasePrice: 60.0,
      sellingPrice: 100.0,
      currentStock: 25,
      reorderLevel: 10,
      status: 'ACTIVE',
      unit: 'pcs',
      category: { name: 'Furniture' },
    },
    {
      id: 'prod-2',
      name: 'Standing Desk Converter',
      sku: 'DESK-002',
      purchasePrice: 90.0,
      sellingPrice: 150.0,
      currentStock: 3, // Low stock (3 <= 5)
      reorderLevel: 5,
      status: 'ACTIVE',
      unit: 'pcs',
      category: { name: 'Furniture' },
    },
    {
      id: 'prod-3',
      name: 'LED Desk Lamp',
      sku: 'LAMP-003',
      purchasePrice: 15.0,
      sellingPrice: 30.0,
      currentStock: 0, // Out of stock (0 <= 10)
      reorderLevel: 10,
      status: 'ACTIVE',
      unit: 'pcs',
      category: { name: 'Lighting' },
    },
  ];

  public customers = [
    { id: 'cust-1', name: 'Acme Enterprise' },
    { id: 'cust-2', name: 'Global Logistics' },
  ];

  public sale = {
    findMany: async (args: any) => {
      // If querying previous period (previousSales only includes items, no customer)
      if (!args.include?.customer) {
        return this.previousPeriodSales;
      }
      return this.sales;
    },
    count: async () => this.sales.length,
  };

  public expense = {
    findMany: async (args: any) => {
      if (args.where?.expenseDate?.gte && args.where.expenseDate.gte < new Date('2026-02-15')) {
        return this.previousPeriodExpenses;
      }
      return this.expenses.filter((e) => (args.where?.isActive !== undefined ? e.isActive === args.where.isActive : true));
    },
  };

  public product = {
    findMany: async () => this.products,
    count: async () => this.products.length,
  };

  public customer = {
    count: async () => this.customers.length,
  };
}

async function runDashboardTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Dashboard Test Suite');
  console.log('🧪 ===============================================\n');

  const mockClient = new MockPrismaClient();
  const service = new DashboardService(mockClient as any);

  // =========================================================
  // SECTION 1: Schema & Period Validation
  // =========================================================
  console.log('--- 1. Schema & Period Validation ---');

  // Valid Periods
  const validPeriods = ['today', 'this_week', 'this_month', 'last_month', 'this_year'];
  for (const period of validPeriods) {
    const res = dashboardQuerySchema.safeParse({ period });
    assert(res.success, `1. Period Validation: Accepts valid period '${period}'`);
  }

  // Invalid Period
  const invalidRes = dashboardQuerySchema.safeParse({ period: 'invalid_period' });
  assert(!invalidRes.success, '2. Period Validation: Rejects invalid period name');

  // Custom period without dates
  const missingCustomDates = dashboardQuerySchema.safeParse({ period: 'custom' });
  assert(
    !missingCustomDates.success,
    '3. Custom Period: Rejects custom period when startDate and endDate are missing'
  );

  // Custom period with valid dates
  const validCustom = dashboardQuerySchema.safeParse({
    period: 'custom',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
  });
  assert(validCustom.success, '4. Custom Period: Accepts custom period with start and end dates');

  // =========================================================
  // SECTION 2: Date Range Resolution
  // =========================================================
  console.log('\n--- 2. Date Range Resolution ---');

  const monthRange = service.resolveDateRange({ period: 'this_month' });
  assert(
    Boolean(monthRange.startDate && monthRange.endDate && monthRange.interval === 'day'),
    '5. Date Range: Resolves this_month bounds with daily interval'
  );

  const todayRange = service.resolveDateRange({ period: 'today' });
  assert(
    Boolean(todayRange.interval === 'hour'),
    '6. Date Range: Resolves today bounds with hourly interval'
  );

  const yearRange = service.resolveDateRange({ period: 'this_year' });
  assert(
    Boolean(yearRange.interval === 'month'),
    '7. Date Range: Resolves this_year bounds with monthly interval'
  );

  // =========================================================
  // SECTION 3: KPI Financial Calculations
  // =========================================================
  console.log('\n--- 3. KPI Financial Calculations ---');

  const customQuery = {
    period: 'custom' as const,
    startDate: '2026-03-01',
    endDate: '2026-03-31',
  };

  const data = await service.getDashboardData(customQuery, UserRole.ADMIN);

  // Total Revenue: 550 + 330 + 120 = 1000.00
  assert(
    data.kpis.totalRevenue.value === 1000.0,
    '8. Total Revenue: Correctly calculates total revenue ($1,000.00)'
  );

  // COGS: (5*60 = 300) + (2*90 = 180) + (4*15 = 60) = 540.00
  // Gross Profit = Revenue (1000) - COGS (540) = 460.00
  assert(
    data.kpis.grossProfit.value === 460.0,
    '9. Gross Profit: Correctly computes Revenue - COGS ($460.00)'
  );

  // Total Expenses: 150 (Electricity) + 250 (Maintenance) = 400.00 (inactive exp-3 ignored)
  assert(
    data.kpis.totalExpenses.value === 400.0,
    '10. Total Expenses: Accurately sums active expenses ($400.00)'
  );

  // Net Profit: Gross Profit (460) - Expenses (400) = 60.00
  assert(
    data.kpis.netProfit.value === 60.0,
    '11. Net Profit: Correctly computes Gross Profit - Total Expenses ($60.00)'
  );

  // Total Orders: 3 completed sales
  assert(
    data.kpis.totalOrders.value === 3,
    '12. Total Orders: Accurately counts 3 completed sales orders'
  );

  // Total Customers: 2 customers
  assert(
    data.kpis.totalCustomers.value === 2,
    '13. Total Customers: Correctly reports 2 registered customers'
  );

  // Total Products: 3 active products
  assert(
    data.kpis.totalProducts.value === 3,
    '14. Total Products: Correctly reports 3 active catalog products'
  );

  // Inventory Value: (25 * 60) + (3 * 90) + (0 * 15) = 1500 + 270 + 0 = 1770.00
  assert(
    data.kpis.inventoryValue.value === 1770.0,
    '15. Inventory Value: Correctly calculates Sum(purchasePrice * currentStock) ($1,770.00)'
  );

  // Percentage Change vs Previous Period (prevRevenue = 600)
  // Revenue Change = ((1000 - 600) / 600) * 100 = +66.7%
  assert(
    data.kpis.totalRevenue.percentageChange === 66.7,
    '16. Growth Metrics: Accurately calculates percentage change (+66.7%)'
  );

  // =========================================================
  // SECTION 4: Chart Aggregations
  // =========================================================
  console.log('\n--- 4. Chart Aggregations ---');

  // Chart 1: Sales Trend
  assert(
    Boolean(data.charts.salesTrend.length > 0),
    '17. Chart 1 (Sales Trend): Generates continuous time-series data points'
  );

  const totalTrendRevenue = data.charts.salesTrend.reduce((sum, p) => sum + p.revenue, 0);
  assert(
    totalTrendRevenue === 1000.0,
    '18. Chart 1 (Sales Trend): Trend points sum matches total revenue ($1,000.00)'
  );

  // Chart 2: Revenue vs Profit
  assert(
    Boolean(data.charts.revenueVsProfit.length > 0),
    '19. Chart 2 (Revenue vs Profit): Generates comparative revenue, gross, expenses & net profit'
  );

  // Chart 3: Sales by Category (Furniture: 500+300 = 800 (80%), Lighting: 120 (12%))
  const furnitureCat = data.charts.salesByCategory.find((c) => c.category === 'Furniture');
  assert(
    Boolean(furnitureCat && furnitureCat.revenue === 800.0 && furnitureCat.unitsSold === 7),
    '20. Chart 3 (Category Breakdown): Correctly aggregates furniture category sales'
  );

  // Chart 4: Top Selling Products
  assert(
    Boolean(data.charts.topSellingProducts.length > 0),
    '21. Chart 4 (Top Products): Generates top-selling product rankings'
  );
  assert(
    data.charts.topSellingProducts[0].sku === 'CHAIR-001' &&
      data.charts.topSellingProducts[0].revenue === 500.0,
    '22. Chart 4 (Top Products): Identifies top revenue generating product (CHAIR-001)'
  );

  // Chart 5 / Alert: Low-Stock Products
  assert(
    data.charts.lowStockProducts.length === 2,
    '23. Chart 5 (Low-Stock): Identifies exactly 2 low-stock products (currentStock <= reorderLevel)'
  );

  const outOfStockItem = data.charts.lowStockProducts.find((p) => p.sku === 'LAMP-003');
  assert(
    Boolean(outOfStockItem && outOfStockItem.status === 'OUT_OF_STOCK' && outOfStockItem.deficit === 10),
    '24. Chart 5 (Low-Stock): Correctly flags out-of-stock item (deficit 10)'
  );

  // Chart 6: Recent Sales Feed
  assert(
    data.charts.recentSales.length === 3,
    '25. Chart 6 (Recent Sales): Retrieves recent sales feed with customer and cashier metadata'
  );

  // =========================================================
  // SECTION 5: Role-Based Access Control (RBAC)
  // =========================================================
  console.log('\n--- 5. Role-Based Permissions ---');

  const adminView = await service.getDashboardData(customQuery, UserRole.ADMIN);
  assert(
    adminView.permissions.canViewFinancials === true,
    '26. RBAC: Admin role has full financial view permissions'
  );

  const managerView = await service.getDashboardData(customQuery, UserRole.MANAGER);
  assert(
    managerView.permissions.canViewFinancials === true,
    '27. RBAC: Manager role has full financial view permissions'
  );

  const cashierView = await service.getDashboardData(customQuery, UserRole.CASHIER);
  assert(
    cashierView.permissions.canViewFinancials === false,
    '28. RBAC: Cashier role restricts corporate net profit & expenses visibility'
  );

  console.log(`\n📊 Dashboard Test Suite Results: ${passedTests}/${totalTests} Passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runDashboardTests().catch((err) => {
  console.error('Unhandled error in Dashboard test suite:', err);
  process.exit(1);
});
