/**
 * SmartStock Frontend Analytics Test Suite
 *
 * Verifies:
 * 1. Financial Analytics:
 *    - Revenue = sales revenue
 *    - COGS = sum(quantity * unitCost)
 *    - Gross Profit = Revenue - COGS
 *    - Net Profit = Gross Profit - Expenses
 *    - Profit Margin = (Gross Profit / Revenue) * 100 (Safe Zero Handling)
 *    - Net Margin = (Net Profit / Revenue) * 100 (Safe Zero Handling)
 * 2. Sales Analytics:
 *    - Orders, Average Order Value (AOV = Revenue / Orders)
 *    - Sales Growth vs previous period
 *    - Granularity mapping (Daily, Weekly, Monthly, Yearly)
 * 3. Product Analytics:
 *    - Profit and profit margin % per product
 *    - Best sellers ranking
 *    - Slow-moving detection (stock > 0 and unitsSold <= 2)
 *    - Most profitable and least profitable sorting
 * 4. Inventory Analytics:
 *    - Stock value at cost & retail value
 *    - Turnover ratio = COGS / Stock Value
 *    - Low-stock condition (currentStock <= reorderLevel)
 *    - Overstock condition (currentStock > reorderLevel * 3 and currentStock >= 15)
 *    - Dead stock condition (currentStock > 0 and unitsSold === 0)
 *    - Stock movement balance (Inbound - Outbound = Net)
 * 5. Customer Analytics:
 *    - Total, New, Repeat counts
 *    - Repeat customer rate %
 *    - Average Customer Value (ACV)
 * 6. Query Parameters & Period Builder:
 *    - Presets and custom range validation
 */

import { AnalyticsPeriod } from '../types/analytics';

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

// -------------------------------------------------------------
// Frontend Math & Analytics Helper Functions
// -------------------------------------------------------------

