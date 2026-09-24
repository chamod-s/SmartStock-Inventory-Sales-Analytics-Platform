import { UserRole, TransactionType, PaymentMethod, SaleStatus } from '@prisma/client';
import { SaleService } from '../services/sale.service';
import { SaleRepository } from '../repositories/sale.repository';
import { InventoryService } from '../services/inventory.service';
import { createSaleSchema } from '../validators/sale.validator';
import { authorize } from '../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';

// =========================================================
// Mock In-Memory Transactional Prisma Client for Sales
// =========================================================
class MockTransactionalPrismaClient {
  public products: any[] = [];
  public customers: any[] = [];
  public users: any[] = [];
  public sales: any[] = [];
  public saleItems: any[] = [];
  public payments: any[] = [];
  public inventoryTransactions: any[] = [];
  public failOnPayment: boolean = false;

  constructor(initialData: {
    products?: any[];
    customers?: any[];
    users?: any[];
    sales?: any[];
    inventoryTransactions?: any[];
  }) {
    this.products = JSON.parse(JSON.stringify(initialData.products || []));
    this.customers = JSON.parse(JSON.stringify(initialData.customers || []));
    this.users = JSON.parse(JSON.stringify(initialData.users || []));
    this.sales = JSON.parse(JSON.stringify(initialData.sales || []));
    this.inventoryTransactions = JSON.parse(JSON.stringify(initialData.inventoryTransactions || []));
  }

  private createSnapshot() {
    return {
      products: JSON.parse(JSON.stringify(this.products)),
      customers: JSON.parse(JSON.stringify(this.customers)),
      sales: JSON.parse(JSON.stringify(this.sales)),
      saleItems: JSON.parse(JSON.stringify(this.saleItems)),
      payments: JSON.parse(JSON.stringify(this.payments)),
      inventoryTransactions: JSON.parse(JSON.stringify(this.inventoryTransactions)),
    };
  }

  private restoreSnapshot(snapshot: any) {
    this.products = snapshot.products;
    this.customers = snapshot.customers;
    this.sales = snapshot.sales;
    this.saleItems = snapshot.saleItems;
    this.payments = snapshot.payments;
    this.inventoryTransactions = snapshot.inventoryTransactions;
  }

