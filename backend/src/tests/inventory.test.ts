import { UserRole, TransactionType } from '@prisma/client';
import { InventoryService } from '../services/inventory.service';
import {
  InventoryRepository,
  InventoryItemWithDetails,
} from '../repositories/inventory.repository';
import { inventoryAdjustmentSchema } from '../validators/inventory.validator';
import { authorize } from '../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';

// =========================================================
// Mock In-Memory Transactional Prisma Client
// =========================================================
class MockTransactionalPrismaClient {
  public products: any[] = [];
  public inventoryTransactions: any[] = [];
  public users: any[] = [];
  public failOnTransaction: boolean = false;

  constructor(initialData: { products?: any[]; inventoryTransactions?: any[]; users?: any[] }) {
    this.products = JSON.parse(JSON.stringify(initialData.products || []));
    this.inventoryTransactions = JSON.parse(JSON.stringify(initialData.inventoryTransactions || []));
    this.users = JSON.parse(JSON.stringify(initialData.users || []));
  }

  private createSnapshot() {
    return {
      products: JSON.parse(JSON.stringify(this.products)),
      inventoryTransactions: JSON.parse(JSON.stringify(this.inventoryTransactions)),
    };
  }

  private restoreSnapshot(snapshot: any) {
    this.products = snapshot.products;
    this.inventoryTransactions = snapshot.inventoryTransactions;
  }

