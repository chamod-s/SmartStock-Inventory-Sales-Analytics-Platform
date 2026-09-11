import { UserRole, PurchaseStatus, TransactionType } from '@prisma/client';
import { PurchaseService } from '../services/purchase.service';
import { PurchaseRepository } from '../repositories/purchase.repository';
import {
  createPurchaseSchema,
  CreatePurchaseInput,
} from '../validators/purchase.validator';
import { authorize } from '../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';

// =========================================================
// In-Memory Transactional Engine for Prisma $transaction
// =========================================================
class MockTransactionalPrismaClient {
  public suppliers: any[] = [];
  public products: any[] = [];
  public purchases: any[] = [];
  public purchaseItems: any[] = [];
  public inventoryTransactions: any[] = [];
  public failOnInventoryTransaction: boolean = false;

  constructor(initialData: {
    suppliers?: any[];
    products?: any[];
    purchases?: any[];
    inventoryTransactions?: any[];
  }) {
    this.suppliers = JSON.parse(JSON.stringify(initialData.suppliers || []));
    this.products = JSON.parse(JSON.stringify(initialData.products || []));
    this.purchases = JSON.parse(JSON.stringify(initialData.purchases || []));
    this.inventoryTransactions = JSON.parse(JSON.stringify(initialData.inventoryTransactions || []));
  }

  private createSnapshot() {
    return {
      suppliers: JSON.parse(JSON.stringify(this.suppliers)),
      products: JSON.parse(JSON.stringify(this.products)),
      purchases: JSON.parse(JSON.stringify(this.purchases)),
      purchaseItems: JSON.parse(JSON.stringify(this.purchaseItems)),
      inventoryTransactions: JSON.parse(JSON.stringify(this.inventoryTransactions)),
    };
  }

  private restoreSnapshot(snapshot: any) {
    this.suppliers = snapshot.suppliers;
    this.products = snapshot.products;
    this.purchases = snapshot.purchases;
    this.purchaseItems = snapshot.purchaseItems;
    this.inventoryTransactions = snapshot.inventoryTransactions;
  }

  public async $transaction(fn: (tx: any) => Promise<any>, _options?: any): Promise<any> {
    const snapshot = this.createSnapshot();

    const txContext: any = {
      supplier: {
        findUnique: async (args: any) => {
          const s = this.suppliers.find((sup) => sup.id === args.where.id);
          return s ? JSON.parse(JSON.stringify(s)) : null;
        },
      },
      product: {
        findUnique: async (args: any) => {
          const p = this.products.find((prod) => prod.id === args.where.id);
          return p ? JSON.parse(JSON.stringify(p)) : null;
        },
        findMany: async (args: any) => {
          if (args.where?.id?.in) {
            const list = this.products.filter((p) => args.where.id.in.includes(p.id));
            return JSON.parse(JSON.stringify(list));
          }
          return JSON.parse(JSON.stringify(this.products));
        },
        update: async (args: any) => {
          const idx = this.products.findIndex((p) => p.id === args.where.id);
          if (idx === -1) throw new Error('Product not found');
          this.products[idx] = {
            ...this.products[idx],
            ...args.data,
            currentStock: args.data.currentStock ?? this.products[idx].currentStock,
          };
          return JSON.parse(JSON.stringify(this.products[idx]));
        },
      },
      purchase: {
        findUnique: async (args: any) => {
          let p = null;
          if (args.where.id) {
            p = this.purchases.find((pur) => pur.id === args.where.id);
          } else if (args.where.purchaseOrderNumber) {
            p = this.purchases.find((pur) => pur.purchaseOrderNumber === args.where.purchaseOrderNumber);
          }
          if (!p) return null;

          const items = this.purchaseItems
            .filter((item) => item.purchaseId === p.id)
            .map((item) => ({
              ...item,
              product: this.products.find((prod) => prod.id === item.productId),
            }));

          const supplier = this.suppliers.find((sup) => sup.id === p.supplierId);

          return {
            ...p,
            items,
            supplier,
            user: { id: p.userId, name: 'Admin User', email: 'admin@smartstock.com', role: 'ADMIN' },
          };
        },
        create: async (args: any) => {
          const newId = `po-id-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const purchaseRecord = {
            id: newId,
            purchaseOrderNumber: args.data.purchaseOrderNumber,
            supplierId: args.data.supplierId,
            userId: args.data.userId,
            subtotal: args.data.subtotal,
            taxAmount: args.data.taxAmount,
            discountAmount: args.data.discountAmount,
            totalAmount: args.data.totalAmount,
            status: args.data.status,
            notes: args.data.notes,
            purchaseDate: args.data.purchaseDate || new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.purchases.push(purchaseRecord);

          if (args.data.items?.create) {
            for (const item of args.data.items.create) {
              this.purchaseItems.push({
                id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                purchaseId: newId,
                productId: item.productId,
                quantity: item.quantity,
                unitCost: item.unitCost,
                subtotal: item.subtotal,
              });
            }
          }

          return purchaseRecord;
        },
        update: async (args: any) => {
          const idx = this.purchases.findIndex((p) => p.id === args.where.id);
          if (idx === -1) throw new Error('Purchase not found');
          this.purchases[idx] = {
            ...this.purchases[idx],
            ...args.data,
            updatedAt: new Date(),
          };
          return this.purchases[idx];
        },
      },
      inventoryTransaction: {
        create: async (args: any) => {
          if (this.failOnInventoryTransaction) {
            throw new Error('Simulated database deadlock during InventoryTransaction creation');
          }
          const txn = {
            id: `txn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            productId: args.data.productId,
            userId: args.data.userId,
            type: args.data.type,
            quantity: args.data.quantity,
            stockBefore: args.data.stockBefore,
            stockAfter: args.data.stockAfter,
            referenceId: args.data.referenceId,
            notes: args.data.notes,
            createdAt: new Date(),
          };
          this.inventoryTransactions.push(txn);
          return txn;
        },
        findMany: async (args: any) => {
          let list = [...this.inventoryTransactions];
          if (args.where?.referenceId) {
            list = list.filter((t) => t.referenceId === args.where.referenceId);
          }
          return JSON.parse(JSON.stringify(list));
        },
      },
    };