  public async $transaction(fn: (tx: any) => Promise<any>, _options?: any): Promise<any> {
    const snapshot = this.createSnapshot();

    const txContext: any = {
      product: {
        findMany: async (args: any) => {
          const ids: string[] = args.where.id.in;
          return this.products
            .filter((p) => ids.includes(p.id))
            .map((p) => JSON.parse(JSON.stringify(p)));
        },
        findUnique: async (args: any) => {
          const p = this.products.find((prod) => prod.id === args.where.id);
          return p ? JSON.parse(JSON.stringify(p)) : null;
        },
        update: async (args: any) => {
          const idx = this.products.findIndex((p) => p.id === args.where.id);
          if (idx === -1) throw new Error('Product not found in update');
          this.products[idx] = {
            ...this.products[idx],
            currentStock: args.data.currentStock ?? this.products[idx].currentStock,
          };
          return JSON.parse(JSON.stringify(this.products[idx]));
        },
      },
      customer: {
        findUnique: async (args: any) => {
          let c: any = null;
          if (args.where.id) {
            c = this.customers.find((cust) => cust.id === args.where.id);
          } else if (args.where.code) {
            c = this.customers.find((cust) => cust.code === args.where.code);
          }
          return c ? JSON.parse(JSON.stringify(c)) : null;
        },
        update: async (args: any) => {
          const idx = this.customers.findIndex((cust) => cust.id === args.where.id);
          if (idx === -1) throw new Error('Customer not found in update');
          const inc = args.data.totalSpent?.increment ? Number(args.data.totalSpent.increment) : 0;
          this.customers[idx].totalSpent = (this.customers[idx].totalSpent || 0) + inc;
          return JSON.parse(JSON.stringify(this.customers[idx]));
        },
      },
      sale: {
        create: async (args: any) => {
          const saleId = `sale-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          const itemsData = args.data.items?.create || [];
          const createdItems = itemsData.map((it: any) => {
            const itemObj = {
              id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              saleId,
              ...it,
            };
            this.saleItems.push(itemObj);
            return itemObj;
          });

          const saleObj = {
            id: saleId,
            ...args.data,
            items: createdItems,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          delete saleObj.items?.create;
          this.sales.push(saleObj);
          return JSON.parse(JSON.stringify(saleObj));
        },
        findUnique: async (args: any) => {
          const s = this.sales.find((sale) => sale.id === args.where.id);
          if (!s) return null;
          const items = this.saleItems.filter((it) => it.saleId === s.id);
          const customer = this.customers.find((c) => c.id === s.customerId) || null;
          const user = this.users.find((u) => u.id === s.userId) || { id: s.userId, name: 'Cashier', email: 'cashier@test.com', role: 'CASHIER' };
          const payments = this.payments.filter((p) => p.saleId === s.id);
          return {
            ...s,
            customer,
            user,
            items: items.map((it) => {
              const product = this.products.find((p) => p.id === it.productId);
              return { ...it, product };
            }),
            payments,
          };
        },
      },
      payment: {
        create: async (args: any) => {
          if (this.failOnPayment) {
            throw new Error('Simulated payment gateway failure');
          }
          const paymentObj = {
            id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            ...args.data,
            paidAt: new Date(),
          };
          this.payments.push(paymentObj);
          return JSON.parse(JSON.stringify(paymentObj));
        },
      },
      inventoryTransaction: {
        create: async (args: any) => {
          const txn = {
            id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            ...args.data,
            createdAt: new Date(),
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
// Mock Sale Repository
// =========================================================
class MockSaleRepository extends SaleRepository {
  private mockClient: MockTransactionalPrismaClient;
  private seq = 1;

  constructor(mockClient: MockTransactionalPrismaClient) {
    super();
    this.mockClient = mockClient;
  }

  public async findById(id: string, tx?: any): Promise<any> {
    if (tx?.sale?.findUnique) {
      return tx.sale.findUnique({ where: { id } });
    }
    const s = this.mockClient.sales.find((sale) => sale.id === id);
    if (!s) return null;
    return s;
  }

  public async generateInvoiceNumber(_tx?: any): Promise<string> {
    const year = new Date().getFullYear();
    const str = `${this.seq++}`.padStart(5, '0');
    return `INV-${year}-${str}`;
  }

  public async findMany(_options: any = {}): Promise<any[]> {
    return JSON.parse(JSON.stringify(this.mockClient.sales));
  }

  public async count(_where?: any): Promise<number> {
    return this.mockClient.sales.length;
  }

  public async getSummary(_where?: any): Promise<any> {
    const totalSales = this.mockClient.sales.length;
    let totalRevenue = 0;
    for (const s of this.mockClient.sales) {
      totalRevenue += Number(s.totalAmount || 0);
    }
    return {
      totalSales,
      totalRevenue,
      completedCount: totalSales,
      refundedCount: 0,
      cancelledCount: 0,
    };
  }
}

// =========================================================
// Test Suite Runner
// =========================================================
async function runSaleTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Sales / POS Test Suite');
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

  // Sample Data
  const sampleUserCashier = {
    id: 'u1111111-1111-4111-8111-111111111111',
    name: 'James Wilson',
    email: 'cashier@smartstock.com',
    role: UserRole.CASHIER,
  };
  const sampleUserAdmin = {
    id: 'u2222222-2222-4222-8222-222222222222',
    name: 'Eleanor Vance',
    email: 'admin@smartstock.com',
    role: UserRole.ADMIN,
  };

  const sampleCustomer = {
    id: 'c1111111-1111-4111-8111-111111111111',
    code: 'CUST-001',
    name: 'TechCorp Solutions',
    email: 'contact@techcorp.com',
    phone: '+1-555-0199',
    totalSpent: 0,
  };

  const sampleWalkInCustomer = {
    id: 'c0000000-0000-4000-8000-000000000000',
    code: 'CUST-WALKIN',
    name: 'Walk-in Customer',
    email: null,
    phone: null,
    totalSpent: 0,
  };

  const sampleProduct1 = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Wireless Bluetooth Mouse',
    sku: 'SKU-MS-001',
    purchasePrice: 15.0, // unitCost
    sellingPrice: 45.0, // unitPrice
    currentStock: 20, // Available
    reorderLevel: 5,
    unit: 'pcs',
    status: 'ACTIVE',
  };

  const sampleProduct2 = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Mechanical Keyboard RGB',
    sku: 'SKU-KB-002',
    purchasePrice: 40.0, // unitCost
    sellingPrice: 99.0, // unitPrice
    currentStock: 8, // Available
    reorderLevel: 3,
    unit: 'pcs',
    status: 'ACTIVE',
  };

  const sampleDiscontinuedProduct = {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Legacy USB Hub 2.0',
    sku: 'SKU-HUB-OLD',
    purchasePrice: 5.0,
    sellingPrice: 12.0,
    currentStock: 10,
    reorderLevel: 2,
    unit: 'pcs',
    status: 'DISCONTINUED',
  };

  console.log('--- 1. Validation & Schema Constraints ---');

  // Test 1: Rejects empty items array
  {
    const parse = createSaleSchema.safeParse({
      items: [],
      paymentMethod: PaymentMethod.CASH,
    });
    assert(!parse.success, '1. Validation: Rejects sale checkout with empty cart items array');
  }

  // Test 2: Rejects quantity = 0
  {
    const parse = createSaleSchema.safeParse({
      items: [{ productId: sampleProduct1.id, quantity: 0 }],
    });
    assert(!parse.success, '2. Validation: Rejects cart item with quantity = 0');
  }

  // Test 3: Rejects negative quantity
  {
    const parse = createSaleSchema.safeParse({
      items: [{ productId: sampleProduct1.id, quantity: -2 }],
    });
    assert(!parse.success, '3. Validation: Rejects cart item with negative quantity');
  }

  // Test 4: Rejects non-integer quantity
  {
    const parse = createSaleSchema.safeParse({
      items: [{ productId: sampleProduct1.id, quantity: 1.5 }],
    });
    assert(!parse.success, '4. Validation: Rejects cart item with fractional quantity');
  }

  // Test 5: Rejects negative discount
  {
    const parse = createSaleSchema.safeParse({
      items: [{ productId: sampleProduct1.id, quantity: 1 }],
      discountAmount: -10,
    });
    assert(!parse.success, '5. Validation: Rejects negative discount amount');
  }

  // Test 6: Valid checkout schema passes
  {
    const parse = createSaleSchema.safeParse({
      customerId: sampleCustomer.id,
      items: [
        { productId: sampleProduct1.id, quantity: 2 },
        { productId: sampleProduct2.id, quantity: 1 },
      ],
      discountAmount: 5.0,
      taxAmount: 8.5,
      paymentMethod: PaymentMethod.CARD,
      transactionRef: 'CARD-AUTH-9921',
      notes: 'Counter 1 POS Sale',
    });
    assert(parse.success, '6. Validation: Valid sale checkout payload passes successfully');
  }

  console.log('\n--- 2. Stock Validation & Insufficient Stock Rejection ---');

  // Test 7: Reject insufficient stock (never allow negative stock)
  {
    const mockClient = new MockTransactionalPrismaClient({
      products: [sampleProduct1, sampleProduct2],
      customers: [sampleCustomer],
      users: [sampleUserCashier],
    });
    const mockRepo = new MockSaleRepository(mockClient);
    const inventoryService = new InventoryService();
    const service = new SaleService(mockClient as any, mockRepo, inventoryService);

    let errorCaught: any = null;
    try {
      // sampleProduct1 currentStock is 20. Requesting 25 items!
      await service.createSale(
        {
          customerId: sampleCustomer.id,
          items: [{ productId: sampleProduct1.id, quantity: 25 }],
          paymentMethod: PaymentMethod.CASH,
        },
        sampleUserCashier.id
      );
    } catch (err: any) {
      errorCaught = err;
    }

    assert(
      errorCaught &&
        errorCaught.statusCode === 400 &&
        errorCaught.message.includes('Insufficient stock') &&
        errorCaught.message.includes('Available stock: 20'),
      '7. Insufficient Stock: Strictly rejects sale when cart quantity exceeds available stock (400 Bad Request)'
    );

    // Verify stock remains unmodified
    const prodAfter = mockClient.products.find((p) => p.id === sampleProduct1.id);
    assert(
      prodAfter.currentStock === 20,
      '8. Safety: Product stock remains untouched when sale is rejected due to insufficient stock'
    );
  }

  // Test 9: Reject discontinued product
  {
    const mockClient = new MockTransactionalPrismaClient({
      products: [sampleDiscontinuedProduct],
      customers: [sampleCustomer],
      users: [sampleUserCashier],
    });
    const mockRepo = new MockSaleRepository(mockClient);
    const inventoryService = new InventoryService();
    const service = new SaleService(mockClient as any, mockRepo, inventoryService);

    let errorCaught: any = null;
    try {
      await service.createSale(
        {
          items: [{ productId: sampleDiscontinuedProduct.id, quantity: 1 }],
        },
        sampleUserCashier.id
      );
    } catch (err: any) {
      errorCaught = err;
    }

    assert(
      errorCaught &&
        errorCaught.statusCode === 400 &&
        errorCaught.message.includes('Cannot sell discontinued product'),
      '9. Safety: Blocks checkout of discontinued products'
    );
  }

  console.log('\n--- 3. Successful Sale Checkout (10-Step Workflow) ---');

  // Test 10: Successful sale creation, financials, stock deduction, and inventory audit
  {
    const mockClient = new MockTransactionalPrismaClient({
      products: [sampleProduct1, sampleProduct2],
      customers: [sampleCustomer],
      users: [sampleUserCashier],
    });
    const mockRepo = new MockSaleRepository(mockClient);
    const inventoryService = new InventoryService();
    const service = new SaleService(mockClient as any, mockRepo, inventoryService);

    // Cart:
    // 2 x Mouse @ $45.00 = $90.00 (unitCost: $15.00)
    // 1 x Keyboard @ $99.00 = $99.00 (unitCost: $40.00)
    // Subtotal = $189.00
    // Discount = $9.00
    // Tax = $14.40
    // Total = $189.00 - $9.00 + $14.40 = $194.40
    const saleResult = await service.createSale(
      {
        customerId: sampleCustomer.id,
        items: [
          { productId: sampleProduct1.id, quantity: 2 },
          { productId: sampleProduct2.id, quantity: 1 },
        ],
        discountAmount: 9.0,
        taxAmount: 14.4,
        paymentMethod: PaymentMethod.CARD,
        transactionRef: 'AUTH-CARD-7788',
        notes: 'Corporate express checkout',
      },
      sampleUserCashier.id
    );

    // 1. Check Financials
    assert(
      Number(saleResult.subtotal) === 189.0 &&
        Number(saleResult.discountAmount) === 9.0 &&
        Number(saleResult.taxAmount) === 14.4 &&
        Number(saleResult.totalAmount) === 194.4 &&
        saleResult.status === SaleStatus.COMPLETED &&
        saleResult.invoiceNumber.startsWith('INV-'),
      '10. Financial Calculations: Correctly computes subtotal, discount, tax, total, and invoice number'
    );

    // 2. Check Unit Cost Stored in SaleItem
    const mouseItem = saleResult.items.find((it) => it.productId === sampleProduct1.id);
    const keyboardItem = saleResult.items.find((it) => it.productId === sampleProduct2.id);

    assert(
      Boolean(
        mouseItem &&
          Number(mouseItem.unitPrice) === 45.0 &&
          Number(mouseItem.unitCost) === 15.0 &&
          Number(mouseItem.subtotal) === 90.0 &&
          keyboardItem &&
          Number(keyboardItem.unitPrice) === 99.0 &&
          Number(keyboardItem.unitCost) === 40.0 &&
          Number(keyboardItem.subtotal) === 99.0
      ),
      '11. SaleItem Unit Cost: Stores unitCost in SaleItem for accurate historical profit analytics'
    );

    // 3. Check Stock Reduction
    const prod1After = mockClient.products.find((p) => p.id === sampleProduct1.id);
    const prod2After = mockClient.products.find((p) => p.id === sampleProduct2.id);

    assert(
      prod1After.currentStock === 18 &&
        prod2After.currentStock === 7,
      '12. Stock Deduction: Product currentStock accurately reduced by sold quantities'
    );

    // 4. Check Inventory Transactions of type SALE
    const saleTxns = mockClient.inventoryTransactions.filter((t) => t.referenceId === saleResult.id);
    assert(
      saleTxns.length === 2 &&
        saleTxns[0].type === TransactionType.SALE &&
        saleTxns[0].quantity === -2 &&
        saleTxns[0].stockBefore === 20 &&
        saleTxns[0].stockAfter === 18 &&
        saleTxns[1].type === TransactionType.SALE &&
        saleTxns[1].quantity === -1 &&
        saleTxns[1].stockBefore === 8 &&
        saleTxns[1].stockAfter === 7,
      '13. Inventory Audit Log: Creates audit transaction with type SALE, negative delta, and before/after stock'
    );

    // 5. Check Payment Record
    const payment = mockClient.payments.find((p) => p.saleId === saleResult.id);
    assert(
      Boolean(
        payment &&
          payment.paymentMethod === PaymentMethod.CARD &&
          Number(payment.amount) === 194.4 &&
          payment.transactionRef === 'AUTH-CARD-7788'
      ),
      '14. Payment Creation: Payment record created with specified method, tendered amount, and reference'
    );

    // 6. Check Customer Total Spent Update
    const customerAfter = mockClient.customers.find((c) => c.id === sampleCustomer.id);
    assert(
      customerAfter.totalSpent === 194.4,
      '15. Customer Profile: Customer totalSpent incremented atomically by sale total'
    );
  }

  console.log('\n--- 4. Walk-In Customer Support ---');

  // Test 16: Checkout for Walk-in customer
  {
    const mockClient = new MockTransactionalPrismaClient({
      products: [sampleProduct1],
      customers: [sampleWalkInCustomer],
      users: [sampleUserCashier],
    });
    const mockRepo = new MockSaleRepository(mockClient);
    const inventoryService = new InventoryService();
    const service = new SaleService(mockClient as any, mockRepo, inventoryService);

    const saleResult = await service.createSale(
      {
        customerId: 'walk-in',
        items: [{ productId: sampleProduct1.id, quantity: 1 }],
        paymentMethod: PaymentMethod.CASH,
      },
      sampleUserCashier.id
    );

    assert(
      saleResult.customerId === sampleWalkInCustomer.id,
      '16. Walk-In Customer: Resolves and attaches default Walk-in customer record'
    );
  }

  console.log('\n--- 5. Database Transaction Atomicity & Rollback ---');

  // Test 17: Atomicity Rollback on failure
  {
    const mockClient = new MockTransactionalPrismaClient({
      products: [sampleProduct1],
      customers: [sampleCustomer],
      users: [sampleUserCashier],
    });
    mockClient.failOnPayment = true; // Simulate gateway failure
    const mockRepo = new MockSaleRepository(mockClient);
    const inventoryService = new InventoryService();
    const service = new SaleService(mockClient as any, mockRepo, inventoryService);

    let failed = false;
    try {
      await service.createSale(
        {
          customerId: sampleCustomer.id,
          items: [{ productId: sampleProduct1.id, quantity: 2 }],
          paymentMethod: PaymentMethod.CARD,
        },
        sampleUserCashier.id
      );
    } catch {
      failed = true;
    }

    const prodAfter = mockClient.products.find((p) => p.id === sampleProduct1.id);
    assert(
      failed &&
        prodAfter.currentStock === 20 &&
        mockClient.sales.length === 0 &&
        mockClient.inventoryTransactions.length === 0 &&
        mockClient.payments.length === 0,
      '17. ACID Atomicity: If payment or any step fails, entire Prisma transaction rolls back (zero stock changes)'
    );
  }

  console.log('\n--- 6. Role-Based Access Control (RBAC) ---');

  // Test 18: Cashier, Manager, and Admin are all authorized for POS operations
  {
    const cashierReq = {
      user: { id: sampleUserCashier.id, role: UserRole.CASHIER },
    } as unknown as Request;
    let cashierAllowed = false;
    const rbacMiddleware = authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER);
    rbacMiddleware(cashierReq, {} as Response, ((err?: any) => {
      if (!err) cashierAllowed = true;
    }) as NextFunction);

    assert(cashierAllowed, '18. RBAC: Cashier role is authorized to operate POS sales checkout');

    const adminReq = {
      user: { id: sampleUserAdmin.id, role: UserRole.ADMIN },
    } as unknown as Request;
    let adminAllowed = false;
    rbacMiddleware(adminReq, {} as Response, ((err?: any) => {
      if (!err) adminAllowed = true;
    }) as NextFunction);

    assert(adminAllowed, '19. RBAC: Admin role is authorized to operate POS sales checkout');
  }

  console.log(`\n📊 Sales Test Suite Results: ${passedTests}/${totalTests} Passed.\n`);

  if (passedTests !== totalTests) {
    throw new Error('Sales Test Suite failed');
  }
}

if (require.main === module) {
  runSaleTests()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
