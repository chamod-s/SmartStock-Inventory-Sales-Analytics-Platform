/**
 * SmartStock Analytics Service & Formula Test Suite
 *
 * Verifies:
 * 1. Financial Analytics:
 *    - Revenue = sales revenue
 *    - COGS = sum(quantity * unitCost)
 *    - Gross Profit = Revenue - COGS
 *    - Net Profit = Gross Profit - Expenses
 *    - Profit Margin = Gross Profit / Revenue * 100 (Safe Zero Handling)
 * 2. Sales Analytics:
 *    - Revenue, Orders, Average Order Value (AOV), Sales Growth
 *    - Daily, Weekly, Monthly, Yearly Sales breakdowns
 * 3. Product Analytics:
 *    - Best Sellers, Slow-Moving Products, Most & Least Profitable, Product Trends
 * 4. Inventory Analytics:
 *    - Stock Value, Retail Value, Low Stock, Overstock, Dead Stock, Turnover Ratio, Stock Movement
 * 5. Customer Analytics:
 *    - Total, New, Repeat, Repeat Rate %, Top Customers Leaderboard, ACV
 * 6. Role-Based Access Control (RBAC):
 *    - Admin and Manager authorized, Cashier blocked
 */

import { AnalyticsService } from '../services/analytics.service';
import { analyticsQuerySchema } from '../validators/analytics.validator';
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

// Mock Prisma Client for Comprehensive Analytics
class MockPrismaClient {
  public sales = [
    {
      id: 'sale-1',
      totalAmount: 1200.0,
      status: 'COMPLETED',
      createdAt: new Date('2026-03-05T10:00:00.000Z'),
      customerId: 'cust-1',
      items: [
        {
          productId: 'prod-1',
          quantity: 10,
          unitPrice: 100.0,
          unitCost: 60.0, // COGS = 600, Subtotal = 1000
          subtotal: 1000.0,
          product: {
            id: 'prod-1',
            name: 'Ergonomic Desk Chair',
            sku: 'CHAIR-001',
            category: { name: 'Furniture' },
          },
        },
        {
          productId: 'prod-2',
          quantity: 2,
          unitPrice: 100.0,
          unitCost: 40.0, // COGS = 80, Subtotal = 200
          subtotal: 200.0,
          product: {
            id: 'prod-2',
            name: 'Desk Pad Pro',
            sku: 'PAD-002',
            category: { name: 'Accessories' },
          },
        },
      ],
      customer: { id: 'cust-1', name: 'Apex Corp', code: 'CUST-001' },
    },
    {
      id: 'sale-2',
      totalAmount: 800.0,
      status: 'COMPLETED',
      createdAt: new Date('2026-03-12T14:30:00.000Z'),
      customerId: 'cust-1', // Repeat customer
      items: [
        {
          productId: 'prod-1',
          quantity: 8,
          unitPrice: 100.0,
          unitCost: 60.0, // COGS = 480, Subtotal = 800
          subtotal: 800.0,
          product: {
            id: 'prod-1',
            name: 'Ergonomic Desk Chair',
            sku: 'CHAIR-001',
            category: { name: 'Furniture' },
          },
        },
      ],
      customer: { id: 'cust-1', name: 'Apex Corp', code: 'CUST-001' },
    },
  ];

  public prevSales = [
    {
      id: 'sale-prev',
      totalAmount: 1600.0,
      status: 'COMPLETED',
      createdAt: new Date('2026-02-10T10:00:00.000Z'),
      items: [],
    },
  ];

  public expenses = [
    {
      id: 'exp-1',
      amount: 300.0,
      category: 'Rent',
      isActive: true,
      expenseDate: new Date('2026-03-01T00:00:00.000Z'),
    },
    {
      id: 'exp-2',
      amount: 100.0,
      category: 'Electricity',
      isActive: true,
      expenseDate: new Date('2026-03-15T00:00:00.000Z'),
    },
    {
      id: 'exp-3',
      amount: 50.0,
      category: 'Transport',
      isActive: false, // inactive, ignored
      expenseDate: new Date('2026-03-10T00:00:00.000Z'),
    },
  ];

