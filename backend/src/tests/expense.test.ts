import { UserRole, PaymentMethod, Prisma } from '@prisma/client';
import { ExpenseService } from '../services/expense.service';
import { ExpenseRepository } from '../repositories/expense.repository';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseQuerySchema,
  EXPENSE_CATEGORIES,
} from '../validators/expense.validator';
import { authorize } from '../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';

// =========================================================
// Mock In-Memory Transactional Client for Expenses
// =========================================================
class MockExpensePrismaClient {
  public expenses: any[] = [];
  public users: any[] = [];
  public auditLogs: any[] = [];

  constructor(initialData: { expenses?: any[]; users?: any[]; auditLogs?: any[] } = {}) {
    this.expenses = JSON.parse(JSON.stringify(initialData.expenses || []));
    this.users = JSON.parse(JSON.stringify(initialData.users || []));
    this.auditLogs = JSON.parse(JSON.stringify(initialData.auditLogs || []));
  }

  private createSnapshot() {
    return {
      expenses: JSON.parse(JSON.stringify(this.expenses)),
      auditLogs: JSON.parse(JSON.stringify(this.auditLogs)),
    };
  }

  private restoreSnapshot(snapshot: any) {
    this.expenses = snapshot.expenses;
    this.auditLogs = snapshot.auditLogs;
  }

  public async $transaction(fn: (tx: any) => Promise<any>): Promise<any> {
    const snapshot = this.createSnapshot();

    const txContext: any = {
      expense: {
        create: async (args: any) => {
          const exp = {
            id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.expenses.push(exp);
          return JSON.parse(JSON.stringify(exp));
        },
        update: async (args: any) => {
          const idx = this.expenses.findIndex((e) => e.id === args.where.id);
          if (idx === -1) throw new Error('Expense not found for update');
          this.expenses[idx] = {
            ...this.expenses[idx],
            ...args.data,
            updatedAt: new Date(),
          };
          return JSON.parse(JSON.stringify(this.expenses[idx]));
        },
        delete: async (args: any) => {
          const idx = this.expenses.findIndex((e) => e.id === args.where.id);
          if (idx === -1) throw new Error('Expense not found for delete');
          const [removed] = this.expenses.splice(idx, 1);
          return JSON.parse(JSON.stringify(removed));
        },
      },
      auditLog: {
        create: async (args: any) => {
          const log = {
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            ...args.data,
            createdAt: new Date(),
          };
          this.auditLogs.push(log);
          return JSON.parse(JSON.stringify(log));
        },
      },
    };

    try {
      const result = await fn(txContext);
      return result;
    } catch (error) {
      this.restoreSnapshot(snapshot);
      throw error;
    }
  }
}

// =========================================================
// Mock Expense Repository
// =========================================================
class MockExpenseRepository extends ExpenseRepository {
  private mockClient: MockExpensePrismaClient;

  constructor(mockClient: MockExpensePrismaClient) {
    super();
    this.mockClient = mockClient;
  }

  public async findMany(options: any = {}): Promise<any[]> {
    let list = this.mockClient.expenses.slice();

    if (options.where?.category?.equals) {
      const cat = options.where.category.equals.toLowerCase();
      list = list.filter((e) => e.category.toLowerCase() === cat);
    }

    if (options.where?.paymentMethod) {
      list = list.filter((e) => e.paymentMethod === options.where.paymentMethod);
    }

    if (options.where?.isActive !== undefined) {
      list = list.filter((e) => e.isActive === options.where.isActive);
    }

    if (options.where?.OR) {
      const term = options.where.OR[0].description.contains.toLowerCase();
      list = list.filter((e) => {
        const user = this.mockClient.users.find((u) => u.id === e.userId);
        return (
          e.description.toLowerCase().includes(term) ||
          e.category.toLowerCase().includes(term) ||
          (user && user.name.toLowerCase().includes(term))
        );
      });
    }

    return list.map((e) => {
      const user = this.mockClient.users.find((u) => u.id === e.userId) || {
        id: e.userId,
        name: 'Manager User',
        email: 'manager@smartstock.com',
        role: 'MANAGER',
      };
      return {
        ...e,
        user,
      };
    });
  }

  public async count(where?: any): Promise<number> {
    const list = await this.findMany({ where });
    return list.length;
  }

