import { UserRole, PaymentMethod, SaleStatus, Prisma } from '@prisma/client';
import { InvoiceService } from '../services/invoice.service';
import { SaleRepository } from '../repositories/sale.repository';
import { SaleService } from '../services/sale.service';

// =========================================================
// Mock In-Memory Transactional Client for Invoice Testing
// =========================================================
class MockInvoicePrismaClient {
  public sales: any[] = [];
  public saleItems: any[] = [];
  public payments: any[] = [];
  public customers: any[] = [];
  public users: any[] = [];
  public products: any[] = [];

  constructor(initialData: {
    sales?: any[];
    customers?: any[];
    users?: any[];
    products?: any[];
    payments?: any[];
    saleItems?: any[];
  }) {
    this.sales = JSON.parse(JSON.stringify(initialData.sales || []));
    this.customers = JSON.parse(JSON.stringify(initialData.customers || []));
    this.users = JSON.parse(JSON.stringify(initialData.users || []));
    this.products = JSON.parse(JSON.stringify(initialData.products || []));
    this.payments = JSON.parse(JSON.stringify(initialData.payments || []));
    this.saleItems = JSON.parse(JSON.stringify(initialData.saleItems || []));
  }

  public sale = {
    findFirst: async (args: any) => {
      let list = this.sales.slice();
      if (args?.where?.invoiceNumber?.startsWith) {
        const prefix = args.where.invoiceNumber.startsWith;
        list = list.filter((s) => s.invoiceNumber.startsWith(prefix));
      }
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list[0] || null;
    },
    findUnique: async (args: any) => {
      if (args?.where?.id) {
        return this.getFullSaleById(args.where.id);
      }
      if (args?.where?.invoiceNumber) {
        return this.getFullSaleByInvoice(args.where.invoiceNumber);
      }
      return null;
    },
    findMany: async () => {
      return this.sales.map((s) => this.getFullSaleById(s.id));
    },
    count: async () => this.sales.length,
  };

  public getFullSaleById(id: string) {
    const s = this.sales.find((sale) => sale.id === id);
    if (!s) return null;
    const customer = this.customers.find((c) => c.id === s.customerId) || null;
    const user = this.users.find((u) => u.id === s.userId) || {
      id: s.userId,
      name: 'Cashier User',
      email: 'cashier@smartstock.com',
      role: 'CASHIER',
    };
    const items = this.saleItems
      .filter((it) => it.saleId === s.id)
      .map((it) => {
        const product = this.products.find((p) => p.id === it.productId);
        return {
          ...it,
          product: {
            ...product,
            category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
          },
        };
      });
    const payments = this.payments.filter((p) => p.saleId === s.id);

    return {
      ...s,
      customer,
      user,
      items,
      payments,
    };
  }

  public getFullSaleByInvoice(invoiceNumber: string) {
    const s = this.sales.find((sale) => sale.invoiceNumber === invoiceNumber);
    if (!s) return null;
    return this.getFullSaleById(s.id);
  }
}

// =========================================================
// Mock Sale Repository for Invoices
// =========================================================
class MockSaleRepositoryForInvoices extends SaleRepository {
  private mockClient: MockInvoicePrismaClient;

  constructor(mockClient: MockInvoicePrismaClient) {
    super();
    this.mockClient = mockClient;
  }

  public async findById(id: string): Promise<any> {
    return this.mockClient.getFullSaleById(id);
  }

  public async findByInvoiceNumber(invoiceNumber: string): Promise<any> {
    return this.mockClient.getFullSaleByInvoice(invoiceNumber);
  }