  public products = [
    {
      id: 'prod-1',
      name: 'Ergonomic Desk Chair',
      sku: 'CHAIR-001',
      purchasePrice: 60.0,
      sellingPrice: 100.0,
      currentStock: 20,
      reorderLevel: 10,
      status: 'ACTIVE',
      category: { name: 'Furniture' },
    },
    {
      id: 'prod-2',
      name: 'Desk Pad Pro',
      sku: 'PAD-002',
      purchasePrice: 40.0,
      sellingPrice: 100.0,
      currentStock: 50, // Overstock (50 > 3 * 10 and >= 15)
      reorderLevel: 10,
      status: 'ACTIVE',
      category: { name: 'Accessories' },
    },
    {
      id: 'prod-3',
      name: 'Vintage Lamp',
      sku: 'LAMP-003',
      purchasePrice: 25.0,
      sellingPrice: 50.0,
      currentStock: 12, // Dead stock (12 in stock, 0 sold)
      reorderLevel: 5,
      status: 'ACTIVE',
      category: { name: 'Lighting' },
    },
    {
      id: 'prod-4',
      name: 'USB Cable 3m',
      sku: 'CBL-004',
      purchasePrice: 5.0,
      sellingPrice: 15.0,
      currentStock: 2, // Low stock (2 <= 5)
      reorderLevel: 5,
      status: 'ACTIVE',
      category: { name: 'Accessories' },
    },
  ];

  public customers = [
    {
      id: 'cust-1',
      name: 'Apex Corp',
      code: 'CUST-001',
      email: 'apex@corp.com',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      sales: [
        { totalAmount: 1200.0, createdAt: new Date() },
        { totalAmount: 800.0, createdAt: new Date() },
      ],
    },
    {
      id: 'cust-2',
      name: 'Beta LLC',
      code: 'CUST-002',
      email: 'beta@llc.com',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      sales: [],
    },
  ];

  public inventoryTransactions = [
    { id: 'tx-1', quantity: 50, type: 'PURCHASE', createdAt: new Date('2026-03-02') },
    { id: 'tx-2', quantity: -20, type: 'SALE', createdAt: new Date('2026-03-05') },
  ];

  public sale = {
    findMany: async (args: any) => {
      if (args.where?.createdAt?.lte && args.where.createdAt.lte < new Date('2026-03-01')) {
        return this.prevSales;
      }
      return this.sales;
    },
  };

  public expense = {
    findMany: async (args: any) => {
      return this.expenses.filter((e) => (args.where?.isActive !== undefined ? e.isActive === args.where.isActive : true));
    },
  };

  public product = {
    findMany: async () => this.products,
  };

  public customer = {
    findMany: async () => this.customers,
  };

  public inventoryTransaction = {
    findMany: async () => this.inventoryTransactions,
  };
}

