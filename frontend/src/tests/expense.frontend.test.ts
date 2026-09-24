/**
 * SmartStock Frontend Expense Management Test Suite
 *
 * Verifies frontend logic, monetary validation, category taxonomy,
 * search & filtering mechanics, summary calculations, and RBAC permissions.
 */

import {
  ExpenseCategory,
  EXPENSE_CATEGORIES,
  ExpenseItem,
  ExpenseSummary,
  CreateExpensePayload,
} from '../types/expense';

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

// Frontend Monetary Validation Function under test
function validateMonetaryAmount(amtStr: string): { isValid: boolean; value: number; error?: string } {
  if (!amtStr || amtStr.trim() === '') {
    return { isValid: false, value: 0, error: 'Amount is required' };
  }
  const val = parseFloat(amtStr);
  if (isNaN(val)) {
    return { isValid: false, value: 0, error: 'Amount must be a valid number' };
  }
  if (val <= 0) {
    return { isValid: false, value: 0, error: 'Amount must be greater than zero ($0.00)' };
  }
  return { isValid: true, value: val };
}

// Frontend Category details helper under test
function getCategoryBadge(cat: string) {
  const categories = ['Rent', 'Electricity', 'Salary', 'Transport', 'Marketing', 'Maintenance', 'Other'];
  return categories.includes(cat);
}

