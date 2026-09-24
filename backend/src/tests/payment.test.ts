import { UserRole, PaymentMethod, SaleStatus, Prisma } from '@prisma/client';
import { PaymentService } from '../services/payment.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { createPaymentSchema, paymentQuerySchema } from '../validators/payment.validator';
import { authorize } from '../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';

// =========================================================
// Mock In-Memory Transactional Prisma Client for Payments
// =========================================================
class MockTransactionalPrismaClient {
  public customers: any[] = [];
  public users: any[] = [];
  public sales: any[] = [];
  public payments: any[] = [];

  constructor(initialData: {
    customers?: any[];
    users?: any[];
    sales?: any[];
    payments?: any[];
  }) {
    this.customers = JSON.parse(JSON.stringify(initialData.customers || []));
    this.users = JSON.parse(JSON.stringify(initialData.users || []));
    this.sales = JSON.parse(JSON.stringify(initialData.sales || []));
    this.payments = JSON.parse(JSON.stringify(initialData.payments || []));
  }

  private createSnapshot() {
    return {
      customers: JSON.parse(JSON.stringify(this.customers)),
      sales: JSON.parse(JSON.stringify(this.sales)),
      payments: JSON.parse(JSON.stringify(this.payments)),
    };
  }

  private restoreSnapshot(snapshot: any) {
    this.customers = snapshot.customers;
    this.sales = snapshot.sales;
    this.payments = snapshot.payments;
  }