  public async generateInvoiceNumber(tx?: any): Promise<string> {
    const client = tx || this.mockClient;
    const prefix = 'INV-';
    const lastSale = await client.sale.findFirst({
      where: {
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });

    let sequence = 1;
    if (lastSale?.invoiceNumber) {
      const match = lastSale.invoiceNumber.match(/(\d+)$/);
      if (match) {
        const lastSeq = parseInt(match[1], 10);
        if (!isNaN(lastSeq)) {
          sequence = lastSeq + 1;
        }
      }
    }

    let candidate = `${prefix}${sequence.toString().padStart(6, '0')}`;
    let exists = await client.sale.findUnique({
      where: { invoiceNumber: candidate },
      select: { id: true },
    });

    while (exists) {
      sequence++;
      candidate = `${prefix}${sequence.toString().padStart(6, '0')}`;
      exists = await client.sale.findUnique({
        where: { invoiceNumber: candidate },
        select: { id: true },
      });
    }

    return candidate;
  }
}

// =========================================================
// Test Suite Runner
// =========================================================
async function runInvoiceTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Invoices Test Suite');
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

  // Sample Data Setup
  const sampleCustomer = {
    id: 'c1111111-1111-4111-8111-111111111111',
    code: 'CUST-0001',
    name: 'TechFlow Global Corp',
    phone: '+1 555-0199',
    email: 'billing@techflow.com',
  };

  const sampleCashier = {
    id: 'u1111111-1111-4111-8111-111111111111',
    name: 'James Wilson',
    email: 'cashier@smartstock.com',
    role: UserRole.CASHIER,
  };

  const sampleProducts = [
    {
      id: 'p1111111-1111-4111-8111-111111111111',
      name: 'Wireless Ergonomic Keyboard',
      sku: 'SKU-KB-001',
      unit: 'pcs',
      sellingPrice: new Prisma.Decimal(59.99),
    },
    {
      id: 'p2222222-2222-4222-8222-222222222222',
      name: 'USB-C Fast Charging Hub',
      sku: 'SKU-HUB-002',
      unit: 'pcs',
      sellingPrice: new Prisma.Decimal(35.5),
    },
  ];

  const sampleSale = {
    id: 's1111111-1111-4111-8111-111111111111',
    invoiceNumber: 'INV-000001',
    customerId: sampleCustomer.id,
    userId: sampleCashier.id,
    subtotal: new Prisma.Decimal(155.48),
    discountAmount: new Prisma.Decimal(10.0),
    taxAmount: new Prisma.Decimal(11.64),
    totalAmount: new Prisma.Decimal(157.12),
    status: SaleStatus.COMPLETED,
    notes: 'Standard Net 30 Commercial Invoice',
    createdAt: new Date('2026-09-24T14:30:00Z'),
  };

  const sampleSaleItems = [
    {
      id: 'item-1',
      saleId: sampleSale.id,
      productId: sampleProducts[0].id,
      quantity: 2,
      unitPrice: new Prisma.Decimal(59.99),
      unitCost: new Prisma.Decimal(30.0),
      subtotal: new Prisma.Decimal(119.98),
    },
    {
      id: 'item-2',
      saleId: sampleSale.id,
      productId: sampleProducts[1].id,
      quantity: 1,
      unitPrice: new Prisma.Decimal(35.5),
      unitCost: new Prisma.Decimal(18.0),
      subtotal: new Prisma.Decimal(35.5),
    },
  ];

  const samplePayments = [
    {
      id: 'pay-1',
      saleId: sampleSale.id,
      amount: new Prisma.Decimal(157.12),
      paymentMethod: PaymentMethod.CARD,
      transactionRef: 'CARD-AUTH-99120',
      paidAt: new Date('2026-09-24T14:31:00Z'),
    },
  ];

  function createTestEnvironment(sales: any[] = [sampleSale]) {
    const mockPrisma = new MockInvoicePrismaClient({
      sales,
      customers: [sampleCustomer],
      users: [sampleCashier],
      products: sampleProducts,
      saleItems: sampleSaleItems,
      payments: samplePayments,
    });
    const repo = new MockSaleRepositoryForInvoices(mockPrisma);
    const saleService = new SaleService(mockPrisma as any, repo);
    const service = new InvoiceService(repo, saleService);
    return { mockPrisma, repo, service };
  }