  public async findById(id: string): Promise<any> {
    const e = this.mockClient.expenses.find((exp) => exp.id === id);
    if (!e) return null;
    const user = this.mockClient.users.find((u) => u.id === e.userId) || {
      id: e.userId,
      name: 'Manager User',
      email: 'manager@smartstock.com',
      role: 'MANAGER',
    };
    return { ...e, user };
  }

  public async create(data: any, tx?: any): Promise<any> {
    if (tx?.expense?.create) {
      return tx.expense.create({ data });
    }
    const exp = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mockClient.expenses.push(exp);
    return exp;
  }

  public async update(id: string, data: any, tx?: any): Promise<any> {
    if (tx?.expense?.update) {
      return tx.expense.update({ where: { id }, data });
    }
    const idx = this.mockClient.expenses.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Expense not found');
    this.mockClient.expenses[idx] = {
      ...this.mockClient.expenses[idx],
      ...data,
      updatedAt: new Date(),
    };
    return this.mockClient.expenses[idx];
  }

  public async delete(id: string, tx?: any): Promise<any> {
    if (tx?.expense?.delete) {
      return tx.expense.delete({ where: { id } });
    }
    const idx = this.mockClient.expenses.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Expense not found');
    const [removed] = this.mockClient.expenses.splice(idx, 1);
    return removed;
  }