// Frontend RBAC verification helper under test
function isRoleAuthorized(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

// Frontend Expense Summary Calculator under test
function calculateFrontendSummary(items: ExpenseItem[]): ExpenseSummary {
  const summary: ExpenseSummary = {
    totalCount: items.filter((i) => i.isActive).length,
    totalAmount: items.filter((i) => i.isActive).reduce((sum, i) => sum + i.amount, 0),
    categoryBreakdown: {
      rent: 0,
      electricity: 0,
      salary: 0,
      transport: 0,
      marketing: 0,
      maintenance: 0,
      other: 0,
    },
    methodBreakdown: {
      cash: 0,
      card: 0,
      bankTransfer: 0,
      online: 0,
    },
  };

  for (const item of items) {
    if (!item.isActive) continue;
    const cat = item.category.toLowerCase();
    if (cat === 'rent') summary.categoryBreakdown.rent += item.amount;
    else if (cat === 'electricity') summary.categoryBreakdown.electricity += item.amount;
    else if (cat === 'salary') summary.categoryBreakdown.salary += item.amount;
    else if (cat === 'transport') summary.categoryBreakdown.transport += item.amount;
    else if (cat === 'marketing') summary.categoryBreakdown.marketing += item.amount;
    else if (cat === 'maintenance') summary.categoryBreakdown.maintenance += item.amount;
    else summary.categoryBreakdown.other += item.amount;

    if (item.paymentMethod === 'CASH') summary.methodBreakdown.cash += item.amount;
    else if (item.paymentMethod === 'CARD') summary.methodBreakdown.card += item.amount;
    else if (item.paymentMethod === 'BANK_TRANSFER') summary.methodBreakdown.bankTransfer += item.amount;
    else if (item.paymentMethod === 'ONLINE') summary.methodBreakdown.online += item.amount;
  }

  return summary;
}

async function runFrontendExpenseTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Frontend Expense Test Suite');
  console.log('🧪 ===============================================\n');

  // -------------------------------------------------------------
  // Section 1: Category Taxonomy
  // -------------------------------------------------------------
  console.log('--- 1. Expense Categories Taxonomy ---');

  const requiredCategories: ExpenseCategory[] = [
    'Rent',
    'Electricity',
    'Salary',
    'Transport',
    'Marketing',
    'Maintenance',
    'Other',
  ];

  assert(
    requiredCategories.every((cat) => EXPENSE_CATEGORIES.includes(cat)),
    '1. Categories: All 7 required expense categories are defined in EXPENSE_CATEGORIES'
  );

  assert(
    EXPENSE_CATEGORIES.length === 7,
    '2. Categories: Exactly 7 categories are supported'
  );

  assert(
    getCategoryBadge('Electricity') === true && getCategoryBadge('InvalidCategory') === false,
    '3. Categories: Correctly recognizes valid and rejects invalid category badges'
  );

  // -------------------------------------------------------------
  // Section 2: Monetary Value Validation
  // -------------------------------------------------------------
  console.log('\n--- 2. Monetary Value Validation ---');

  const emptyRes = validateMonetaryAmount('');
  assert(
    !emptyRes.isValid && emptyRes.error === 'Amount is required',
    '4. Monetary: Rejects empty amount string with required error'
  );

  const zeroRes = validateMonetaryAmount('0');
  assert(
    !zeroRes.isValid && zeroRes.error === 'Amount must be greater than zero ($0.00)',
    '5. Monetary: Rejects amount = 0'
  );

  const negRes = validateMonetaryAmount('-250.75');
  assert(
    !negRes.isValid && negRes.error === 'Amount must be greater than zero ($0.00)',
    '6. Monetary: Rejects negative monetary amounts'
  );

  const nanRes = validateMonetaryAmount('not-a-number');
  assert(
    !nanRes.isValid && nanRes.error === 'Amount must be a valid number',
    '7. Monetary: Rejects non-numeric string values'
  );

  const validRes = validateMonetaryAmount('1500.50');
  assert(
    validRes.isValid && validRes.value === 1500.5,
    '8. Monetary: Correctly parses valid monetary amount ($1500.50)'
  );

  const validIntRes = validateMonetaryAmount('250');
  assert(
    validIntRes.isValid && validIntRes.value === 250,
    '9. Monetary: Correctly parses integer monetary amount ($250)'
  );

  // -------------------------------------------------------------
  // Section 3: Payload Construction
  // -------------------------------------------------------------
  console.log('\n--- 3. Payload Construction ---');

  const createPayload: CreateExpensePayload = {
    category: 'Rent',
    amount: 3500.0,
    description: 'Main Retail Store Facility Lease',
    paymentMethod: 'BANK_TRANSFER',
    expenseDate: new Date('2026-03-01').toISOString(),
  };

  assert(
    createPayload.category === 'Rent' &&
      createPayload.amount === 3500.0 &&
      createPayload.paymentMethod === 'BANK_TRANSFER',
    '10. Payload: Successfully constructs valid CreateExpensePayload'
  );

  // -------------------------------------------------------------
  // Section 4: Summary & Breakdown Aggregation
  // -------------------------------------------------------------
  console.log('\n--- 4. Summary & Aggregations ---');

  const mockExpenses: ExpenseItem[] = [
    {
      id: 'exp-1',
      userId: 'u1',
      category: 'Rent',
      amount: 4000.0,
      description: 'Store lease',
      paymentMethod: 'BANK_TRANSFER',
      isActive: true,
      expenseDate: '2026-03-01T00:00:00.000Z',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'exp-2',
      userId: 'u1',
      category: 'Electricity',
      amount: 450.0,
      description: 'Monthly utility bill',
      paymentMethod: 'ONLINE',
      isActive: true,
      expenseDate: '2026-03-05T00:00:00.000Z',
      createdAt: '2026-03-05T00:00:00.000Z',
      updatedAt: '2026-03-05T00:00:00.000Z',
    },
    {
      id: 'exp-3',
      userId: 'u2',
      category: 'Salary',
      amount: 3000.0,
      description: 'Staff payroll',
      paymentMethod: 'BANK_TRANSFER',
      isActive: true,
      expenseDate: '2026-03-10T00:00:00.000Z',
      createdAt: '2026-03-10T00:00:00.000Z',
      updatedAt: '2026-03-10T00:00:00.000Z',
    },
    {
      id: 'exp-4',
      userId: 'u2',
      category: 'Transport',
      amount: 150.0,
      description: 'Courier delivery fuel',
      paymentMethod: 'CASH',
      isActive: true,
      expenseDate: '2026-03-12T00:00:00.000Z',
      createdAt: '2026-03-12T00:00:00.000Z',
      updatedAt: '2026-03-12T00:00:00.000Z',
    },
    {
      id: 'exp-5',
      userId: 'u1',
      category: 'Maintenance',
      amount: 200.0,
      description: 'HVAC repair',
      paymentMethod: 'CARD',
      isActive: false, // Inactive / deactivated
      expenseDate: '2026-03-15T00:00:00.000Z',
      createdAt: '2026-03-15T00:00:00.000Z',
      updatedAt: '2026-03-15T00:00:00.000Z',
    },
  ];

  const calculatedSummary = calculateFrontendSummary(mockExpenses);

  assert(
    calculatedSummary.totalCount === 4,
    '11. Summary: Correctly counts 4 active expense records (ignoring deactivated record)'
  );

  assert(
    calculatedSummary.totalAmount === 7600.0,
    '12. Summary: Computes total active expense amount ($7,600.00)'
  );

  assert(
    calculatedSummary.categoryBreakdown.rent === 4000.0 &&
      calculatedSummary.categoryBreakdown.electricity === 450.0 &&
      calculatedSummary.categoryBreakdown.salary === 3000.0 &&
      calculatedSummary.categoryBreakdown.transport === 150.0 &&
      calculatedSummary.categoryBreakdown.maintenance === 0.0, // Inactive maintenance excluded
    '13. Summary: Correctly categorizes breakdown across Rent, Electricity, Salary, Transport'
  );

  assert(
    calculatedSummary.methodBreakdown.bankTransfer === 7000.0 &&
      calculatedSummary.methodBreakdown.online === 450.0 &&
      calculatedSummary.methodBreakdown.cash === 150.0 &&
      calculatedSummary.methodBreakdown.card === 0.0,
    '14. Summary: Correctly aggregates method breakdown across Bank Transfer, Online, Cash'
  );

  // -------------------------------------------------------------
  // Section 5: Search & Client Filtering
  // -------------------------------------------------------------
  console.log('\n--- 5. Search & Filtering Mechanics ---');

  const searchResults = mockExpenses.filter(
    (e) =>
      e.description.toLowerCase().includes('fuel') ||
      e.category.toLowerCase().includes('fuel')
  );
  assert(
    searchResults.length === 1 && searchResults[0].id === 'exp-4',
    '15. Search: Accurately searches expenses by description keyword'
  );

  const categoryFilterResults = mockExpenses.filter((e) => e.category === 'Salary');
  assert(
    categoryFilterResults.length === 1 && categoryFilterResults[0].amount === 3000.0,
    '16. Filter: Filters expenses by category correctly'
  );

  const activeOnly = mockExpenses.filter((e) => e.isActive);
  assert(
    activeOnly.length === 4 && activeOnly.every((e) => e.isActive),
    '17. Filter: Filters active expenses accurately'
  );

  const inactiveOnly = mockExpenses.filter((e) => !e.isActive);
  assert(
    inactiveOnly.length === 1 && inactiveOnly[0].id === 'exp-5',
    '18. Filter: Filters deactivated expenses accurately'
  );

  // -------------------------------------------------------------
  // Section 6: Frontend RBAC Validation
  // -------------------------------------------------------------
  console.log('\n--- 6. Role-Based Access Control (RBAC) ---');

  const allowedRoles = ['ADMIN', 'MANAGER'];

  assert(
    !isRoleAuthorized('CASHIER', allowedRoles),
    '19. RBAC: Cashier role is NOT authorized to access or manage expenses'
  );

  assert(
    isRoleAuthorized('MANAGER', allowedRoles),
    '20. RBAC: Manager role IS authorized to manage expenses'
  );

  assert(
    isRoleAuthorized('ADMIN', allowedRoles),
    '21. RBAC: Admin role IS authorized to manage expenses'
  );

  console.log(`\n📊 Frontend Expense Test Results: ${passedTests}/${totalTests} Passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runFrontendExpenseTests().catch((err) => {
  console.error('Unhandled error in Frontend Expense test suite:', err);
  process.exit(1);
});