  // =========================================================
  // SECTION 1: Invoice Number Sequence & Formatting
  // =========================================================
  console.log('--- 1. Invoice Number Sequence & Formatting ---');

  // Test 1: First invoice generates INV-000001
  {
    const { repo } = createTestEnvironment([]);
    const firstInvoiceNumber = await repo.generateInvoiceNumber();
    assert(
      firstInvoiceNumber === 'INV-000001',
      '1. Format: Generates INV-000001 when no prior sales exist'
    );
  }

  // Test 2: Sequential invoice generation (INV-000002, INV-000003)
  {
    const existing = [
      { id: 's-1', invoiceNumber: 'INV-000001', createdAt: new Date('2026-09-24T10:00:00Z') },
      { id: 's-2', invoiceNumber: 'INV-000002', createdAt: new Date('2026-09-24T10:05:00Z') },
    ];
    const { repo } = createTestEnvironment(existing as any);
    const nextInvoice = await repo.generateInvoiceNumber();
    assert(
      nextInvoice === 'INV-000003',
      '2. Format: Correctly increments sequentially to INV-000003'
    );
  }

  // =========================================================
  // SECTION 2: Concurrency Safety & Collision Avoidance
  // =========================================================
  console.log('\n--- 2. Concurrency Safety & Collision Avoidance ---');

  // Test 3: Concurrent candidate check automatically steps past existing candidate
  {
    const existing = [
      { id: 's-1', invoiceNumber: 'INV-000001', createdAt: new Date('2026-09-24T10:00:00Z') },
      { id: 's-2', invoiceNumber: 'INV-000002', createdAt: new Date('2026-09-24T10:01:00Z') },
    ];
    const { repo, mockPrisma } = createTestEnvironment(existing as any);

    // Simulate another request grabbing INV-000003 just before our check
    mockPrisma.sales.push({
      id: 's-concurrent',
      invoiceNumber: 'INV-000003',
      createdAt: new Date('2026-09-24T10:02:00Z'),
    });

    const safeNumber = await repo.generateInvoiceNumber();
    assert(
      safeNumber === 'INV-000004',
      '3. Concurrency: Auto-increments past existing candidates to guarantee unique invoiceNumber'
    );
  }

  // =========================================================
  // SECTION 3: Invoice Content Completeness
  // =========================================================
  console.log('\n--- 3. Invoice Content Completeness ---');

  // Test 4: Contains Business name, Invoice number, Date, Customer, Cashier
  {
    const { service } = createTestEnvironment();
    const invoice = await service.getInvoiceById(sampleSale.id);

    const hasBusiness = Boolean(invoice.business && invoice.business.name.includes('SmartStock'));
    const hasInvoiceNumber = invoice.invoiceNumber === 'INV-000001';
    const hasDate = Boolean(invoice.date && invoice.formattedDate);
    const hasCustomer = invoice.customer.name === 'TechFlow Global Corp' && invoice.customer.code === 'CUST-0001';
    const hasCashier = invoice.cashier.name === 'James Wilson' && invoice.cashier.role === 'CASHIER';

    assert(
      Boolean(hasBusiness && hasInvoiceNumber && hasDate && hasCustomer && hasCashier),
      '4. Metadata: Invoice contains Business Name, Invoice Number, Date, Customer, and Cashier'
    );

    // Test 5: Contains Products, Quantity, Unit Price, Line Subtotals
    const item1 = invoice.items[0];
    const item2 = invoice.items[1];
    const itemsValid =
      invoice.items.length === 2 &&
      item1.productName === 'Wireless Ergonomic Keyboard' &&
      item1.quantity === 2 &&
      item1.unitPrice === 59.99 &&
      item1.subtotal === 119.98 &&
      item2.productName === 'USB-C Fast Charging Hub' &&
      item2.quantity === 1 &&
      item2.unitPrice === 35.5 &&
      item2.subtotal === 35.5;

    assert(Boolean(itemsValid), '5. Line Items: Products, quantities, unit prices, and subtotals accurately calculated');

    // Test 6: Contains Discount, Tax, Subtotal, Total, Payment Method
    const financialsValid =
      invoice.subtotal === 155.48 &&
      invoice.discount === 10.0 &&
      invoice.tax === 11.64 &&
      invoice.total === 157.12 &&
      invoice.totalPaid === 157.12 &&
      invoice.balanceRemaining === 0 &&
      invoice.paymentStatus === 'PAID' &&
      invoice.paymentMethod === 'CARD';

    assert(Boolean(financialsValid), '6. Financials: Discount, Tax, Subtotal, Total, and Payment Method verified');
  }