  public async getSummary(where?: any): Promise<any> {
    const list = await this.findMany({ where });
    const totalExpenses = list.length;
    let totalAmount = 0;
    const categoryBreakdown: Record<string, number> = {
      rent: 0,
      electricity: 0,
      salary: 0,
      transport: 0,
      marketing: 0,
      maintenance: 0,
      other: 0,
    };
    const methodBreakdown: Record<string, number> = {
      cash: 0,
      card: 0,
      bankTransfer: 0,
      online: 0,
    };

    for (const item of list) {
      const amt = Number(item.amount);
      totalAmount += amt;

      const catKey = item.category.toLowerCase();
      if (catKey in categoryBreakdown) {
        categoryBreakdown[catKey] += amt;
      } else {
        categoryBreakdown.other += amt;
      }

      if (item.paymentMethod === PaymentMethod.CASH) methodBreakdown.cash += amt;
      else if (item.paymentMethod === PaymentMethod.CARD) methodBreakdown.card += amt;
      else if (item.paymentMethod === PaymentMethod.BANK_TRANSFER) methodBreakdown.bankTransfer += amt;
      else if (item.paymentMethod === PaymentMethod.ONLINE) methodBreakdown.online += amt;
    }

    return {
      totalExpenses,
      totalAmount: Number(totalAmount.toFixed(2)),
      categoryBreakdown: {
        rent: Number(categoryBreakdown.rent.toFixed(2)),
        electricity: Number(categoryBreakdown.electricity.toFixed(2)),
        salary: Number(categoryBreakdown.salary.toFixed(2)),
        transport: Number(categoryBreakdown.transport.toFixed(2)),
        marketing: Number(categoryBreakdown.marketing.toFixed(2)),
        maintenance: Number(categoryBreakdown.maintenance.toFixed(2)),
        other: Number(categoryBreakdown.other.toFixed(2)),
      },
      methodBreakdown: {
        cash: Number(methodBreakdown.cash.toFixed(2)),
        card: Number(methodBreakdown.card.toFixed(2)),
        bankTransfer: Number(methodBreakdown.bankTransfer.toFixed(2)),
        online: Number(methodBreakdown.online.toFixed(2)),
      },
    };
  }
}

// =========================================================
// Test Suite Runner
// =========================================================
async function runExpenseTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Expense Management Test Suite');
  console.log('🧪 ===============================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, extra?: any) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (extra) console.error('     Details:', extra);
    }
  }

  const sampleManagerUser = {
    id: 'u1111111-1111-4111-8111-111111111111',
    name: 'Marcus Brody',
    email: 'manager@smartstock.com',
    role: UserRole.MANAGER,
  };

  const sampleAdminUser = {
    id: 'u2222222-2222-4222-8222-222222222222',
    name: 'Eleanor Vance',
    email: 'admin@smartstock.com',
    role: UserRole.ADMIN,
  };

  function createTestEnvironment(initialExpenses: any[] = []) {
    const mockPrisma = new MockExpensePrismaClient({
      expenses: initialExpenses,
      users: [sampleManagerUser, sampleAdminUser],
    });
    const repo = new MockExpenseRepository(mockPrisma);
    const service = new ExpenseService(mockPrisma as any, repo);
    return { mockPrisma, repo, service };
  }

  // =========================================================
  // SECTION 1: Validation of Monetary Values & Categories
  // =========================================================
  console.log('--- 1. Validation of Monetary Values & Categories ---');

  // Test 1: Rejects monetary amount <= 0
  try {
    createExpenseSchema.parse({
      category: 'Rent',
      amount: 0,
      description: 'Zero dollar rent attempt',
    });
    assert(false, '1. Validation: Rejects expense with amount = 0');
  } catch {
    assert(true, '1. Validation: Rejects expense with amount = 0');
  }

  // Test 2: Rejects negative monetary amount
  try {
    createExpenseSchema.parse({
      category: 'Rent',
      amount: -150.0,
      description: 'Negative monetary expense attempt',
    });
    assert(false, '2. Validation: Rejects negative expense amount');
  } catch {
    assert(true, '2. Validation: Rejects negative expense amount');
  }

  // Test 3: Rejects invalid non-monetary amount
  try {
    createExpenseSchema.parse({
      category: 'Rent',
      amount: 'not-a-number' as any,
      description: 'Invalid non-numeric amount',
    });
    assert(false, '3. Validation: Rejects non-numeric monetary value');
  } catch {
    assert(true, '3. Validation: Rejects non-numeric monetary value');
  }

  // Test 4: Rejects unauthorized category
  try {
    createExpenseSchema.parse({
      category: 'Gambling',
      amount: 100,
      description: 'Unauthorized category test',
    });
    assert(false, '4. Validation: Rejects unauthorized expense category');
  } catch {
    assert(true, '4. Validation: Rejects unauthorized expense category');
  }

  // Test 5: Validates all 7 required categories
  let allCatsValid = true;
  for (const cat of EXPENSE_CATEGORIES) {
    const res = createExpenseSchema.safeParse({
      category: cat,
      amount: 50.0,
      description: `Payment for ${cat}`,
      paymentMethod: PaymentMethod.CASH,
    });
    if (!res.success) allCatsValid = false;
  }
  assert(
    allCatsValid,
    `5. Categories: Accepts all 7 required categories (${EXPENSE_CATEGORIES.join(', ')})`
  );

  // Test 6: Accepts all payment methods
  const methods = [
    PaymentMethod.CASH,
    PaymentMethod.CARD,
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.ONLINE,
  ];
  let methodsValid = true;
  for (const m of methods) {
    const res = createExpenseSchema.safeParse({
      category: 'Electricity',
      amount: 75.0,
      description: 'Monthly utility bill',
      paymentMethod: m,
    });
    if (!res.success) methodsValid = false;
  }
  assert(methodsValid, '6. Methods: Accepts all payment methods (CASH, CARD, BANK_TRANSFER, ONLINE)');

  // Test 7: Query validator defaults
  const query = expenseQuerySchema.parse({});
  assert(
    Boolean(
      query.page === 1 &&
        query.limit === 10 &&
        query.category === 'all' &&
        query.status === 'all' &&
        query.sortBy === 'expenseDate' &&
        query.sortOrder === 'desc'
    ),
    '7. Query Schema: Applies correct defaults for pagination and filters'
  );

  // =========================================================
  // SECTION 2: Expense Creation & Audit Trail
  // =========================================================
  console.log('\n--- 2. Expense Creation & Audit Trail ---');

  // Test 8: Create expense successfully
  {
    const { service, mockPrisma } = createTestEnvironment();
    const created = await service.createExpense(
      {
        category: 'Rent',
        amount: 2500.0,
        description: 'Main Warehouse Rent - September 2026',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        expenseDate: '2026-09-01T00:00:00Z',
      },
      sampleManagerUser.id
    );

    assert(
      Boolean(
        created.id &&
          created.category === 'Rent' &&
          Number(created.amount) === 2500.0 &&
          created.paymentMethod === PaymentMethod.BANK_TRANSFER &&
          created.isActive === true &&
          created.user.name === 'Marcus Brody'
      ),
      '8. Create: Successfully creates expense with valid metadata and user association'
    );

    // Verify Audit Log created
    const log = mockPrisma.auditLogs.find((l) => l.entityId === created.id);
    assert(
      Boolean(log && log.action === 'EXPENSE_CREATE' && log.userId === sampleManagerUser.id),
      '9. Audit Log: Generates EXPENSE_CREATE audit log record'
    );
  }

  // =========================================================
  // SECTION 3: Update, Deactivation & Deletion
  // =========================================================
  console.log('\n--- 3. Update, Deactivation & Deletion ---');

  // Test 10: Update expense details
  {
    const initialExp = {
      id: 'exp-101',
      userId: sampleManagerUser.id,
      category: 'Electricity',
      amount: new Prisma.Decimal(300.0),
      description: 'Estimated Power Bill',
      paymentMethod: PaymentMethod.CARD,
      expenseDate: new Date('2026-09-10'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { service, mockPrisma } = createTestEnvironment([initialExp]);

    const updated = await service.updateExpense(
      'exp-101',
      {
        amount: 345.5,
        description: 'Actual Utility Electric Bill Final',
      },
      sampleManagerUser.id
    );

    assert(
      Boolean(
        Number(updated.amount) === 345.5 &&
          updated.description === 'Actual Utility Electric Bill Final'
      ),
      '10. Update: Successfully modifies monetary amount and description'
    );

    // Rejects update with negative monetary amount
    try {
      updateExpenseSchema.parse({ amount: -50 });
      assert(false, '11. Update Validation: Rejects negative monetary value during update');
    } catch {
      assert(true, '11. Update Validation: Rejects negative monetary value during update');
    }

    // Audit Log for update
    const updateLog = mockPrisma.auditLogs.find((l) => l.action === 'EXPENSE_UPDATE');
    assert(Boolean(updateLog), '12. Audit Log: Generates EXPENSE_UPDATE audit log record');
  }

  // Test 13: Deactivate expense (soft-delete)
  {
    const initialExp = {
      id: 'exp-202',
      userId: sampleManagerUser.id,
      category: 'Marketing',
      amount: new Prisma.Decimal(450.0),
      description: 'Flyers Campaign',
      paymentMethod: PaymentMethod.CASH,
      expenseDate: new Date('2026-09-15'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { service, mockPrisma } = createTestEnvironment([initialExp]);

    const deactivated = await service.deactivateExpense('exp-202', sampleManagerUser.id);
    assert(
      Boolean(deactivated.isActive === false),
      '13. Deactivation: Soft-deactivates expense by toggling isActive to false'
    );

    const reactivated = await service.activateExpense('exp-202', sampleManagerUser.id);
    assert(
      Boolean(reactivated.isActive === true),
      '14. Reactivation: Re-enables deactivated expense back to active'
    );

    const deactLog = mockPrisma.auditLogs.find((l) => l.action === 'EXPENSE_DEACTIVATE');
    assert(Boolean(deactLog), '15. Audit Log: Generates EXPENSE_DEACTIVATE audit log');
  }

  // Test 16: Delete expense (hard-delete)
  {
    const initialExp = {
      id: 'exp-303',
      userId: sampleAdminUser.id,
      category: 'Maintenance',
      amount: new Prisma.Decimal(120.0),
      description: 'Plumbing Repair',
      paymentMethod: PaymentMethod.CASH,
      expenseDate: new Date('2026-09-18'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { service, mockPrisma } = createTestEnvironment([initialExp]);

    const delRes = await service.deleteExpense('exp-303', sampleAdminUser.id);
    assert(Boolean(delRes.success && mockPrisma.expenses.length === 0), '16. Delete: Permanently deletes expense record');
  }

  // =========================================================
  // SECTION 4: Search, Filtering & Financial Summary
  // =========================================================
  console.log('\n--- 4. Search, Filtering & Financial Summary ---');

  {
    const expenseList = [
      {
        id: 'e-1',
        userId: sampleManagerUser.id,
        category: 'Rent',
        amount: new Prisma.Decimal(2000.0),
        description: 'Office Rent Downtown',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        expenseDate: new Date('2026-09-01'),
        isActive: true,
      },
      {
        id: 'e-2',
        userId: sampleManagerUser.id,
        category: 'Salary',
        amount: new Prisma.Decimal(5000.0),
        description: 'Staff Payroll Month End',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        expenseDate: new Date('2026-09-05'),
        isActive: true,
      },
      {
        id: 'e-3',
        userId: sampleManagerUser.id,
        category: 'Transport',
        amount: new Prisma.Decimal(150.0),
        description: 'Delivery Van Fuel',
        paymentMethod: PaymentMethod.CASH,
        expenseDate: new Date('2026-09-08'),
        isActive: true,
      },
      {
        id: 'e-4',
        userId: sampleManagerUser.id,
        category: 'Electricity',
        amount: new Prisma.Decimal(250.0),
        description: 'Store Electricity Bill',
        paymentMethod: PaymentMethod.CARD,
        expenseDate: new Date('2026-09-12'),
        isActive: false, // inactive
      },
    ];

    const { service } = createTestEnvironment(expenseList);

    // List all
    const all = await service.listExpenses({});
    assert(
      Boolean(
        all.pagination.totalItems === 4 &&
          all.summary.totalExpenses === 4 &&
          all.summary.totalAmount === 7400.0
      ),
      '17. Summary: Calculates total monetary volume ($7,400.00 across 4 records)'
    );

    // Category breakdown
    assert(
      Boolean(
        all.summary.categoryBreakdown.rent === 2000.0 &&
          all.summary.categoryBreakdown.salary === 5000.0 &&
          all.summary.categoryBreakdown.transport === 150.0 &&
          all.summary.categoryBreakdown.electricity === 250.0
      ),
      '18. Category Summary: Accurately breaks down expenses by category'
    );

    // Payment method breakdown
    assert(
      Boolean(
        all.summary.methodBreakdown.bankTransfer === 7000.0 &&
          all.summary.methodBreakdown.cash === 150.0 &&
          all.summary.methodBreakdown.card === 250.0
      ),
      '19. Method Summary: Accurately aggregates expenses by payment method'
    );

    // Filter by Category
    const rentOnly = await service.listExpenses({ category: 'Rent' });
    assert(
      Boolean(rentOnly.items.length === 1 && rentOnly.items[0].category === 'Rent'),
      '20. Filter: Successfully filters expense list by category'
    );

    // Filter by Status (active vs inactive)
    const activeOnly = await service.listExpenses({ status: 'active' });
    assert(
      Boolean(activeOnly.items.length === 3 && activeOnly.items.every((e) => e.isActive)),
      '21. Filter: Successfully filters active expense records'
    );

    // Search by description
    const searched = await service.listExpenses({ search: 'Fuel' });
    assert(
      Boolean(searched.items.length === 1 && searched.items[0].description.includes('Fuel')),
      '22. Search: Correctly searches expenses by keyword'
    );
  }

  // =========================================================
  // SECTION 5: Role-Based Access Control (RBAC)
  // =========================================================
  console.log('\n--- 5. Role-Based Access Control (RBAC) ---');

  const checkRoleAccess = (role: UserRole, allowedRoles: UserRole[]): boolean => {
    let authorized = false;
    const req = { user: { role } } as unknown as Request;
    const res = {
      status: () => ({ json: () => {} }),
    } as unknown as Response;
    const next: NextFunction = ((err?: any) => {
      if (!err) {
        authorized = true;
      }
    }) as any;
    try {
      const middleware = authorize(...allowedRoles);
      middleware(req, res, next);
    } catch {
      authorized = false;
    }
    return authorized;
  };

  const expenseAllowedRoles = [UserRole.ADMIN, UserRole.MANAGER];

  // Cashier must be blocked
  assert(
    !checkRoleAccess(UserRole.CASHIER, expenseAllowedRoles),
    '23. RBAC: Cashier role is strictly BLOCKED from expense management (403 Forbidden)'
  );

  // Manager must be permitted
  assert(
    checkRoleAccess(UserRole.MANAGER, expenseAllowedRoles),
    '24. RBAC: Manager role is PERMITTED to manage expenses'
  );

  // Admin must be permitted
  assert(
    checkRoleAccess(UserRole.ADMIN, expenseAllowedRoles),
    '25. RBAC: Admin role is PERMITTED to manage expenses'
  );

  console.log(`\n📊 Expense Test Suite Results: ${passedTests}/${totalTests} Passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runExpenseTests().catch((err) => {
  console.error('Unhandled error in Expense test suite:', err);
  process.exit(1);
});