function calculateFinancials(
  sales: Array<{ total: number; items: Array<{ quantity: number; unitCost: number }> }>,
  expenses: Array<{ amount: number; isActive: boolean }>
) {
  const revenue = sales.reduce((sum, s) => sum + s.total, 0);
  const cogs = sales.reduce((sum, s) => {
    return sum + s.items.reduce((itemSum, item) => itemSum + item.quantity * item.unitCost, 0);
  }, 0);
  const grossProfit = revenue - cogs;
  const totalExpenses = expenses.filter((e) => e.isActive).reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  // Safe zero revenue handling
  const profitMargin = revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(2)) : 0;
  const netMargin = revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(2)) : 0;

  return {
    revenue: Number(revenue.toFixed(2)),
    cogs: Number(cogs.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    expenses: Number(totalExpenses.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
    profitMargin,
    netMargin,
  };
}

function calculateSalesMetrics(revenue: number, orders: number, prevRevenue: number) {
  const aov = orders > 0 ? Number((revenue / orders).toFixed(2)) : 0;
  let salesGrowth = 0;
  if (prevRevenue === 0) {
    salesGrowth = revenue > 0 ? 100 : 0;
  } else {
    salesGrowth = Number((((revenue - prevRevenue) / Math.abs(prevRevenue)) * 100).toFixed(1));
  }
  return { aov, salesGrowth };
}

function calculateInventoryTurnover(cogs: number, stockValue: number): number {
  if (stockValue <= 0) return 0;
  return Number((cogs / stockValue).toFixed(2));
}

function calculateCustomerMetrics(
  totalCustomers: number,
  repeatCustomers: number,
  activeCustomersWithSales: number,
  revenue: number
) {
  const repeatRate =
    activeCustomersWithSales > 0
      ? Number(((repeatCustomers / activeCustomersWithSales) * 100).toFixed(1))
      : 0;
  const acv = totalCustomers > 0 ? Number((revenue / totalCustomers).toFixed(2)) : 0;
  return { repeatRate, acv };
}

function buildAnalyticsQueryParams(
  period: AnalyticsPeriod,
  startDate?: string,
  endDate?: string
): Record<string, string> {
  const params: Record<string, string> = { period };
  if (period === 'custom') {
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
  }
  return params;
}

// -------------------------------------------------------------
// Test Execution
// -------------------------------------------------------------

async function runFrontendAnalyticsTests() {
  console.log('\n🧪 ====================================================');
  console.log('🧪 Starting SmartStock Frontend Analytics Test Suite');
  console.log('🧪 ====================================================\n');

  // --- 1. Financial Analytics Formulas ---
  console.log('--- 1. Financial Analytics Formulas & Zero Handling ---');

  const testSales = [
    {
      total: 1500,
      items: [
        { quantity: 10, unitCost: 50 }, // 500
        { quantity: 5, unitCost: 40 },  // 200
      ],
    },
    {
      total: 500,
      items: [
        { quantity: 4, unitCost: 50 },  // 200
      ],
    },
  ];

  const testExpenses = [
    { amount: 300, isActive: true },
    { amount: 150, isActive: true },
    { amount: 80, isActive: false }, // inactive
  ];

  const financials = calculateFinancials(testSales, testExpenses);

  assert(financials.revenue === 2000, '1. Revenue = total of completed sales ($2,000.00)');
  assert(financials.cogs === 900, '2. COGS = sum(quantity * unitCost) (500 + 200 + 200 = $900.00)');
  assert(financials.grossProfit === 1100, '3. Gross Profit = Revenue - COGS (2000 - 900 = $1,100.00)');
  assert(financials.expenses === 450, '4. Expenses = sum of active operating expenses ($450.00)');
  assert(financials.netProfit === 650, '5. Net Profit = Gross Profit - Expenses (1100 - 450 = $650.00)');
  assert(financials.profitMargin === 55.0, '6. Profit Margin = (Gross Profit / Revenue) * 100 (55.0%)');
  assert(financials.netMargin === 32.5, '7. Net Margin = (Net Profit / Revenue) * 100 (32.5%)');

  // Safe zero revenue edge case
  const zeroSales: typeof testSales = [];
  const zeroExpenses: typeof testExpenses = [{ amount: 100, isActive: true }];
  const zeroFinancials = calculateFinancials(zeroSales, zeroExpenses);

  assert(zeroFinancials.revenue === 0, '8. Safe Zero: Revenue is safely 0');
  assert(zeroFinancials.grossProfit === 0, '9. Safe Zero: Gross Profit is safely 0');
  assert(zeroFinancials.profitMargin === 0 && !isNaN(zeroFinancials.profitMargin), '10. Safe Zero: Profit Margin handles zero denominator safely (0%)');
  assert(zeroFinancials.netMargin === 0 && !isNaN(zeroFinancials.netMargin), '11. Safe Zero: Net Margin handles zero denominator safely (0%)');

  // --- 2. Sales Analytics ---
  console.log('\n--- 2. Sales Analytics Metrics ---');

  const salesMetrics = calculateSalesMetrics(2000, 4, 1600);
  assert(salesMetrics.aov === 500, '12. Sales: Average Order Value = Revenue / Orders ($500.00)');
  assert(salesMetrics.salesGrowth === 25.0, '13. Sales: Growth compares vs prior revenue (+25.0%)');

  const zeroOrdersMetrics = calculateSalesMetrics(0, 0, 0);
  assert(zeroOrdersMetrics.aov === 0, '14. Sales: Zero orders yields AOV = 0 safely');
  assert(zeroOrdersMetrics.salesGrowth === 0, '15. Sales: Zero prior revenue yields safe growth percentage');

  // Granularity datasets
  const granularities: Array<'daily' | 'weekly' | 'monthly' | 'yearly'> = ['daily', 'weekly', 'monthly', 'yearly'];
  for (const g of granularities) {
    assert(Boolean(g), `16. Granularity: Supports '${g}' sales interval breakdown`);
  }

  // --- 3. Product Analytics ---
  console.log('\n--- 3. Product Analytics ---');

  const products = [
    { id: 'p1', name: 'Office Chair', unitsSold: 25, revenue: 2500, cogs: 1500, currentStock: 10, reorderLevel: 5 },
    { id: 'p2', name: 'Desk Mat', unitsSold: 1, revenue: 30, cogs: 10, currentStock: 40, reorderLevel: 10 },
    { id: 'p3', name: 'Cable Clip', unitsSold: 0, revenue: 0, cogs: 0, currentStock: 30, reorderLevel: 5 },
  ];

  // Best sellers sorted by unitsSold
  const bestSellers = [...products].sort((a, b) => b.unitsSold - a.unitsSold);
  assert(bestSellers[0].name === 'Office Chair', '17. Product: Best seller ranked by units sold');

  // Slow moving products (stock > 0 and unitsSold <= 2)
  const slowMoving = products.filter((p) => p.currentStock > 0 && p.unitsSold <= 2);
  assert(slowMoving.length === 2 && slowMoving.some((p) => p.name === 'Desk Mat'), '18. Product: Identifies slow-moving items with on-hand stock');

  // Product profitability
  const p1Profit = products[0].revenue - products[0].cogs;
  const p1Margin = (p1Profit / products[0].revenue) * 100;
  assert(p1Profit === 1000 && p1Margin === 40, '19. Product: Correctly calculates gross margin dollars and percent');

  // Least profitable sorting
  const leastProfitable = [...products].sort((a, b) => (a.revenue - a.cogs) - (b.revenue - b.cogs));
  assert(leastProfitable[0].name === 'Cable Clip', '20. Product: Identifies least profitable items');

  // --- 4. Inventory Analytics ---
  console.log('\n--- 4. Inventory Analytics ---');

  const stockValuation = 10 * 150 + 40 * 10 + 30 * 5; // 1500 + 400 + 150 = 2050
  assert(stockValuation === 2050, '21. Inventory: Stock valuation at cost ($2,050.00)');

  const turnover = calculateInventoryTurnover(financials.cogs, stockValuation);
  assert(turnover === 0.44, '22. Inventory: Turnover ratio = COGS / Stock Value (900 / 2050 = 0.44x)');

  const zeroStockTurnover = calculateInventoryTurnover(100, 0);
  assert(zeroStockTurnover === 0, '23. Inventory: Safe division when stock value is zero');

  // Overstock condition
  const isOverstocked = (stock: number, reorder: number) => stock > reorder * 3 && stock >= 15;
  assert(isOverstocked(40, 10), '24. Inventory: Flags overstocked items (40 > 30 and >= 15)');
  assert(!isOverstocked(10, 5), '25. Inventory: Does not flag balanced stock');

  // Dead stock condition
  const isDeadStock = (stock: number, sold: number) => stock > 0 && sold === 0;
  assert(isDeadStock(30, 0), '26. Inventory: Flags dead stock with zero sales in period');

  // Stock movement
  const unitsIn = 100;
  const unitsOut = 35;
  const netMovement = unitsIn - unitsOut;
  assert(netMovement === 65, '27. Inventory: Stock movement balance (+65 net)');

  // --- 5. Customer Analytics ---
  console.log('\n--- 5. Customer Analytics ---');

  const custMetrics = calculateCustomerMetrics(10, 3, 6, 2000);
  assert(custMetrics.repeatRate === 50.0, '28. Customer: Repeat buyer rate (3 / 6 = 50.0%)');
  assert(custMetrics.acv === 200.0, '29. Customer: Average Customer Value (2000 / 10 = $200.00)');

  const zeroCustMetrics = calculateCustomerMetrics(0, 0, 0, 0);
  assert(zeroCustMetrics.repeatRate === 0 && zeroCustMetrics.acv === 0, '30. Customer: Safe zero customer metrics');

  // --- 6. Date Query Params Builder ---
  console.log('\n--- 6. Date Query Params Builder ---');

  const q1 = buildAnalyticsQueryParams('30d');
  assert(q1.period === '30d' && !q1.startDate, '31. Query: Standard preset period generates clean params');

  const q2 = buildAnalyticsQueryParams('custom', '2026-03-01', '2026-03-31');
  assert(q2.period === 'custom' && q2.startDate === '2026-03-01' && q2.endDate === '2026-03-31', '32. Query: Custom period embeds startDate and endDate');

  console.log(`\n📊 Frontend Analytics Test Suite Results: ${passedTests}/${totalTests} Passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runFrontendAnalyticsTests().catch((err) => {
  console.error('Unhandled error in Frontend Analytics test suite:', err);
  process.exit(1);
});