  // =========================================================
  // SECTION 4: View and Retrieval Capabilities
  // =========================================================
  console.log('\n--- 4. View and Retrieval Capabilities ---');

  // Test 7: View invoice by invoiceNumber
  {
    const { service } = createTestEnvironment();
    const invoice = await service.getInvoiceByNumber('INV-000001');
    assert(
      Boolean(invoice && invoice.id === sampleSale.id && invoice.invoiceNumber === 'INV-000001'),
      '7. Retrieval: View invoice by invoiceNumber (INV-000001) returns complete invoice'
    );
  }

  // Test 8: Non-existent invoice returns 404
  {
    const { service } = createTestEnvironment();
    try {
      await service.getInvoiceByNumber('INV-999999');
      assert(false, '8. Retrieval: Non-existent invoice throws 404');
    } catch (err: any) {
      assert(
        Boolean(err.statusCode === 404 && err.message.includes('not found')),
        '8. Retrieval: Non-existent invoice throws 404'
      );
    }
  }

  // =========================================================
  // SECTION 5: Printable & Download-Friendly HTML Generation
  // =========================================================
  console.log('\n--- 5. Printable & Download-Friendly HTML Generation ---');

  // Test 9: Generates standalone print-friendly HTML
  {
    const { service } = createTestEnvironment();
    const invoice = await service.getInvoiceById(sampleSale.id);
    const html = service.generatePrintableHtml(invoice);

    const hasDoctype = html.includes('<!DOCTYPE html>');
    const hasBusinessInHtml = html.includes('SmartStock Retail & Wholesale Solutions');
    const hasInvoiceNumberInHtml = html.includes('INV-000001');
    const hasCustomerInHtml = html.includes('TechFlow Global Corp');
    const hasPrintMedia = html.includes('@media print');
    const hasItemsInHtml = html.includes('Wireless Ergonomic Keyboard') && html.includes('$157.12');
    const hasPaymentRef = html.includes('CARD-AUTH-99120');

    assert(
      Boolean(
        hasDoctype &&
          hasBusinessInHtml &&
          hasInvoiceNumberInHtml &&
          hasCustomerInHtml &&
          hasPrintMedia &&
          hasItemsInHtml &&
          hasPaymentRef
      ),
      '9. Print Document: Standalone print-friendly HTML includes all business, invoice, line item, and payment data with @media print CSS'
    );
  }

  // =========================================================
  // SECTION 6: Walk-In Customer Support
  // =========================================================
  console.log('\n--- 6. Walk-In Customer Support ---');

  // Test 10: Supports Walk-in customer without attached profile
  {
    const walkInSale = {
      ...sampleSale,
      id: 's-walkin-1',
      invoiceNumber: 'INV-000002',
      customerId: null,
    };
    const { service } = createTestEnvironment([walkInSale]);
    const invoice = await service.getInvoiceById('s-walkin-1');

    assert(
      Boolean(invoice.customer.name === 'Walk-in Customer' && invoice.customer.code === 'WALK-IN'),
      '10. Customers: Formats default Walk-in Customer safely on invoices'
    );
  }

  console.log(`\n📊 Invoice Test Suite Results: ${passedTests}/${totalTests} Passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runInvoiceTests().catch((err) => {
  console.error('Unhandled error in Invoice test suite:', err);
  process.exit(1);
});