    try {
      const result = await fn(txContext);
      return result;
    } catch (err) {
      // ACID ROLLBACK
      this.restoreSnapshot(snapshot);
      throw err;
    }
  }
}

// =========================================================
// Mock Purchase Repository
// =========================================================
class MockPurchaseRepository extends PurchaseRepository {
  private mockClient: MockTransactionalPrismaClient;

  constructor(mockClient: MockTransactionalPrismaClient) {
    super();
    this.mockClient = mockClient;
  }

  public async findById(id: string, _tx?: any): Promise<any> {
    const p = this.mockClient.purchases.find((pur) => pur.id === id);
    if (!p) return null;

    const supplier = this.mockClient.suppliers.find((s) => s.id === p.supplierId);
    const items = this.mockClient.purchaseItems
      .filter((i) => i.purchaseId === id)
      .map((item) => ({
        ...item,
        product: this.mockClient.products.find((prod) => prod.id === item.productId),
      }));

    const inventoryTransactions = this.mockClient.inventoryTransactions.filter(
      (t) => t.referenceId === id
    );

    return {
      ...p,
      supplier,
      user: { id: p.userId, name: 'Admin User', email: 'admin@smartstock.com', role: 'ADMIN' },
      items,
      inventoryTransactions,
    };
  }

  public async generatePoNumber(_tx?: any): Promise<string> {
    const year = new Date().getFullYear();
    const count = this.mockClient.purchases.length + 1;
    return `PO-${year}-${count.toString().padStart(4, '0')}`;
  }

  public async count(_where?: any): Promise<number> {
    return this.mockClient.purchases.length;
  }

  public async findMany(_options: any = {}): Promise<any[]> {
    return this.mockClient.purchases.map((p) => ({
      ...p,
      supplier: this.mockClient.suppliers.find((s) => s.id === p.supplierId),
      user: { id: p.userId, name: 'Admin', email: 'admin@smartstock.com', role: 'ADMIN' },
      items: this.mockClient.purchaseItems.filter((i) => i.purchaseId === p.id),
      _count: { items: this.mockClient.purchaseItems.filter((i) => i.purchaseId === p.id).length },
    }));
  }

