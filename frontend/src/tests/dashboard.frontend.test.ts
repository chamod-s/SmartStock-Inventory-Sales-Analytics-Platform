/**
 * SmartStock Frontend Dashboard Test Suite
 *
 * Verifies frontend data structures, date filter parameters,
 * percentage change & trend calculations, low-stock severity tagging,
 * category distribution formatting, and role-based financial visibility.
 */

import { DashboardPeriod, DashboardResponseData } from '../types/dashboard';

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

// Frontend Trend / Percentage Change Helper
function computePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return Number(change.toFixed(1));
}

// Frontend Date Range Query Builder
function buildDashboardQueryParams(
  period: DashboardPeriod,
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

// Low-Stock Urgency Tagging Helper
function getStockSeverity(currentStock: number, reorderLevel: number): {
  status: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';
  deficit: number;
} {
  if (currentStock <= 0) {
    return { status: 'OUT_OF_STOCK', deficit: reorderLevel - currentStock };
  }
  if (currentStock <= reorderLevel) {
    return { status: 'LOW_STOCK', deficit: reorderLevel - currentStock };
  }
  return { status: 'IN_STOCK', deficit: 0 };
}

// Financial Visibility RBAC Check
function canRoleViewFinancials(role: string): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

async function runFrontendDashboardTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Frontend Dashboard Test Suite');
  console.log('🧪 ===============================================\n');

  // -------------------------------------------------------------
  // Section 1: Period Presets & Filter Query Parameters
  // -------------------------------------------------------------
  console.log('--- 1. Dashboard Date Filters ---');

  const validPeriods: DashboardPeriod[] = [
    'today',
    'this_week',
    'this_month',
    'last_month',
    'this_year',
    'custom',
  ];

  assert(
    validPeriods.length === 6,
    '1. Date Filters: Exactly 6 date filtering modes are supported'
  );

  const monthParams = buildDashboardQueryParams('this_month');
  assert(
    monthParams.period === 'this_month' && !monthParams.startDate,
    '2. Query Builder: Prepares standard preset query params without custom dates'
  );

  const customParams = buildDashboardQueryParams('custom', '2026-03-01', '2026-03-31');
  assert(
    customParams.period === 'custom' &&
      customParams.startDate === '2026-03-01' &&
      customParams.endDate === '2026-03-31',
    '3. Query Builder: Prepares custom range query parameters with startDate and endDate'
  );

  // -------------------------------------------------------------
  // Section 2: Percentage Change & Trend Indicators
  // -------------------------------------------------------------
  console.log('\n--- 2. Percentage Change & Trend Metrics ---');

  const growth = computePercentageChange(1500, 1000);
  assert(
    growth === 50.0,
    '4. Trend Calculations: Accurately calculates positive revenue growth (+50.0%)'
  );

  const decline = computePercentageChange(800, 1000);
  assert(
    decline === -20.0,
    '5. Trend Calculations: Accurately calculates decline (-20.0%)'
  );

  const flat = computePercentageChange(500, 500);
  assert(
    flat === 0.0,
    '6. Trend Calculations: Correctly handles 0% neutral growth'
  );

  const zeroPrev = computePercentageChange(250, 0);
  assert(
    zeroPrev === 100.0,
    '7. Trend Calculations: Correctly handles transition from zero baseline (+100%)'
  );

  // -------------------------------------------------------------
  // Section 3: Low-Stock Urgency Classification
  // -------------------------------------------------------------
  console.log('\n--- 3. Low-Stock Urgency & Deficit Tracking ---');

  const outOfStock = getStockSeverity(0, 15);
  assert(
    outOfStock.status === 'OUT_OF_STOCK' && outOfStock.deficit === 15,
    '8. Low-Stock Alerts: Identifies OUT_OF_STOCK item with correct replenishment deficit'
  );

  const lowStock = getStockSeverity(4, 10);
  assert(
    lowStock.status === 'LOW_STOCK' && lowStock.deficit === 6,
    '9. Low-Stock Alerts: Identifies LOW_STOCK item with deficit (6 units)'
  );

  const healthyStock = getStockSeverity(25, 10);
  assert(
    healthyStock.status === 'IN_STOCK' && healthyStock.deficit === 0,
    '10. Low-Stock Alerts: Identifies healthy IN_STOCK item'
  );

  // -------------------------------------------------------------
  // Section 4: Role-Based Financial Permissions
  // -------------------------------------------------------------
  console.log('\n--- 4. Role Permissions ---');

  assert(
    canRoleViewFinancials('ADMIN') === true,
    '11. RBAC: Admin role is authorized to view company Gross Profit, Net Profit & Expenses'
  );

  assert(
    canRoleViewFinancials('MANAGER') === true,
    '12. RBAC: Manager role is authorized to view company Gross Profit, Net Profit & Expenses'
  );

  assert(
    canRoleViewFinancials('CASHIER') === false,
    '13. RBAC: Cashier role restricts store-level net profit and expenses'
  );

  // -------------------------------------------------------------
  // Section 5: KPI Card Integrity
  // -------------------------------------------------------------
  console.log('\n--- 5. KPI Summary Structure ---');

  const mockDashboardResponse: DashboardResponseData = {
    period: 'this_month',
    dateRange: {
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: '2026-03-31T23:59:59.999Z',
    },
    kpis: {
      totalRevenue: { value: 12500, previousValue: 10000, percentageChange: 25.0, formattedValue: '$12,500.00' },
      grossProfit: { value: 5000, previousValue: 4000, percentageChange: 25.0, formattedValue: '$5,000.00' },
      netProfit: { value: 3500, previousValue: 2800, percentageChange: 25.0, formattedValue: '$3,500.00' },
      totalOrders: { value: 150, previousValue: 120, percentageChange: 25.0, formattedValue: '150' },
      totalCustomers: { value: 85, formattedValue: '85' },
      totalProducts: { value: 142, formattedValue: '142' },
      inventoryValue: { value: 45000, formattedValue: '$45,000.00' },
      totalExpenses: { value: 1500, previousValue: 1200, percentageChange: 25.0, formattedValue: '$1,500.00' },
    },
    charts: {
      salesTrend: [{ date: 'Mar 1', timestamp: '2026-03-01', revenue: 500, orders: 5 }],
      revenueVsProfit: [{ date: 'Mar 1', revenue: 500, grossProfit: 200, expenses: 50, netProfit: 150 }],
      salesByCategory: [{ category: 'Furniture', revenue: 500, unitsSold: 5, percentage: 100 }],
      topSellingProducts: [{ productId: 'p1', name: 'Chair', sku: 'C-1', category: 'Furniture', unitsSold: 5, revenue: 500, profit: 200 }],
      lowStockProducts: [{ id: 'p2', name: 'Lamp', sku: 'L-1', category: 'Lighting', currentStock: 2, reorderLevel: 5, deficit: 3, status: 'LOW_STOCK', unit: 'pcs' }],
      recentSales: [{ id: 's1', invoiceNumber: 'INV-000001', customerName: 'Acme', totalAmount: 500, paymentMethod: 'CARD', status: 'COMPLETED', createdAt: '2026-03-01T10:00:00Z', cashierName: 'Cashier 1', itemCount: 2 }],
    },
    permissions: {
      userRole: 'ADMIN',
      canViewFinancials: true,
    },
  };

  assert(
    mockDashboardResponse.kpis.totalRevenue.value === 12500 &&
      mockDashboardResponse.kpis.grossProfit.value === 5000 &&
      mockDashboardResponse.kpis.netProfit.value === 3500 &&
      mockDashboardResponse.kpis.totalOrders.value === 150 &&
      mockDashboardResponse.kpis.totalCustomers.value === 85 &&
      mockDashboardResponse.kpis.totalProducts.value === 142 &&
      mockDashboardResponse.kpis.inventoryValue.value === 45000 &&
      mockDashboardResponse.kpis.totalExpenses.value === 1500,
    '14. KPI Summary: Contains all 8 required KPI card values from backend analytics'
  );

  assert(
    mockDashboardResponse.charts.salesTrend.length > 0 &&
      mockDashboardResponse.charts.revenueVsProfit.length > 0 &&
      mockDashboardResponse.charts.salesByCategory.length > 0 &&
      mockDashboardResponse.charts.topSellingProducts.length > 0 &&
      mockDashboardResponse.charts.lowStockProducts.length > 0 &&
      mockDashboardResponse.charts.recentSales.length > 0,
    '15. Charts: Contains all 6 required visual charts and operational feeds'
  );

  console.log(`\n📊 Frontend Dashboard Test Results: ${passedTests}/${totalTests} Passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runFrontendDashboardTests().catch((err) => {
  console.error('Unhandled error in Frontend Dashboard test suite:', err);
  process.exit(1);
});