  public async $transaction(fn: (tx: any) => Promise<any>, _options?: any): Promise<any> {
    const snapshot = this.createSnapshot();

    const txContext: any = {
      customer: {
        findUnique: async (args: any) => {
          const c = this.customers.find((cust) => cust.id === args.where.id);
          return c ? JSON.parse(JSON.stringify(c)) : null;
        },
        update: async (args: any) => {
          const idx = this.customers.findIndex((cust) => cust.id === args.where.id);
          if (idx === -1) throw new Error('Customer not found in update');
          const inc = args.data.totalSpent?.increment ? Number(args.data.totalSpent.increment) : 0;
          this.customers[idx].totalSpent = Number(((this.customers[idx].totalSpent || 0) + inc).toFixed(2));
          return JSON.parse(JSON.stringify(this.customers[idx]));
        },
      },
      sale: {
        findUnique: async (args: any) => {
          const s = this.sales.find((sale) => sale.id === args.where.id);
          if (!s) return null;
          const customer = this.customers.find((c) => c.id === s.customerId) || null;
          const user = this.users.find((u) => u.id === s.userId) || {
            id: s.userId,
            name: 'Cashier',
            email: 'cashier@test.com',
            role: 'CASHIER',
          };
          const payments = this.payments.filter((p) => p.saleId === s.id);
          return {
            ...s,
            customer,
            user,
            payments,
          };
        },
      },
      payment: {
        create: async (args: any) => {
          const paymentObj = {
            id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            ...args.data,
            paidAt: args.data.paidAt ? new Date(args.data.paidAt) : new Date(),
          };
          this.payments.push(paymentObj);
          return JSON.parse(JSON.stringify(paymentObj));
        },
        findMany: async (args: any) => {
          let list = this.payments.slice();
          if (args?.where?.saleId) {
            list = list.filter((p) => p.saleId === args.where.saleId);
          }
          return list.map((p) => JSON.parse(JSON.stringify(p)));
        },
        count: async (_args?: any) => {
          return this.payments.length;
        },
        aggregate: async (args: any) => {
          let list = this.payments.slice();
          if (args?.where?.paymentMethod) {
            list = list.filter((p) => p.paymentMethod === args.where.paymentMethod);
          }
          const sum = list.reduce((acc, p) => acc + Number(p.amount), 0);
          return {
            _sum: {
              amount: sum,
            },
          };
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
// Mock Payment Repository
// =========================================================
class MockPaymentRepository extends PaymentRepository {
  private mockClient: MockTransactionalPrismaClient;

  constructor(mockClient: MockTransactionalPrismaClient) {
    super();
    this.mockClient = mockClient;
  }

  public async create(data: any, tx?: any): Promise<any> {
    if (tx?.payment?.create) {
      return tx.payment.create({ data });
    }
    const paymentObj = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...data,
      paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
    };
    this.mockClient.payments.push(paymentObj);
    return paymentObj;
  }

  public async findById(id: string, _tx?: any): Promise<any> {
    const payment = this.mockClient.payments.find((p) => p.id === id);
    if (!payment) return null;
    const sale = this.mockClient.sales.find((s) => s.id === payment.saleId);
    const customer = sale ? this.mockClient.customers.find((c) => c.id === sale.customerId) || null : null;
    const user = sale ? this.mockClient.users.find((u) => u.id === sale.userId) || {
      id: 'u1111111-1111-4111-8111-111111111111',
      name: 'Cashier User',
      email: 'cashier@smartstock.com',
      role: 'CASHIER',
    } : null;

    const salePayments = this.mockClient.payments.filter((p) => p.saleId === sale?.id);

    return {
      ...payment,
      sale: sale
        ? {
            id: sale.id,
            invoiceNumber: sale.invoiceNumber,
            totalAmount: new Prisma.Decimal(sale.totalAmount),
            status: sale.status,
            payments: salePayments.map((p) => ({ amount: new Prisma.Decimal(p.amount) })),
            customer,
            user,
          }
        : null,
    };
  }

  public async findBySaleId(saleId: string, _tx?: any): Promise<any[]> {
    return this.mockClient.payments
      .filter((p) => p.saleId === saleId)
      .map((p) => JSON.parse(JSON.stringify(p)));
  }

  public async findMany(options: any = {}): Promise<any[]> {
    let list = this.mockClient.payments.slice();

    if (options.where?.saleId) {
      list = list.filter((p) => p.saleId === options.where.saleId);
    }
    if (options.where?.paymentMethod) {
      list = list.filter((p) => p.paymentMethod === options.where.paymentMethod);
    }
    if (options.where?.OR) {
      // search filter
      const term = options.where.OR[0].transactionRef.contains.toLowerCase();
      list = list.filter((p) => {
        const sale = this.mockClient.sales.find((s) => s.id === p.saleId);
        const customer = sale ? this.mockClient.customers.find((c) => c.id === sale.customerId) : null;
        return (
          (p.transactionRef && p.transactionRef.toLowerCase().includes(term)) ||
          (sale && sale.invoiceNumber.toLowerCase().includes(term)) ||
          (customer && customer.name.toLowerCase().includes(term))
        );
      });
    }

    return list.map((p) => {
      const sale = this.mockClient.sales.find((s) => s.id === p.saleId);
      const customer = sale ? this.mockClient.customers.find((c) => c.id === sale.customerId) || null : null;
      const user = sale ? this.mockClient.users.find((u) => u.id === sale.userId) || {
        id: 'u1111111-1111-4111-8111-111111111111',
        name: 'Cashier User',
        email: 'cashier@smartstock.com',
        role: 'CASHIER',
      } : null;
      const salePayments = this.mockClient.payments.filter((item) => item.saleId === sale?.id);

      return {
        ...p,
        sale: {
          id: sale?.id || '',
          invoiceNumber: sale?.invoiceNumber || '',
          totalAmount: new Prisma.Decimal(sale?.totalAmount || 0),
          status: sale?.status || 'COMPLETED',
          payments: salePayments.map((item) => ({ amount: new Prisma.Decimal(item.amount) })),
          customer,
          user,
        },
      };
    });
  }

  public async count(where?: any): Promise<number> {
    const list = await this.findMany({ where });
    return list.length;
  }

  public async getSummary(where?: any): Promise<any> {
    const list = await this.findMany({ where });
    const totalPayments = list.length;
    let totalAmount = 0;
    let cashTotal = 0;
    let cardTotal = 0;
    let bankTransferTotal = 0;
    let onlineTotal = 0;

    for (const p of list) {
      const amt = Number(p.amount);
      totalAmount += amt;
      if (p.paymentMethod === PaymentMethod.CASH) cashTotal += amt;
      else if (p.paymentMethod === PaymentMethod.CARD) cardTotal += amt;
      else if (p.paymentMethod === PaymentMethod.BANK_TRANSFER) bankTransferTotal += amt;
      else if (p.paymentMethod === PaymentMethod.ONLINE) onlineTotal += amt;
    }

    return {
      totalPayments,
      totalAmount: Number(totalAmount.toFixed(2)),
      cashTotal: Number(cashTotal.toFixed(2)),
      cardTotal: Number(cardTotal.toFixed(2)),
      bankTransferTotal: Number(bankTransferTotal.toFixed(2)),
      onlineTotal: Number(onlineTotal.toFixed(2)),
    };
  }
}

// =========================================================
// Test Suite Runner
// =========================================================
async function runPaymentTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Payments Test Suite');
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

  // Sample Entities
  const sampleCustomer = {
    id: 'c1111111-1111-4111-8111-111111111111',
    code: 'CUST-0001',
    name: 'Eleanor Vance',
    phone: '+1 555-0199',
    email: 'eleanor@example.com',
    totalSpent: 0,
  };

  const sampleUserCashier = {
    id: 'u1111111-1111-4111-8111-111111111111',
    name: 'James Wilson',
    email: 'cashier@smartstock.com',
    role: UserRole.CASHIER,
  };

  const sampleSales = [
    {
      id: 's1111111-1111-4111-8111-111111111111',
      invoiceNumber: 'INV-2026-00001',
      customerId: sampleCustomer.id,
      userId: sampleUserCashier.id,
      subtotal: 100.0,
      discountAmount: 0.0,
      taxAmount: 10.0,
      totalAmount: 110.0,
      status: SaleStatus.COMPLETED,
    },
    {
      id: 's2222222-2222-4222-8222-222222222222',
      invoiceNumber: 'INV-2026-00002',
      customerId: null,
      userId: sampleUserCashier.id,
      subtotal: 50.0,
      discountAmount: 0.0,
      taxAmount: 0.0,
      totalAmount: 50.0,
      status: SaleStatus.COMPLETED,
    },
    {
      id: 's3333333-3333-4333-8333-333333333333',
      invoiceNumber: 'INV-2026-00003',
      customerId: sampleCustomer.id,
      userId: sampleUserCashier.id,
      subtotal: 80.0,
      discountAmount: 0.0,
      taxAmount: 0.0,
      totalAmount: 80.0,
      status: SaleStatus.CANCELLED,
    },
    {
      id: 's4444444-4444-4444-8444-444444444444',
      invoiceNumber: 'INV-2026-00004',
      customerId: sampleCustomer.id,
      userId: sampleUserCashier.id,
      subtotal: 75.0,
      discountAmount: 0.0,
      taxAmount: 0.0,
      totalAmount: 75.0,
      status: SaleStatus.REFUNDED,
    },
  ];

  function createTestEnvironment(initialPayments: any[] = []) {
    const mockPrisma = new MockTransactionalPrismaClient({
      customers: [sampleCustomer],
      users: [sampleUserCashier],
      sales: sampleSales,
      payments: initialPayments,
    });
    const mockRepo = new MockPaymentRepository(mockPrisma);
    const service = new PaymentService(mockPrisma as any, mockRepo);
    return { mockPrisma, mockRepo, service };
  }

  // =========================================================
  // SECTION 1: Validation & Schema Constraints
  // =========================================================
  console.log('--- 1. Validation & Schema Constraints ---');

  // Test 1: Amount must be > 0
  try {
    createPaymentSchema.parse({
      saleId: sampleSales[0].id,
      amount: 0,
      paymentMethod: PaymentMethod.CASH,
    });
    assert(false, '1. Validation: Rejects payment with amount = 0');
  } catch {
    assert(true, '1. Validation: Rejects payment with amount = 0');
  }

  // Test 2: Amount cannot be negative
  try {
    createPaymentSchema.parse({
      saleId: sampleSales[0].id,
      amount: -25.5,
      paymentMethod: PaymentMethod.CARD,
    });
    assert(false, '2. Validation: Rejects payment with negative amount');
  } catch {
    assert(true, '2. Validation: Rejects payment with negative amount');
  }

  // Test 3: Sale ID is required
  try {
    createPaymentSchema.parse({
      saleId: '',
      amount: 50.0,
      paymentMethod: PaymentMethod.CASH,
    });
    assert(false, '3. Validation: Rejects payment with empty saleId');
  } catch {
    assert(true, '3. Validation: Rejects payment with empty saleId');
  }

  // Test 4: Rejects invalid payment method
  try {
    createPaymentSchema.parse({
      saleId: sampleSales[0].id,
      amount: 50.0,
      paymentMethod: 'CRYPTO' as any,
    });
    assert(false, '4. Validation: Rejects unsupported payment method');
  } catch {
    assert(true, '4. Validation: Rejects unsupported payment method');
  }

  // Test 5: Accepts all supported payment methods
  const methods = [
    PaymentMethod.CASH,
    PaymentMethod.CARD,
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.ONLINE,
  ];
  let methodsValid = true;
  for (const m of methods) {
    const res = createPaymentSchema.safeParse({
      saleId: sampleSales[0].id,
      amount: 20,
      paymentMethod: m,
      transactionRef: `REF-${m}`,
    });
    if (!res.success) methodsValid = false;
  }
  assert(methodsValid, '5. Validation: Accepts all 4 payment methods (CASH, CARD, BANK_TRANSFER, ONLINE)');

  // Test 6: Query validator defaults
  const queryResult = paymentQuerySchema.parse({});
  assert(
    queryResult.page === 1 &&
      queryResult.limit === 10 &&
      queryResult.paymentMethod === 'all' &&
      queryResult.sortBy === 'paidAt' &&
      queryResult.sortOrder === 'desc',
    '6. Validation: Query schema applies correct defaults'
  );

  // =========================================================
  // SECTION 2: Sale Association & Status Validation
  // =========================================================
  console.log('\n--- 2. Sale Association & Status Validation ---');

  // Test 7: Non-existent sale throws 404
  {
    const { service } = createTestEnvironment();
    try {
      await service.recordPayment({
        saleId: 'non-existent-sale-id',
        amount: 50,
        paymentMethod: PaymentMethod.CASH,
      });
      assert(false, '7. Association: Rejects payment for non-existent sale ID with 404');
    } catch (err: any) {
      assert(
        Boolean(err.statusCode === 404 && err.message.includes('not found')),
        '7. Association: Rejects payment for non-existent sale ID with 404'
      );
    }
  }

  // Test 8: Cancelled sale throws 400
  {
    const { service } = createTestEnvironment();
    try {
      await service.recordPayment({
        saleId: sampleSales[2].id, // CANCELLED sale
        amount: 40,
        paymentMethod: PaymentMethod.CASH,
      });
      assert(false, '8. Status: Rejects payment on CANCELLED sale');
    } catch (err: any) {
      assert(
        Boolean(err.statusCode === 400 && err.message.includes('cancelled')),
        '8. Status: Rejects payment on CANCELLED sale'
      );
    }
  }

  // Test 9: Refunded sale throws 400
  {
    const { service } = createTestEnvironment();
    try {
      await service.recordPayment({
        saleId: sampleSales[3].id, // REFUNDED sale
        amount: 30,
        paymentMethod: PaymentMethod.CARD,
      });
      assert(false, '9. Status: Rejects payment on REFUNDED sale');
    } catch (err: any) {
      assert(
        Boolean(err.statusCode === 400 && err.message.includes('refunded')),
        '9. Status: Rejects payment on REFUNDED sale'
      );
    }
  }

  // =========================================================
  // SECTION 3: Business Rule & Overpayment Validation
  // =========================================================
  console.log('\n--- 3. Business Rule & Overpayment Validation ---');

  // Test 10: Prevents overpayment exceeding sale total amount
  {
    const { service } = createTestEnvironment();
    try {
      await service.recordPayment({
        saleId: sampleSales[0].id, // total 110
        amount: 150.0, // exceeds 110
        paymentMethod: PaymentMethod.CASH,
      });
      assert(false, '10. Business Rules: Rejects overpayment exceeding sale total');
    } catch (err: any) {
      assert(
        Boolean(err.statusCode === 400 && err.message.includes('exceeds the remaining unpaid balance')),
        '10. Business Rules: Rejects overpayment exceeding sale total'
      );
    }
  }

  // Test 11: Rejects payment when sale is already fully paid
  {
    const initialPay = {
      id: 'pay-001',
      saleId: sampleSales[0].id,
      amount: new Prisma.Decimal(110.0),
      paymentMethod: PaymentMethod.CASH,
      transactionRef: 'INIT-FULL',
      paidAt: new Date(),
    };
    const { service } = createTestEnvironment([initialPay]);
    try {
      await service.recordPayment({
        saleId: sampleSales[0].id,
        amount: 10.0,
        paymentMethod: PaymentMethod.CARD,
      });
      assert(false, '11. Business Rules: Rejects payment on already fully paid sale');
    } catch (err: any) {
      assert(
        Boolean(err.statusCode === 400 && err.message.includes('already fully paid')),
        '11. Business Rules: Rejects payment on already fully paid sale'
      );
    }
  }

  // Test 12: Rejects second payment that exceeds remaining split balance
  {
    const initialPay = {
      id: 'pay-002',
      saleId: sampleSales[0].id,
      amount: new Prisma.Decimal(70.0), // 110 - 70 = 40 remaining
      paymentMethod: PaymentMethod.CASH,
      transactionRef: 'INIT-PARTIAL',
      paidAt: new Date(),
    };
    const { service } = createTestEnvironment([initialPay]);
    try {
      await service.recordPayment({
        saleId: sampleSales[0].id,
        amount: 45.0, // 45 > 40 remaining
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      });
      assert(false, '12. Business Rules: Rejects payment exceeding remaining balance on split payments');
    } catch (err: any) {
      assert(
        Boolean(err.statusCode === 400 && err.message.includes('exceeds the remaining unpaid balance of $40.00')),
        '12. Business Rules: Rejects payment exceeding remaining balance on split payments'
      );
    }
  }

  // =========================================================
  // SECTION 4: Recording Payments & Accurate Calculations
  // =========================================================
  console.log('\n--- 4. Recording Payments & Accurate Calculations ---');

  // Test 13: Full payment sets status to PAID and remaining balance = 0
  {
    const { service, mockPrisma } = createTestEnvironment();
    const result = await service.recordPayment({
      saleId: sampleSales[0].id, // 110.0
      amount: 110.0,
      paymentMethod: PaymentMethod.CARD,
      transactionRef: 'TXN-CARD-110',
    });

    const isPaid =
      result.paymentStatus === 'PAID' &&
      result.totalPaid === 110.0 &&
      result.balanceRemaining === 0 &&
      result.payment.paymentMethod === PaymentMethod.CARD &&
      result.payment.transactionRef === 'TXN-CARD-110';

    assert(Boolean(isPaid), '13. Payment: Full payment correctly calculates PAID status and 0 balance');

    // Customer totalSpent incremented
    const updatedCust = mockPrisma.customers.find((c) => c.id === sampleCustomer.id);
    assert(
      Boolean(updatedCust && updatedCust.totalSpent === 110.0),
      '14. Customer: Customer totalSpent incremented by full payment amount'
    );
  }

  // Test 15: Partial payment sets status to PARTIALLY_PAID
  {
    const { service, mockPrisma } = createTestEnvironment();
    const result = await service.recordPayment({
      saleId: sampleSales[0].id, // 110.0
      amount: 40.0,
      paymentMethod: PaymentMethod.CASH,
      transactionRef: 'CASH-PART-1',
    });

    assert(
      Boolean(
        result.paymentStatus === 'PARTIALLY_PAID' &&
          result.totalPaid === 40.0 &&
          result.balanceRemaining === 70.0
      ),
      '15. Payment: Partial payment calculates PARTIALLY_PAID and correct balance'
    );

    // Second payment to complete sale
    const secondResult = await service.recordPayment({
      saleId: sampleSales[0].id,
      amount: 70.0,
      paymentMethod: PaymentMethod.ONLINE,
      transactionRef: 'ONLINE-PART-2',
    });

    assert(
      Boolean(
        secondResult.paymentStatus === 'PAID' &&
          secondResult.totalPaid === 110.0 &&
          secondResult.balanceRemaining === 0
      ),
      '16. Split Payment: Subsequent payment brings total to full and updates status to PAID'
    );

    const updatedCust = mockPrisma.customers.find((c) => c.id === sampleCustomer.id);
    assert(
      Boolean(updatedCust && updatedCust.totalSpent === 110.0),
      '17. Customer: Customer totalSpent accurately accumulated across multiple split payments'
    );
  }

  // =========================================================
  // SECTION 5: Retrieval, History & Aggregations
  // =========================================================
  console.log('\n--- 5. Retrieval, History & Aggregations ---');

  // Test 18: getPaymentById returns payment with sale details and paymentStatus
  {
    const paymentRecord = {
      id: 'pay-single-01',
      saleId: sampleSales[0].id,
      amount: new Prisma.Decimal(60.0),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      transactionRef: 'BT-REF-99',
      paidAt: new Date('2026-09-24T12:00:00Z'),
    };
    const { service } = createTestEnvironment([paymentRecord]);
    const fetched = await service.getPaymentById('pay-single-01');

    assert(
      Boolean(
        fetched.id === 'pay-single-01' &&
          fetched.paymentMethod === PaymentMethod.BANK_TRANSFER &&
          fetched.transactionRef === 'BT-REF-99' &&
          fetched.paymentStatus === 'PARTIALLY_PAID' &&
          fetched.totalPaid === 60.0 &&
          fetched.balanceRemaining === 50.0 &&
          fetched.sale.invoiceNumber === 'INV-2026-00001'
      ),
      '18. Retrieval: getPaymentById returns formatted payment with sale context and status'
    );
  }

  // Test 19: getPaymentsBySaleId returns all payments for sale
  {
    const pay1 = {
      id: 'pay-sale-1',
      saleId: sampleSales[0].id,
      amount: new Prisma.Decimal(50.0),
      paymentMethod: PaymentMethod.CASH,
      transactionRef: 'REF-1',
      paidAt: new Date('2026-09-24T10:00:00Z'),
    };
    const pay2 = {
      id: 'pay-sale-2',
      saleId: sampleSales[0].id,
      amount: new Prisma.Decimal(60.0),
      paymentMethod: PaymentMethod.CARD,
      transactionRef: 'REF-2',
      paidAt: new Date('2026-09-24T11:00:00Z'),
    };
    const { service } = createTestEnvironment([pay1, pay2]);
    const salePayments = await service.getPaymentsBySaleId(sampleSales[0].id);

    assert(
      Boolean(salePayments.length === 2 && salePayments[0].id === 'pay-sale-1' && salePayments[1].id === 'pay-sale-2'),
      '19. History: getPaymentsBySaleId returns complete payment audit trail for sale'
    );
  }

  // Test 20: listPayments with filtering and summary metrics
  {
    const paymentsList = [
      {
        id: 'p-1',
        saleId: sampleSales[0].id,
        amount: new Prisma.Decimal(30.0),
        paymentMethod: PaymentMethod.CASH,
        transactionRef: 'TX-CASH-1',
        paidAt: new Date(),
      },
      {
        id: 'p-2',
        saleId: sampleSales[0].id,
        amount: new Prisma.Decimal(40.0),
        paymentMethod: PaymentMethod.CARD,
        transactionRef: 'TX-CARD-2',
        paidAt: new Date(),
      },
      {
        id: 'p-3',
        saleId: sampleSales[1].id,
        amount: new Prisma.Decimal(50.0),
        paymentMethod: PaymentMethod.ONLINE,
        transactionRef: 'TX-ONLINE-3',
        paidAt: new Date(),
      },
    ];

    const { service } = createTestEnvironment(paymentsList);

    // List all
    const all = await service.listPayments({});
    assert(
      Boolean(
        all.pagination.totalItems === 3 &&
          all.summary.totalPayments === 3 &&
          all.summary.totalAmount === 120.0 &&
          all.summary.cashTotal === 30.0 &&
          all.summary.cardTotal === 40.0 &&
          all.summary.onlineTotal === 50.0
      ),
      '20. Summary: Aggregates total payments and breakdown by method (Cash, Card, Online)'
    );

    // Filter by payment method CARD
    const cardOnly = await service.listPayments({ paymentMethod: PaymentMethod.CARD });
    assert(
      Boolean(cardOnly.items.length === 1 && cardOnly.items[0].id === 'p-2'),
      '21. Filter: Filters payment records by payment method'
    );

    // Search by transactionRef
    const searched = await service.listPayments({ search: 'ONLINE' });
    assert(
      Boolean(searched.items.length === 1 && searched.items[0].transactionRef === 'TX-ONLINE-3'),
      '22. Search: Searches payments by transaction reference'
    );
  }

  // =========================================================
  // SECTION 6: Role-Based Access Control (RBAC)
  // =========================================================
  console.log('\n--- 6. Role-Based Access Control (RBAC) ---');

  const checkRoleAccess = (role: UserRole, allowedRoles: UserRole[]): boolean => {
    let authorized = false;
    const req = { user: { role } } as unknown as Request;
    const res = {
      status: () => ({ json: () => {} }),
    } as unknown as Response;
    const next: NextFunction = () => {
      authorized = true;
    };
    const middleware = authorize(...allowedRoles);
    middleware(req, res, next);
    return authorized;
  };

  const allowedRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER];

  assert(
    checkRoleAccess(UserRole.CASHIER, allowedRoles),
    '23. RBAC: Cashier role is authorized to record payments'
  );
  assert(
    checkRoleAccess(UserRole.MANAGER, allowedRoles),
    '24. RBAC: Manager role is authorized to record payments'
  );
  assert(
    checkRoleAccess(UserRole.ADMIN, allowedRoles),
    '25. RBAC: Admin role is authorized to record payments'
  );

  console.log(`\n📊 Payments Test Suite Results: ${passedTests}/${totalTests} Passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPaymentTests().catch((err) => {
  console.error('Unhandled error in Payment test suite:', err);
  process.exit(1);
});