async function runAnalyticsTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Analytics Module Test Suite');
  console.log('🧪 ===============================================\n');

  const mockClient = new MockPrismaClient();
  const service = new AnalyticsService(mockClient as any);

  // =========================================================
  // SECTION 1: Schema & Period Validation
  // =========================================================
  console.log('--- 1. Schema & Period Validation ---');

  const supportedPeriods = ['today', '7d', '30d', '90d', 'this_month', 'last_month', 'this_year', 'all_time'];
  for (const p of supportedPeriods) {
    const res = analyticsQuerySchema.safeParse({ period: p });
    assert(res.success, `1. Period Validation: Accepts supported period '${p}'`);
  }

  const invalidP = analyticsQuerySchema.safeParse({ period: 'unknown_period' });
  assert(!invalidP.success, '2. Period Validation: Rejects unsupported period');

  const missingCustom = analyticsQuerySchema.safeParse({ period: 'custom' });
  assert(!missingCustom.success, '3. Custom Validation: Rejects custom period when dates are missing');

  const validCustom = analyticsQuerySchema.safeParse({
    period: 'custom',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
  });
  assert(validCustom.success, '4. Custom Validation: Accepts custom period with start and end dates');

  // =========================================================
  // SECTION 2: Financial Analytics Formulas & Zero Handling
  // =========================================================
  console.log('\n--- 2. Financial Analytics Calculations & Zero Handling ---');

  const query = { period: 'custom' as const, startDate: '2026-03-01', endDate: '2026-03-31' };
  const data = await service.getComprehensiveAnalytics(query);

  // Total Revenue: 1200 + 800 = 2000.00
  assert(
    data.financials.revenue === 2000.0,
    '5. Financials: Revenue = total completed sales revenue ($2,000.00)'
  );

  // COGS:
  // Sale 1: (10 * 60) + (2 * 40) = 600 + 80 = 680
  // Sale 2: (8 * 60) = 480
  // Total COGS = 680 + 480 = 1160.00
  assert(
    data.financials.cogs === 1160.0,
    '6. Financials: COGS = sum(quantity * unitCost) ($1,160.00)'
  );

  // Gross Profit = Revenue - COGS = 2000 - 1160 = 840.00
  assert(
    data.financials.grossProfit === 840.0,
    '7. Financials: Gross Profit = Revenue - COGS ($840.00)'
  );

  // Expenses: 300 (Rent) + 100 (Electricity) = 400.00 (inactive 50 transport ignored)
  assert(
    data.financials.expenses === 400.0,
    '8. Financials: Expenses = sum of active operating overhead ($400.00)'
  );

  // Net Profit = Gross Profit - Expenses = 840 - 400 = 440.00
  assert(
    data.financials.netProfit === 440.0,
    '9. Financials: Net Profit = Gross Profit - Expenses ($440.00)'
  );

  // Profit Margin = (Gross Profit / Revenue) * 100 = (840 / 2000) * 100 = 42.0%
  assert(
    data.financials.profitMargin === 42.0,
    '10. Financials: Profit Margin = Gross Profit / Revenue * 100 (42.0%)'
  );

  // Net Margin = (Net Profit / Revenue) * 100 = (440 / 2000) * 100 = 22.0%
  assert(
    data.financials.netMargin === 22.0,
    '11. Financials: Net Margin = Net Profit / Revenue * 100 (22.0%)'
  );

  // Zero Revenue Safety Verification
  const zeroDivMargin = service.safeDivision(500, 0);
  assert(
    zeroDivMargin === 0 && !isNaN(zeroDivMargin) && isFinite(zeroDivMargin),
    '12. Zero Revenue: Safe division handles zero denominator without NaN or Infinity'
  );

  // =========================================================
  // SECTION 3: Sales Analytics Calculations
  // =========================================================
  console.log('\n--- 3. Sales Analytics ---');

  // Total Orders: 2
  assert(data.sales.orders === 2, '13. Sales: Accurately counts 2 completed sales orders');

  // Average Order Value (AOV): Revenue (2000) / Orders (2) = 1000.00
  assert(
    data.sales.averageOrderValue === 1000.0,
    '14. Sales: Average Order Value (AOV) = Revenue / Orders ($1,000.00)'
  );

  // Sales Growth: prevRevenue = 1600. Growth = ((2000 - 1600) / 1600) * 100 = +25.0%
  assert(
    data.sales.salesGrowth === 25.0,
    '15. Sales: Sales Growth accurately compares vs previous period (+25.0%)'
  );

  // Daily Sales breakdown
  assert(
    data.sales.dailySales.length === 2 && data.sales.dailySales[0].revenue === 1200.0,
    '16. Sales: Generates Daily sales breakdown accurately'
  );

  // Weekly Sales breakdown
  assert(
    data.sales.weeklySales.length > 0,
    '17. Sales: Generates Weekly sales breakdown accurately'
  );

  // Monthly Sales breakdown
  assert(
    data.sales.monthlySales.length === 1 && data.sales.monthlySales[0].revenue === 2000.0,
    '18. Sales: Generates Monthly sales breakdown accurately'
  );

  // Yearly Sales breakdown
  assert(
    data.sales.yearlySales.length === 1 && data.sales.yearlySales[0].revenue === 2000.0,
    '19. Sales: Generates Yearly sales breakdown accurately'
  );

  // =========================================================
  // SECTION 4: Product Analytics Calculations
  // =========================================================
  console.log('\n--- 4. Product Analytics ---');

  // Best Sellers (prod-1 has 18 units sold, prod-2 has 2 units sold)
  assert(
    data.products.bestSellers[0].sku === 'CHAIR-001' && data.products.bestSellers[0].unitsSold === 18,
    '20. Product Analytics: Identifies Best Seller product by units sold (CHAIR-001 with 18 units)'
  );

  // Slow Moving (prod-3 has 0 units sold with 12 in stock, prod-4 has 0 units sold with 2 in stock, prod-2 has 2 units sold with 50 in stock)
  assert(
    data.products.slowMoving.some((p) => p.sku === 'LAMP-003' && p.unitsSold === 0),
    '21. Product Analytics: Accurately identifies slow-moving products with low/zero velocity'
  );

  // Most Profitable:
  // prod-1: Revenue 1800 - Cost 1080 = Profit 720.00
  // prod-2: Revenue 200 - Cost 80 = Profit 120.00
  assert(
    data.products.mostProfitable[0].sku === 'CHAIR-001' && data.products.mostProfitable[0].profit === 720.0,
    '22. Product Analytics: Accurately identifies most profitable product by gross margin'
  );

  // Least Profitable:
  assert(
    data.products.leastProfitable[0].profit === 0.0,
    '23. Product Analytics: Identifies products with lowest/zero gross profit'
  );

  // =========================================================
  // SECTION 5: Inventory Analytics Calculations
  // =========================================================
  console.log('\n--- 5. Inventory Analytics ---');

  // Stock Value:
  // prod-1: 20 * 60 = 1200
  // prod-2: 50 * 40 = 2000
  // prod-3: 12 * 25 = 300
  // prod-4: 2 * 5 = 10
  // Total Stock Value = 1200 + 2000 + 300 + 10 = 3510.00
  assert(
    data.inventory.stockValue === 3510.0,
    '24. Inventory Analytics: Calculates total stock valuation at cost ($3,510.00)'
  );

  // Retail Value:
  // prod-1: 20 * 100 = 2000
  // prod-2: 50 * 100 = 5000
  // prod-3: 12 * 50 = 600
  // prod-4: 2 * 15 = 30
  // Total Retail Value = 7630.00
  assert(
    data.inventory.retailValue === 7630.0,
    '25. Inventory Analytics: Calculates total stock retail valuation ($7,630.00)'
  );

  // Low stock: prod-4 has currentStock 2 <= reorderLevel 5
  assert(
    data.inventory.lowStockCount === 1,
    '26. Inventory Analytics: Detects low stock products (1 item)'
  );

  // Overstock: prod-2 has currentStock 50 > (reorder 10 * 3) and >= 15
  assert(
    data.inventory.overstockCount === 1 && data.inventory.overstockItems[0].sku === 'PAD-002',
    '27. Inventory Analytics: Detects overstocked inventory items (PAD-002 with 50 units)'
  );

  // Dead stock: prod-3 has stock 12 and 0 units sold
  assert(
    data.inventory.deadStockCount > 0 && data.inventory.deadStockItems.some((d) => d.sku === 'LAMP-003'),
    '28. Inventory Analytics: Detects dead stock with zero sales in period (LAMP-003)'
  );

  // Inventory Turnover Ratio = COGS / Stock Value = 1160 / 3510 = 0.33
  assert(
    data.inventory.inventoryTurnoverRatio === 0.33,
    '29. Inventory Analytics: Calculates inventory turnover ratio (COGS / Stock Value = 0.33)'
  );

  // Stock Movement: unitsIn = 50, unitsOut = 20, net = 30
  assert(
    data.inventory.stockMovement.unitsIn === 50 &&
      data.inventory.stockMovement.unitsOut === 20 &&
      data.inventory.stockMovement.netMovement === 30,
    '30. Inventory Analytics: Tracks inbound/outbound stock movements (+30 net)'
  );

  // =========================================================
  // SECTION 6: Customer Analytics Calculations
  // =========================================================
  console.log('\n--- 6. Customer Analytics ---');

  // Total Customers: 2
  assert(data.customers.totalCustomers === 2, '31. Customers: Correct total customer count (2)');

  // New Customers: cust-1 created on 2026-03-01
  assert(data.customers.newCustomers === 1, '32. Customers: Counts new customer acquisitions (1)');

  // Repeat Customers: cust-1 has 2 completed sales (> 1)
  assert(data.customers.repeatCustomers === 1, '33. Customers: Accurately identifies repeat buyers (1)');

  // Repeat Customer Rate: 1 / 1 active = 100.0%
  assert(data.customers.repeatCustomerRate === 100.0, '34. Customers: Calculates repeat customer rate (100.0%)');

  // Top Customers: cust-1 spent 2000.00
  assert(
    data.customers.topCustomers[0].name === 'Apex Corp' && data.customers.topCustomers[0].totalSpent === 2000.0,
    '35. Customers: Identifies top spending customer ($2,000.00 lifetime spend)'
  );

  // Average Customer Value: Revenue 2000 / 2 total customers = 1000.00
  assert(
    data.customers.averageCustomerValue === 1000.0,
    '36. Customers: Calculates Average Customer Value ($1,000.00)'
  );

  // =========================================================
  // SECTION 7: Role-Based Access Control (RBAC)
  // =========================================================
  console.log('\n--- 7. Role-Based Permissions ---');

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
  assert(!checkRole(UserRole.CASHIER, allowedRoles), '37. RBAC: Cashier role is strictly BLOCKED from dedicated analytics (403)');
  assert(checkRole(UserRole.MANAGER, allowedRoles), '38. RBAC: Manager role is PERMITTED to view analytics');
  assert(checkRole(UserRole.ADMIN, allowedRoles), '39. RBAC: Admin role is PERMITTED to view analytics');

  console.log(`\n📊 Analytics Test Suite Results: ${passedTests}/${totalTests} Passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAnalyticsTests().catch((err) => {
  console.error('Unhandled error in Analytics test suite:', err);
  process.exit(1);
});