  public async $transaction(fn: (tx: any) => Promise<any>, _options?: any): Promise<any> {
    const snapshot = this.createSnapshot();

    const txContext: any = {
      product: {
        findUnique: async (args: any) => {
          const p = this.products.find((prod) => prod.id === args.where.id);
          return p ? JSON.parse(JSON.stringify(p)) : null;
        },
        update: async (args: any) => {
          const idx = this.products.findIndex((prod) => prod.id === args.where.id);
          if (idx === -1) throw new Error('Product not found in update');
          this.products[idx] = {
            ...this.products[idx],
            currentStock: args.data.currentStock ?? this.products[idx].currentStock,
            purchasePrice: args.data.purchasePrice ?? this.products[idx].purchasePrice,
          };
          return JSON.parse(JSON.stringify(this.products[idx]));
        },
      },
      inventoryTransaction: {
        create: async (args: any) => {
          if (this.failOnTransaction) {
            throw new Error('Simulated database write error on inventoryTransaction');
          }
          const user = this.users.find((u) => u.id === args.data.userId);
          const product = this.products.find((p) => p.id === args.data.productId);
          const txn = {
            id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            ...args.data,
            createdAt: new Date(),
            product: product
              ? {
                  id: product.id,
                  name: product.name,
                  sku: product.sku,
                  unit: product.unit,
                  category: product.category,
                }
              : undefined,
            user: user
              ? { id: user.id, name: user.name, email: user.email, role: user.role }
              : null,
          };
          this.inventoryTransactions.push(txn);
          return JSON.parse(JSON.stringify(txn));
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
// Mock In-Memory Inventory Repository
// =========================================================
class MockInventoryRepository extends InventoryRepository {
  private mockClient: MockTransactionalPrismaClient;

  constructor(mockClient: MockTransactionalPrismaClient) {
    super();
    this.mockClient = mockClient;
  }

  public async findProducts(options: any = {}): Promise<InventoryItemWithDetails[]> {
    let prods = [...this.mockClient.products];

    if (options.where?.categoryId) {
      prods = prods.filter((p) => p.categoryId === options.where.categoryId);
    }

    if (options.stockStatus === 'OUT_OF_STOCK') {
      prods = prods.filter((p) => p.currentStock <= 0);
    } else if (options.stockStatus === 'LOW_STOCK') {
      prods = prods.filter((p) => p.currentStock > 0 && p.currentStock <= p.reorderLevel);
    } else if (options.stockStatus === 'IN_STOCK') {
      prods = prods.filter((p) => p.currentStock > p.reorderLevel);
    }

    return JSON.parse(JSON.stringify(prods));
  }

  public async countProducts(where?: any, stockStatus?: any): Promise<number> {
    const list = await this.findProducts({ where, stockStatus });
    return list.length;
  }

  public async findTransactions(options: any = {}): Promise<any[]> {
    let txns = [...this.mockClient.inventoryTransactions];

    if (options.where?.productId) {
      txns = txns.filter((t) => t.productId === options.where.productId);
    }
    if (options.where?.type) {
      txns = txns.filter((t) => t.type === options.where.type);
    }
    if (options.where?.userId) {
      txns = txns.filter((t) => t.userId === options.where.userId);
    }

    return JSON.parse(JSON.stringify(txns));
  }

  public async countTransactions(where?: any): Promise<number> {
    const list = await this.findTransactions({ where });
    return list.length;
  }

  public async getSummary(): Promise<any> {
    let totalStockUnits = 0;
    let totalValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inStockCount = 0;

    for (const p of this.mockClient.products) {
      const stock = p.currentStock || 0;
      const pPrice = Number(p.purchasePrice || 0);
      const sPrice = Number(p.sellingPrice || 0);

      totalStockUnits += stock;
      totalValuation += stock * pPrice;
      totalRetailValuation += stock * sPrice;

      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= p.reorderLevel) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
    }

    return {
      totalProducts: this.mockClient.products.length,
      totalStockUnits,
      totalValuation: Number(totalValuation.toFixed(2)),
      totalRetailValuation: Number(totalRetailValuation.toFixed(2)),
      potentialProfit: Number((totalRetailValuation - totalValuation).toFixed(2)),
      lowStockCount,
      outOfStockCount,
      inStockCount,
    };
  }

  public async getLowStockProducts(limit: number = 50): Promise<InventoryItemWithDetails[]> {
    return this.mockClient.products
      .filter((p) => p.currentStock <= p.reorderLevel)
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, limit);
  }
}

// =========================================================
// Test Suite Runner
// =========================================================
async function runInventoryTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Inventory Test Suite');
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

  // Sample data
  const sampleCategory = { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Electronics', slug: 'electronics' };
  const sampleUserAdmin = { id: 'u1-admin-00000000-0000-000000000001', name: 'Admin Eleanor', email: 'admin@smartstock.com', role: UserRole.ADMIN };
  const sampleUserManager = { id: 'u2-manager-00000000-0000-000000000002', name: 'Manager Marcus', email: 'manager@smartstock.com', role: UserRole.MANAGER };
  const sampleUserCashier = { id: 'u3-cashier-00000000-0000-000000000003', name: 'Cashier James', email: 'cashier@smartstock.com', role: UserRole.CASHIER };

  const sampleProducts = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Mechanical Gaming Keyboard',
      sku: 'SKU-KB-001',
      categoryId: sampleCategory.id,
      category: sampleCategory,
      currentStock: 25,
      reorderLevel: 10,
      purchasePrice: 45.0,
      sellingPrice: 89.99,
      unit: 'pcs',
      status: 'ACTIVE',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Wireless Ergonomic Mouse',
      sku: 'SKU-MS-002',
      categoryId: sampleCategory.id,
      category: sampleCategory,
      currentStock: 4, // LOW STOCK (4 <= 10)
      reorderLevel: 10,
      purchasePrice: 20.0,
      sellingPrice: 49.99,
      unit: 'pcs',
      status: 'ACTIVE',
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'USB-C Fast Charging Cable',
      sku: 'SKU-CB-003',
      categoryId: sampleCategory.id,
      category: sampleCategory,
      currentStock: 0, // OUT OF STOCK
      reorderLevel: 15,
      purchasePrice: 3.5,
      sellingPrice: 12.99,
      unit: 'pcs',
      status: 'ACTIVE',
    },
  ];

  console.log('--- 1. Schema & Input Validation ---');

  // Test 1: Rejects non-UUID productId
  {
    const parseResult = inventoryAdjustmentSchema.safeParse({
      productId: 'invalid-not-a-uuid',
      quantity: 5,
      reason: 'Standard stock adjustment',
    });
    assert(!parseResult.success, '1. Validation: Rejects invalid non-UUID product ID');
  }

  // Test 2: Rejects reason shorter than 3 characters
  {
    const parseResult = inventoryAdjustmentSchema.safeParse({
      productId: sampleProducts[0].id,
      quantity: 5,
      reason: 'No',
    });
    assert(!parseResult.success, '2. Validation: Rejects reason shorter than 3 characters');
  }

  // Test 3: Rejects negative quantity when mode is ADD
  {
    const parseResult = inventoryAdjustmentSchema.safeParse({
      productId: sampleProducts[0].id,
      mode: 'ADD',
      quantity: -10,
      reason: 'Stock addition',
    });
    assert(!parseResult.success, '3. Validation: Rejects negative quantity when mode is ADD');
  }

  // Test 4: Rejects missing targetStock when mode is SET
  {
    const parseResult = inventoryAdjustmentSchema.safeParse({
      productId: sampleProducts[0].id,
      mode: 'SET',
      reason: 'Recount audit',
    });
    assert(!parseResult.success, '4. Validation: Rejects missing targetStock when mode is SET');
  }

  // Test 5: Rejects negative targetStock in SET mode
  {
    const parseResult = inventoryAdjustmentSchema.safeParse({
      productId: sampleProducts[0].id,
      mode: 'SET',
      targetStock: -5,
      reason: 'Recount audit',
    });
    assert(!parseResult.success, '5. Validation: Rejects negative targetStock in SET mode');
  }

  // Test 6: Valid adjustment schema passes
  {
    const parseResult = inventoryAdjustmentSchema.safeParse({
      productId: sampleProducts[0].id,
      type: TransactionType.ADJUSTMENT,
      mode: 'DELTA',
      quantity: 15,
      reason: 'Annual warehouse recount adjustment',
      reference: 'AUDIT-2026-09',
    });
    assert(parseResult.success, '6. Validation: Valid adjustment schema passes');
  }

  console.log('\n--- 2. Negative Stock Prevention ---');

  // Test 7: Strict rejection when stock deduction exceeds current stock
  {
    const mockClient = new MockTransactionalPrismaClient({
      products: sampleProducts,
      users: [sampleUserManager],
    });
    const mockRepo = new MockInventoryRepository(mockClient);
    const service = new InventoryService(mockClient as any, mockRepo);

    let errorCaught: any = null;
    try {
      // Current stock is 25. Attempting to deduct 30 items
      await service.adjustStock(
        {
          productId: sampleProducts[0].id,
          mode: 'DEDUCT',
          quantity: 30,
          reason: 'Excess write-off attempt',
        },
        sampleUserManager.id
      );
    } catch (err: any) {
      errorCaught = err;
    }

    assert(
      errorCaught &&
        errorCaught.statusCode === 400 &&
        errorCaught.message.includes('cannot be negative'),
      '7. Negative Stock Prevention: Strictly blocks stock deduction below zero (throws 400 ApiError)'
    );

    // Verify stock remains unmodified
    const prodAfter = mockClient.products.find((p) => p.id === sampleProducts[0].id);
    assert(
      prodAfter.currentStock === 25,
      '8. Safety: Stock remains untouched when negative stock attempt is rejected'
    );
  }

  // Test 9: Strict rejection when SET mode would set negative stock
  {
    const mockClient = new MockTransactionalPrismaClient({
      products: sampleProducts,
      users: [sampleUserManager],
    });
    const mockRepo = new MockInventoryRepository(mockClient);
    const service = new InventoryService(mockClient as any, mockRepo);

    let errorCaught: any = null;
    try {
      await service.adjustStock(
        {
          productId: sampleProducts[0].id,
          mode: 'SET',
          targetStock: -10 as any, // Schema or service level
          reason: 'Negative set attempt',
        },
        sampleUserManager.id
      );
    } catch (err: any) {
      errorCaught = err;
    }

    assert(errorCaught !== null, '9. Negative Stock Prevention: Blocks negative target stock');
  }

  console.log('\n--- 3. Stock Adjustments & Transaction Creation ---');

  // Test 10: Successful stock addition (+10) creates transaction
  {
    const mockClient = new MockTransactionalPrismaClient({
      products: sampleProducts,
      users: [sampleUserManager],
    });
    const mockRepo = new MockInventoryRepository(mockClient);
    const service = new InventoryService(mockClient as any, mockRepo);

    const initialStock = sampleProducts[0].currentStock; // 25
    const result = await service.adjustStock(
      {
        productId: sampleProducts[0].id,
        type: TransactionType.ADJUSTMENT,
        mode: 'ADD',
        quantity: 10,
        reason: 'Found misplaced stock in aisle B',
        reference: 'ADJ-AISLE-B',
      },
      sampleUserManager.id
    );

    assert(
      result.stockBefore === initialStock &&
        result.stockAfter === initialStock + 10 &&
        result.product.currentStock === initialStock + 10,
      '10. Stock Adjustment: Incrementally adds stock accurately (stockAfter = stockBefore + quantity)'
    );

    // Verify InventoryTransaction record
    const createdTxn = mockClient.inventoryTransactions[0];
    assert(
      createdTxn &&
        createdTxn.productId === sampleProducts[0].id &&
        createdTxn.type === TransactionType.ADJUSTMENT &&
        createdTxn.quantity === 10 &&
        createdTxn.stockBefore === 25 &&
        createdTxn.stockAfter === 35 &&
        createdTxn.userId === sampleUserManager.id &&
        createdTxn.referenceId === 'ADJ-AISLE-B',
      '11. Inventory Audit Transaction: Creates valid audit record with all metadata and relations'
    );
  }

  // Test 12: Stock write-off with DAMAGE type
  {
    const mockClient = new MockTransactionalPrismaClient({
      products: sampleProducts,
      users: [sampleUserManager],
    });
    const mockRepo = new MockInventoryRepository(mockClient);
    const service = new InventoryService(mockClient as any, mockRepo);

    const result = await service.adjustStock(
      {
        productId: sampleProducts[0].id, // stock 25
        type: TransactionType.DAMAGE,
        mode: 'DEDUCT',
        quantity: 3,
        reason: 'Water leak damage in warehouse shelf 4',
        reference: 'DAM-2026-001',
      },
      sampleUserManager.id
    );

    assert(
      result.stockBefore === 25 &&
        result.stockAfter === 22 &&
        result.product.currentStock === 22,
      '12. Damage Adjustment: Deducts stock and records accurate stockBefore/stockAfter'
    );

    const txn = mockClient.inventoryTransactions[0];
    assert(
      txn &&
        txn.type === TransactionType.DAMAGE &&
        txn.quantity === -3 &&
        txn.stockBefore === 25 &&
        txn.stockAfter === 22,
      '13. Damage Audit Record: Transaction reflects DAMAGE type and negative delta quantity'
    );
  }

  // Test 14: Customer RETURN adjustment
  {
    const mockClient = new MockTransactionalPrismaClient({
      products: sampleProducts,
      users: [sampleUserManager],
    });
    const mockRepo = new MockInventoryRepository(mockClient);
    const service = new InventoryService(mockClient as any, mockRepo);

    const result = await service.adjustStock(
      {
        productId: sampleProducts[1].id, // stock 4
        type: TransactionType.RETURN,
        mode: 'ADD',
        quantity: 2,
        reason: 'Customer returned unopened product under warranty',
        reference: 'RET-INV-1092',
      },
      sampleUserManager.id
    );

    assert(
      result.stockBefore === 4 &&
        result.stockAfter === 6 &&
        mockClient.inventoryTransactions[0].type === TransactionType.RETURN,
      '14. Return Adjustment: Correctly records RETURN transaction type with stock addition'
    );
  }

  // Test 15: SET mode target count
  {
    const mockClient = new MockTransactionalPrismaClient({
      products: sampleProducts,
      users: [sampleUserManager],
    });
    const mockRepo = new MockInventoryRepository(mockClient);
    const service = new InventoryService(mockClient as any, mockRepo);

    // Current stock is 25. Physical count finds 30 items.
    const result = await service.adjustStock(
      {
        productId: sampleProducts[0].id,
        type: TransactionType.ADJUSTMENT,
        mode: 'SET',
        targetStock: 30,
        reason: 'Monthly cycle count',
      },
      sampleUserManager.id
    );

    assert(
      result.stockBefore === 25 &&
        result.stockAfter === 30 &&
        result.transaction.quantity === 5,
      '15. SET Mode: Accurately adjusts stock to target physical count with computed delta'
    );
  }

  console.log('\n--- 4. Database Transaction Atomicity & Rollback ---');

  // Test 16: Rollback on database failure
  {
    const mockClient = new MockTransactionalPrismaClient({
      products: sampleProducts,
      users: [sampleUserManager],
    });
    mockClient.failOnTransaction = true; // Simulate failure during transaction creation
    const mockRepo = new MockInventoryRepository(mockClient);
    const service = new InventoryService(mockClient as any, mockRepo);

    let failed = false;
    try {
      await service.adjustStock(
        {
          productId: sampleProducts[0].id,
          mode: 'ADD',
          quantity: 10,
          reason: 'Test rollback',
        },
        sampleUserManager.id
      );
    } catch {
      failed = true;
    }

    const prod = mockClient.products.find((p) => p.id === sampleProducts[0].id);
    assert(
      failed && prod.currentStock === 25 && mockClient.inventoryTransactions.length === 0,
      '16. Transaction Atomicity: Product stock changes roll back completely if audit creation fails'
    );
  }

  console.log('\n--- 5. Low-Stock Alerts (currentStock <= reorderLevel) ---');

  // Test 17: Low-stock detection
  {
    const mockClient = new MockTransactionalPrismaClient({
      products: sampleProducts,
      users: [sampleUserManager],
    });
    const mockRepo = new MockInventoryRepository(mockClient);
    const service = new InventoryService(mockClient as any, mockRepo);

    const alerts = await service.getLowStockAlerts();

    // sampleProducts[1]: stock 4, reorder 10 (LOW_STOCK)
    // sampleProducts[2]: stock 0, reorder 15 (OUT_OF_STOCK)
    assert(
      alerts.length === 2,
      '17. Low-Stock Alerts: Retrieves all products where currentStock <= reorderLevel'
    );

    const outOfStockAlert = alerts.find((a) => a.id === sampleProducts[2].id);
    const lowStockAlert = alerts.find((a) => a.id === sampleProducts[1].id);

    assert(
      Boolean(
        outOfStockAlert &&
          outOfStockAlert.severity === 'CRITICAL' &&
          outOfStockAlert.deficit === 15 &&
          outOfStockAlert.stockStatus === 'OUT_OF_STOCK'
      ),
      '18. Alert Severity: Out-of-stock items marked CRITICAL with accurate replenishment deficit'
    );

    assert(
      Boolean(
        lowStockAlert &&
          lowStockAlert.severity === 'WARNING' &&
          lowStockAlert.deficit === 6 &&
          lowStockAlert.stockStatus === 'LOW_STOCK'
      ),
      '19. Alert Severity: Low-stock items marked WARNING with deficit (reorderLevel - currentStock)'
    );
  }

  console.log('\n--- 6. Inventory Summary Endpoints ---');

  // Test 20: Summary calculation
  {
    const mockClient = new MockTransactionalPrismaClient({
      products: sampleProducts,
      users: [sampleUserManager],
    });
    const mockRepo = new MockInventoryRepository(mockClient);
    const service = new InventoryService(mockClient as any, mockRepo);

    const summary = await service.getSummary();

    // Product 1: 25 * 45 = 1125, retail: 25 * 89.99 = 2249.75
    // Product 2: 4 * 20 = 80, retail: 4 * 49.99 = 199.96
    // Product 3: 0 * 3.5 = 0, retail: 0
    // Total units: 29
    // Total valuation: 1205.00
    // Low stock count: 1 (p2)
    // Out of stock count: 1 (p3)
    // In stock count: 1 (p1)
    assert(
      summary.totalProducts === 3 &&
        summary.totalStockUnits === 29 &&
        summary.totalValuation === 1205.0 &&
        summary.lowStockCount === 1 &&
        summary.outOfStockCount === 1 &&
        summary.inStockCount === 1,
      '20. Inventory Summary: Correctly calculates stock units, valuation, low stock, and out of stock counts'
    );
  }

  console.log('\n--- 7. Inventory History Listing & Filtering ---');

  // Test 21: Querying history
  {
    const mockClient = new MockTransactionalPrismaClient({
      products: sampleProducts,
      users: [sampleUserManager, sampleUserCashier],
      inventoryTransactions: [
        {
          id: 'tx-1',
          productId: sampleProducts[0].id,
          userId: sampleUserManager.id,
          type: TransactionType.PURCHASE,
          quantity: 25,
          stockBefore: 0,
          stockAfter: 25,
          notes: 'Initial receipt PO-01',
          referenceId: 'PO-01',
          createdAt: new Date('2026-09-01'),
          product: sampleProducts[0],
          user: sampleUserManager,
        },
        {
          id: 'tx-2',
          productId: sampleProducts[0].id,
          userId: sampleUserCashier.id,
          type: TransactionType.SALE,
          quantity: -3,
          stockBefore: 25,
          stockAfter: 22,
          notes: 'POS checkout',
          referenceId: 'INV-101',
          createdAt: new Date('2026-09-02'),
          product: sampleProducts[0],
          user: sampleUserCashier,
        },
      ],
    });
    const mockRepo = new MockInventoryRepository(mockClient);
    const service = new InventoryService(mockClient as any, mockRepo);

    const history = await service.listHistory({ page: 1, limit: 10, type: TransactionType.SALE });
    assert(
      history.items.length === 1 && history.items[0].type === TransactionType.SALE,
      '21. Inventory History: Filters history by transaction type accurately'
    );
  }

  console.log('\n--- 8. Role-Based Access Control (RBAC) ---');

  // Test 22: Cashier blocked from adjusting stock
  {
    const req = {
      user: { id: sampleUserCashier.id, role: UserRole.CASHIER },
    } as unknown as Request;
    let forbiddenError: any = null;
    const next: NextFunction = (err?: any) => {
      forbiddenError = err;
    };
    const rbacMiddleware = authorize(UserRole.ADMIN, UserRole.MANAGER);
    rbacMiddleware(req, {} as Response, next);

    assert(
      forbiddenError &&
        forbiddenError.statusCode === 403 &&
        forbiddenError.message.includes("Role 'CASHIER' does not have sufficient permissions"),
      '22. RBAC: Cashier is blocked with 403 Forbidden from inventory adjustment'
    );
  }

  // Test 23: Admin and Manager permitted to adjust stock
  {
    const req = {
      user: { id: sampleUserManager.id, role: UserRole.MANAGER },
    } as unknown as Request;
    let nextCalledWithoutError = false;
    const next: NextFunction = (err?: any) => {
      if (!err) nextCalledWithoutError = true;
    };
    const rbacMiddleware = authorize(UserRole.ADMIN, UserRole.MANAGER);
    rbacMiddleware(req, {} as Response, next);

    assert(
      nextCalledWithoutError,
      '23. RBAC: Manager role is permitted to execute inventory adjustments'
    );

    // Also verify Admin role
    const adminReq = {
      user: { id: sampleUserAdmin.id, role: UserRole.ADMIN },
    } as unknown as Request;
    let adminNextCalled = false;
    rbacMiddleware(adminReq, {} as Response, ((err?: any) => {
      if (!err) adminNextCalled = true;
    }) as NextFunction);

    assert(
      adminNextCalled,
      '24. RBAC: Admin role is permitted to execute inventory adjustments'
    );
  }

  console.log(`\n📊 Inventory Test Suite Results: ${passedTests}/${totalTests} Passed.\n`);

  if (passedTests !== totalTests) {
    throw new Error('Inventory Test Suite failed');
  }
}

if (require.main === module) {
  runInventoryTests()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