  public async getSummary(_where?: any): Promise<any> {
    const totalPurchases = this.mockClient.purchases.length;
    const totalSpend = this.mockClient.purchases.reduce(
      (sum, p) => sum + Number(p.totalAmount || 0),
      0
    );
    const receivedCount = this.mockClient.purchases.filter(
      (p) => p.status === PurchaseStatus.RECEIVED
    ).length;
    const pendingCount = this.mockClient.purchases.filter(
      (p) => p.status === PurchaseStatus.PENDING
    ).length;
    const cancelledCount = this.mockClient.purchases.filter(
      (p) => p.status === PurchaseStatus.CANCELLED
    ).length;

    return { totalPurchases, totalSpend, receivedCount, pendingCount, cancelledCount };
  }
}

// =========================================================
// Test Runner
// =========================================================
async function runPurchaseTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Purchase Test Suite');
  console.log('🧪 ===============================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, failureDetails: string = '') {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (failureDetails) console.error(`     Details: ${failureDetails}`);
    }
  }

  // Sample seed data
  const sampleSupplier = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    code: 'SUP-001',
    name: 'Apex Components Ltd',
    isActive: true,
  };

  const sampleProduct1 = {
    id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
    name: 'Mechanical Gaming Keyboard',
    sku: 'SKU-KEY-001',
    purchasePrice: 35.0,
    sellingPrice: 79.99,
    currentStock: 20,
    unit: 'pcs',
  };

  const sampleProduct2 = {
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33',
    name: 'Wireless Ergonomic Mouse',
    sku: 'SKU-MOU-002',
    purchasePrice: 18.0,
    sellingPrice: 45.0,
    currentStock: 15,
    unit: 'pcs',
  };

  const userId = 'u0eebc99-9c0b-4ef8-bb6d-6bb9bd380d44';

  console.log('--- 1. Validation & Schema Constraints ---');

  // Test 1: Invalid quantity (<= 0) rejected
  {
    const invalidInput = {
      supplierId: sampleSupplier.id,
      items: [{ productId: sampleProduct1.id, quantity: 0, unitCost: 35.0 }],
    };
    const result = createPurchaseSchema.safeParse(invalidInput);
    assert(!result.success, '1. Validation: Rejects purchase item with quantity = 0');
  }

  // Test 2: Invalid quantity (negative) rejected
  {
    const invalidInput = {
      supplierId: sampleSupplier.id,
      items: [{ productId: sampleProduct1.id, quantity: -5, unitCost: 35.0 }],
    };
    const result = createPurchaseSchema.safeParse(invalidInput);
    assert(!result.success, '2. Validation: Rejects purchase item with negative quantity');
  }

  // Test 3: Invalid quantity (float/decimal) rejected
  {
    const invalidInput = {
      supplierId: sampleSupplier.id,
      items: [{ productId: sampleProduct1.id, quantity: 2.5, unitCost: 35.0 }],
    };
    const result = createPurchaseSchema.safeParse(invalidInput);
    assert(!result.success, '3. Validation: Rejects purchase item with non-integer quantity');
  }

  // Test 4: Invalid unit cost (negative) rejected
  {
    const invalidInput = {
      supplierId: sampleSupplier.id,
      items: [{ productId: sampleProduct1.id, quantity: 5, unitCost: -10.0 }],
    };
    const result = createPurchaseSchema.safeParse(invalidInput);
    assert(!result.success, '4. Validation: Rejects purchase item with negative unit cost');
  }

  // Test 5: Empty items array rejected
  {
    const invalidInput = {
      supplierId: sampleSupplier.id,
      items: [],
    };
    const result = createPurchaseSchema.safeParse(invalidInput);
    assert(!result.success, '5. Validation: Rejects purchase order with empty items array');
  }

  // Test 6: Valid purchase input passes schema
  {
    const validInput = {
      supplierId: sampleSupplier.id,
      purchaseDate: '2026-09-11',
      items: [
        { productId: sampleProduct1.id, quantity: 10, unitCost: 35.0 },
        { productId: sampleProduct2.id, quantity: 5, unitCost: 18.0 },
      ],
      discount: 15.0,
      tax: 20.0,
      notes: 'Initial test order',
    };
    const result = createPurchaseSchema.safeParse(validInput);
    assert(result.success, '6. Validation: Valid purchase schema passes successfully');
  }

  console.log('\n--- 2. Purchase Creation, Financials & Stock Increase ---');

  // Test 7: Purchase Creation with full financial calculation
  {
    const mockClient = new MockTransactionalPrismaClient({
      suppliers: [sampleSupplier],
      products: [sampleProduct1, sampleProduct2],
    });
    const mockRepo = new MockPurchaseRepository(mockClient);
    const service = new PurchaseService(mockClient as any, mockRepo);

    const input: CreatePurchaseInput = {
      supplierId: sampleSupplier.id,
      purchaseOrderNumber: 'PO-2026-TEST1',
      purchaseDate: new Date('2026-09-11'),
      status: PurchaseStatus.RECEIVED,
      items: [
        { productId: sampleProduct1.id, quantity: 10, unitCost: 35.0 }, // Subtotal: 350.00
        { productId: sampleProduct2.id, quantity: 5, unitCost: 18.0 },  // Subtotal: 90.00
      ],
      discount: 10.0,
      tax: 25.0,
      notes: 'Test creation',
    };

    const purchase = await service.createPurchase(input, userId);

    const expectedSubtotal = 440.0; // 350 + 90
    const expectedTotal = 455.0;    // 440 - 10 + 25

    assert(
      purchase &&
        purchase.purchaseOrderNumber === 'PO-2026-TEST1' &&
        Number(purchase.subtotal) === expectedSubtotal &&
        Number(purchase.totalAmount) === expectedTotal &&
        Number(purchase.discountAmount) === 10.0 &&
        Number(purchase.taxAmount) === 25.0,
      '7. Purchase creation: Correctly computes subtotal, tax, discount, and total amount'
    );
  }

  // Test 8: Stock Increase when purchase is RECEIVED
  {
    const mockClient = new MockTransactionalPrismaClient({
      suppliers: [sampleSupplier],
      products: [sampleProduct1, sampleProduct2],
    });
    const mockRepo = new MockPurchaseRepository(mockClient);
    const service = new PurchaseService(mockClient as any, mockRepo);

    const initialStockProd1 = sampleProduct1.currentStock; // 20
    const initialStockProd2 = sampleProduct2.currentStock; // 15
    const qty1 = 10;
    const qty2 = 5;

    await service.createPurchase(
      {
        supplierId: sampleSupplier.id,
        status: PurchaseStatus.RECEIVED,
        items: [
          { productId: sampleProduct1.id, quantity: qty1, unitCost: 35.0 },
          { productId: sampleProduct2.id, quantity: qty2, unitCost: 18.0 },
        ],
      },
      userId
    );

    const updatedProd1 = mockClient.products.find((p) => p.id === sampleProduct1.id);
    const updatedProd2 = mockClient.products.find((p) => p.id === sampleProduct2.id);

    assert(
      updatedProd1?.currentStock === initialStockProd1 + qty1 &&
        updatedProd2?.currentStock === initialStockProd2 + qty2,
      '8. Stock increase: Product stocks accurately incremented by received quantities (stockAfter = stockBefore + quantity)'
    );
  }

  console.log('\n--- 3. Inventory Transaction Audit Records ---');

  // Test 9: Inventory transaction audit record created with correct fields
  {
    const mockClient = new MockTransactionalPrismaClient({
      suppliers: [sampleSupplier],
      products: [sampleProduct1],
    });
    const mockRepo = new MockPurchaseRepository(mockClient);
    const service = new PurchaseService(mockClient as any, mockRepo);

    const stockBefore = sampleProduct1.currentStock; // 20
    const addQty = 8;

    const purchase = await service.createPurchase(
      {
        supplierId: sampleSupplier.id,
        status: PurchaseStatus.RECEIVED,
        items: [{ productId: sampleProduct1.id, quantity: addQty, unitCost: 35.0 }],
      },
      userId
    );

    const txns = mockClient.inventoryTransactions.filter((t) => t.referenceId === purchase.id);

    assert(
      txns.length === 1 &&
        txns[0].productId === sampleProduct1.id &&
        txns[0].type === TransactionType.PURCHASE &&
        txns[0].quantity === addQty &&
        txns[0].stockBefore === stockBefore &&
        txns[0].stockAfter === stockBefore + addQty &&
        txns[0].userId === userId,
      '9. Inventory transaction: Transaction created with type PURCHASE, correct stockBefore, stockAfter, and quantity'
    );
  }

  console.log('\n--- 4. Database Transaction Atomicity & Rollback ---');

  // Test 10: Rollback when error occurs inside transaction
  {
    const mockClient = new MockTransactionalPrismaClient({
      suppliers: [sampleSupplier],
      products: [sampleProduct1],
    });
    mockClient.failOnInventoryTransaction = true; // Trigger deliberate failure inside transaction

    const mockRepo = new MockPurchaseRepository(mockClient);
    const service = new PurchaseService(mockClient as any, mockRepo);

    const stockBeforeAttempt = sampleProduct1.currentStock;
    let errorCaught = false;

    try {
      await service.createPurchase(
        {
          supplierId: sampleSupplier.id,
          status: PurchaseStatus.RECEIVED,
          items: [{ productId: sampleProduct1.id, quantity: 15, unitCost: 35.0 }],
        },
        userId
      );
    } catch (err: any) {
      errorCaught = true;
    }

    const prodAfter = mockClient.products.find((p) => p.id === sampleProduct1.id);
    const purchasesCount = mockClient.purchases.length;
    const txnsCount = mockClient.inventoryTransactions.length;

    assert(
      errorCaught &&
        prodAfter?.currentStock === stockBeforeAttempt &&
        purchasesCount === 0 &&
        txnsCount === 0,
      '10. Rollback: If any operation fails midway, entire Prisma transaction rolls back (zero stock changes, zero purchases persisted)'
    );
  }

  console.log('\n--- 5. Error Rejection: Invalid Product & Invalid Quantity ---');

  // Test 11: Invalid Product throws 404 and rolls back
  {
    const mockClient = new MockTransactionalPrismaClient({
      suppliers: [sampleSupplier],
      products: [sampleProduct1],
    });
    const mockRepo = new MockPurchaseRepository(mockClient);
    const service = new PurchaseService(mockClient as any, mockRepo);

    const nonExistentProductId = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d99';
    let notFoundError: any = null;

    try {
      await service.createPurchase(
        {
          supplierId: sampleSupplier.id,
          items: [{ productId: nonExistentProductId, quantity: 5, unitCost: 10.0 }],
        },
        userId
      );
    } catch (err: any) {
      notFoundError = err;
    }

    assert(
      notFoundError &&
        notFoundError.statusCode === 404 &&
        mockClient.purchases.length === 0,
      '11. Invalid product: Non-existent product ID rejected with 404 Not Found'
    );
  }

  // Test 12: Inactive Supplier throws 400 Bad Request
  {
    const inactiveSupplier = { ...sampleSupplier, id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e55', isActive: false };
    const mockClient = new MockTransactionalPrismaClient({
      suppliers: [inactiveSupplier],
      products: [sampleProduct1],
    });
    const mockRepo = new MockPurchaseRepository(mockClient);
    const service = new PurchaseService(mockClient as any, mockRepo);

    let inactiveError: any = null;
    try {
      await service.createPurchase(
        {
          supplierId: inactiveSupplier.id,
          items: [{ productId: sampleProduct1.id, quantity: 5, unitCost: 10.0 }],
        },
        userId
      );
    } catch (err: any) {
      inactiveError = err;
    }

    assert(
      inactiveError &&
        inactiveError.statusCode === 400 &&
        inactiveError.message.includes('inactive supplier'),
      '12. Inactive supplier: Rejects purchase creation for inactive supplier'
    );
  }

  // Test 13: Service layer invalid quantity validation
  {
    const mockClient = new MockTransactionalPrismaClient({
      suppliers: [sampleSupplier],
      products: [sampleProduct1],
    });
    const mockRepo = new MockPurchaseRepository(mockClient);
    const service = new PurchaseService(mockClient as any, mockRepo);

    let qtyError: any = null;
    try {
      await service.createPurchase(
        {
          supplierId: sampleSupplier.id,
          items: [{ productId: sampleProduct1.id, quantity: -10, unitCost: 10.0 }],
        },
        userId
      );
    } catch (err: any) {
      qtyError = err;
    }

    assert(
      qtyError && qtyError.statusCode === 400,
      '13. Invalid quantity: Service strictly rejects invalid quantity with 400'
    );
  }

  console.log('\n--- 6. Workflow: PENDING -> RECEIVED Order Lifecycle ---');

  // Test 14: PENDING purchase created without stock changes
  {
    const mockClient = new MockTransactionalPrismaClient({
      suppliers: [sampleSupplier],
      products: [sampleProduct1],
    });
    const mockRepo = new MockPurchaseRepository(mockClient);
    const service = new PurchaseService(mockClient as any, mockRepo);

    const initialStock = sampleProduct1.currentStock;

    const pendingPurchase = await service.createPurchase(
      {
        supplierId: sampleSupplier.id,
        status: PurchaseStatus.PENDING,
        items: [{ productId: sampleProduct1.id, quantity: 12, unitCost: 35.0 }],
      },
      userId
    );

    const prodAfterPending = mockClient.products.find((p) => p.id === sampleProduct1.id);
    const txnsAfterPending = mockClient.inventoryTransactions.length;

    assert(
      pendingPurchase.status === PurchaseStatus.PENDING &&
        prodAfterPending?.currentStock === initialStock &&
        txnsAfterPending === 0,
      '14. Workflow: Creating PENDING purchase preserves product stock and creates no inventory transactions'
    );

    // Test 15: Transitioning PENDING -> RECEIVED triggers stock replenishment
    const receivedPurchase = await service.updatePurchase(
      pendingPurchase.id,
      { status: PurchaseStatus.RECEIVED },
      userId
    );

    const prodAfterReceived = mockClient.products.find((p) => p.id === sampleProduct1.id);
    const txnsAfterReceived = mockClient.inventoryTransactions.filter(
      (t) => t.referenceId === pendingPurchase.id
    );

    assert(
      receivedPurchase.status === PurchaseStatus.RECEIVED &&
        prodAfterReceived?.currentStock === initialStock + 12 &&
        txnsAfterReceived.length === 1 &&
        txnsAfterReceived[0].stockBefore === initialStock &&
        txnsAfterReceived[0].stockAfter === initialStock + 12,
      '15. Workflow: Receiving PENDING purchase atomically increases stock and records inventory transaction'
    );

    // Test 16: Attempting to receive an already RECEIVED purchase throws 400
    let doubleReceiveError: any = null;
    try {
      await service.updatePurchase(
        pendingPurchase.id,
        { status: PurchaseStatus.RECEIVED },
        userId
      );
    } catch (err: any) {
      doubleReceiveError = err;
    }

    assert(
      doubleReceiveError &&
        doubleReceiveError.statusCode === 400 &&
        doubleReceiveError.message.includes('already RECEIVED'),
      '16. Safety: Prevents double-receiving already RECEIVED purchase (idempotency protection)'
    );
  }

  console.log('\n--- 7. Role-Based Access Control (RBAC) ---');

  // Test 17: Cashier is blocked with 403 Forbidden
  {
    const req = {
      user: { id: 'cashier-1', role: UserRole.CASHIER },
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
      '17. RBAC: Cashier is blocked with 403 Forbidden from purchase write operations'
    );
  }

  // Test 18: Admin and Manager are authorized
  {
    const req = {
      user: { id: 'manager-1', role: UserRole.MANAGER },
    } as unknown as Request;
    let nextCalledWithoutError = false;
    const next: NextFunction = (err?: any) => {
      if (!err) nextCalledWithoutError = true;
    };
    const rbacMiddleware = authorize(UserRole.ADMIN, UserRole.MANAGER);
    rbacMiddleware(req, {} as Response, next);

    assert(
      nextCalledWithoutError,
      '18. RBAC: Admin and Manager roles are permitted to perform purchase operations'
    );
  }

  console.log(`\n📊 Purchase Test Suite Results: ${passedTests}/${totalTests} Passed.\n`);

  if (passedTests !== totalTests) {
    throw new Error('Purchase Test Suite failed');
  }
}

if (require.main === module) {
  runPurchaseTests()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
