import { UserRole } from '@prisma/client';
import { CustomerService } from '../services/customer.service';
import { CustomerRepository, WALK_IN_CUSTOMER_CODE } from '../repositories/customer.repository';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
} from '../validators/customer.validator';
import { authorize } from '../middleware/auth.middleware';
import { ApiError } from '../utils/apiError';
import { Request, Response, NextFunction } from 'express';

// In-Memory Mock Repository for Isolated Unit & Integration Testing
class MockCustomerRepository extends CustomerRepository {
  private customers: any[] = [];
  private sales: any[] = [];

  constructor(initialCustomers: any[] = [], initialSales: any[] = []) {
    super();
    this.customers = JSON.parse(JSON.stringify(initialCustomers));
    this.sales = JSON.parse(JSON.stringify(initialSales));
  }

  public async findById(id: string, includeSales: boolean = false): Promise<any> {
    const cust = this.customers.find((c) => c.id === id);
    if (!cust) return null;

    const salesList = this.sales.filter((s) => s.customerId === id);
    const result = {
      ...cust,
      _count: { sales: salesList.length },
    };

    if (includeSales) {
      result.sales = salesList;
    }
    return JSON.parse(JSON.stringify(result));
  }

  public async findByCode(code: string): Promise<any> {
    const cust = this.customers.find((c) => c.code.toUpperCase() === code.toUpperCase());
    return cust ? JSON.parse(JSON.stringify(cust)) : null;
  }

  public async findByName(name: string): Promise<any> {
    const cust = this.customers.find((c) => c.name.toLowerCase() === name.toLowerCase());
    return cust ? JSON.parse(JSON.stringify(cust)) : null;
  }

  public async findByPhone(phone: string): Promise<any> {
    const cust = this.customers.find((c) => c.phone && c.phone === phone);
    return cust ? JSON.parse(JSON.stringify(cust)) : null;
  }

  public async findMany(options: any = {}): Promise<any[]> {
    let result = [...this.customers];

    if (options.where?.OR) {
      const term = options.where.OR[0]?.name?.contains?.toLowerCase() || '';
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.code.toLowerCase().includes(term) ||
          (c.phone && c.phone.toLowerCase().includes(term)) ||
          (c.email && c.email.toLowerCase().includes(term))
      );
    }

    const resWithCounts = result.map((c) => {
      const salesCount = this.sales.filter((s) => s.customerId === c.id).length;
      return {
        ...c,
        _count: { sales: salesCount },
      };
    });

    const skip = options.skip || 0;
    const take = options.take !== undefined ? options.take : resWithCounts.length;
    return resWithCounts.slice(skip, skip + take);
  }

  public async count(_where: any = {}): Promise<number> {
    return this.customers.length;
  }

  public async create(data: any): Promise<any> {
    const newCustomer = {
      id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      code: data.code,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      creditLimit: Number(data.creditLimit) || 0,
      totalSpent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { sales: 0 },
    };
    this.customers.push(newCustomer);
    return JSON.parse(JSON.stringify(newCustomer));
  }

  public async update(id: string, data: any): Promise<any> {
    const index = this.customers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Not found');

    const updated = {
      ...this.customers[index],
      ...data,
      creditLimit: data.creditLimit !== undefined ? Number(data.creditLimit) : this.customers[index].creditLimit,
      updatedAt: new Date(),
    };
    this.customers[index] = updated;

    const salesCount = this.sales.filter((s) => s.customerId === id).length;
    return JSON.parse(JSON.stringify({ ...updated, _count: { sales: salesCount } }));
  }

  public async delete(id: string): Promise<any> {
    const index = this.customers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Not found');
    const removed = this.customers.splice(index, 1)[0];
    return JSON.parse(JSON.stringify(removed));
  }

  public async hasSales(id: string): Promise<number> {
    return this.sales.filter((s) => s.customerId === id).length;
  }

  public async getSalesAggregates(customerIds: string[]): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    for (const cid of customerIds) {
      const linked = this.sales.filter((s) => s.customerId === cid && s.status !== 'CANCELLED');
      const totalOrders = linked.length;
      const totalSpent = linked.reduce((sum, s) => sum + Number(s.totalAmount), 0);
      const sorted = [...linked].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const lastPurchaseDate = sorted.length > 0 ? sorted[0].createdAt : null;

      result[cid] = {
        totalOrders,
        totalSpent,
        lastPurchaseDate,
      };
    }
    return result;
  }

  public async getGlobalStats(): Promise<any> {
    const active = this.customers.filter((c) => this.sales.some((s) => s.customerId === c.id));
    const totalRevenue = this.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    return {
      totalCustomers: this.customers.length,
      activeCustomers: active.length,
      totalRevenue,
      avgLifetimeValue: active.length > 0 ? Math.round((totalRevenue / active.length) * 100) / 100 : 0,
    };
  }

  public async getOrCreateWalkInCustomer(): Promise<any> {
    let walkIn = this.customers.find((c) => c.code === WALK_IN_CUSTOMER_CODE);
    if (!walkIn) {
      walkIn = {
        id: 'cust-walkin-system',
        code: WALK_IN_CUSTOMER_CODE,
        name: 'Walk-in Customer',
        email: null,
        phone: null,
        address: 'In-Store POS Counter',
        creditLimit: 0,
        totalSpent: 0,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        _count: { sales: 0 },
      };
      this.customers.push(walkIn);
    }
    return JSON.parse(JSON.stringify(walkIn));
  }

  public async getLatestCode(): Promise<string | null> {
    const nonWalkIn = this.customers.filter((c) => c.code !== WALK_IN_CUSTOMER_CODE);
    if (nonWalkIn.length === 0) return null;
    const sorted = [...nonWalkIn].sort((a, b) => b.code.localeCompare(a.code));
    return sorted[0].code;
  }
}

export async function runCustomerTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Customer Test Suite');
  console.log('🧪 ===============================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, errorDetail?: any) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (errorDetail) {
        console.error('     Detail:', errorDetail);
      }
    }
  }

  // ==========================================
  // SECTION 1: VALIDATION & SCHEMA CONSTRAINTS
  // ==========================================
  console.log('--- 1. Validation & Schema Constraints ---');

  // Test 1: Valid schema passes
  try {
    const parsed = createCustomerSchema.parse({
      code: 'CUST-001',
      name: 'Acme Logistics Corp',
      email: 'contact@acmelogistics.com',
      phone: '+1-555-0101',
      address: '100 Broadway, New York, NY',
      creditLimit: 2500.0,
    });
    assert(
      parsed.name === 'Acme Logistics Corp' && parsed.code === 'CUST-001' && parsed.creditLimit === 2500.0,
      '1. Validation: Valid customer input schema passes'
    );
  } catch (err: any) {
    assert(false, '1. Validation: Valid customer input schema passes', err.message);
  }

  // Test 2: Rejects name shorter than 2 characters
  try {
    createCustomerSchema.parse({
      name: 'X',
      email: 'test@example.com',
    });
    assert(false, '2. Validation: Rejects short customer name (< 2 chars)');
  } catch (err: any) {
    assert(
      err.errors && err.errors[0].message.includes('at least 2 characters'),
      '2. Validation: Rejects short customer name (< 2 chars)'
    );
  }

  // Test 3: Rejects invalid email format
  try {
    createCustomerSchema.parse({
      name: 'Valid Name',
      email: 'not-an-email',
    });
    assert(false, '3. Validation: Rejects invalid email format');
  } catch (err: any) {
    assert(
      err.errors && err.errors[0].message.includes('Invalid email'),
      '3. Validation: Rejects invalid email format'
    );
  }

  // Test 4: Rejects negative credit limit
  try {
    createCustomerSchema.parse({
      name: 'Valid Name',
      creditLimit: -500,
    });
    assert(false, '4. Validation: Rejects negative credit limit');
  } catch (err: any) {
    assert(
      err.errors && err.errors[0].message.includes('cannot be negative'),
      '4. Validation: Rejects negative credit limit'
    );
  }

  // Test 5: Rejects invalid code with spaces or special symbols
  try {
    createCustomerSchema.parse({
      code: 'INVALID CODE!',
      name: 'Valid Name',
    });
    assert(false, '5. Validation: Rejects code with spaces/symbols');
  } catch (err: any) {
    assert(
      err.errors && err.errors[0].message.includes('must only contain alphanumeric'),
      '5. Validation: Rejects code with spaces/symbols'
    );
  }

  // Test 6: Valid partial update schema passes
  try {
    const updated = updateCustomerSchema.parse({
      creditLimit: 5000.0,
      phone: '+1-555-9999',
    });
    assert(
      updated.creditLimit === 5000.0 && updated.phone === '+1-555-9999',
      '6. Validation: Valid partial update schema passes'
    );
  } catch (err: any) {
    assert(false, '6. Validation: Valid partial update schema passes', err.message);
  }

  // Test 7: Query schema parses pagination and segment defaults
  try {
    const query = customerQuerySchema.parse({
      page: '3',
      limit: '20',
      segment: 'VIP',
      sortBy: 'totalSpent',
      sortOrder: 'desc',
    });
    assert(
      query.page === 3 &&
        query.limit === 20 &&
        query.segment === 'VIP' &&
        query.sortBy === 'totalSpent',
      '7. Validation: Query schema parses pagination and segment filters'
    );
  } catch (err: any) {
    assert(false, '7. Validation: Query schema parses pagination and segment filters', err.message);
  }

  // ==========================================
  // SECTION 2: SERVICE LAYER & BUSINESS RULES
  // ==========================================
  console.log('\n--- 2. Service Layer & Business Rules ---');

  const initialCustomers = [
    {
      id: 'cust-1',
      code: 'CUST-001',
      name: 'High Roller Enterprises',
      email: 'finance@highroller.com',
      phone: '+1-555-0001',
      address: '1 Wealth Way, Beverly Hills, CA',
      creditLimit: 10000.0,
      totalSpent: 2500.0,
      createdAt: new Date('2025-06-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'cust-2',
      code: 'CUST-002',
      name: 'Loyal Regular Co',
      email: 'buyer@loyalregular.com',
      phone: '+1-555-0002',
      address: '22 Main St, Boston, MA',
      creditLimit: 1000.0,
      totalSpent: 450.0,
      createdAt: new Date('2025-08-01'),
      updatedAt: new Date('2026-02-01'),
    },
    {
      id: 'cust-3',
      code: 'CUST-003',
      name: 'Dormant At-Risk LLC',
      email: 'info@atrisk.com',
      phone: '+1-555-0003',
      address: '99 Old Lane, Chicago, IL',
      creditLimit: 500.0,
      totalSpent: 80.0,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-10'),
    },
    {
      id: 'cust-clean',
      code: 'CUST-004',
      name: 'Clean Prospect Without Sales',
      email: 'prospect@newcorp.com',
      phone: '+1-555-0004',
      address: '12 Prospect Ave, Austin, TX',
      creditLimit: 0.0,
      totalSpent: 0.0,
      createdAt: new Date('2026-02-15'),
      updatedAt: new Date('2026-02-15'),
    },
  ];

  // 120 days ago date for dormant customer
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 120);

  // Recent date (5 days ago)
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 5);

  const initialSales = [
    // cust-1: 2 sales totaling 2500 -> VIP
    {
      id: 'sale-1',
      invoiceNumber: 'INV-2026-0001',
      customerId: 'cust-1',
      userId: 'user-1',
      subtotal: 1400.0,
      taxAmount: 100.0,
      discountAmount: 0.0,
      totalAmount: 1500.0,
      status: 'COMPLETED',
      notes: 'VIP bulk purchase',
      createdAt: recentDate,
      updatedAt: recentDate,
      user: { id: 'user-1', name: 'Cashier One', email: 'cashier1@smartstock.com' },
      items: [],
      payments: [{ id: 'pay-1', amount: 1500.0, paymentMethod: 'CARD', transactionRef: 'TX-101' }],
    },
    {
      id: 'sale-2',
      invoiceNumber: 'INV-2026-0002',
      customerId: 'cust-1',
      userId: 'user-1',
      subtotal: 950.0,
      taxAmount: 50.0,
      discountAmount: 0.0,
      totalAmount: 1000.0,
      status: 'COMPLETED',
      notes: 'VIP repeat purchase',
      createdAt: recentDate,
      updatedAt: recentDate,
      user: { id: 'user-1', name: 'Cashier One', email: 'cashier1@smartstock.com' },
      items: [],
      payments: [{ id: 'pay-2', amount: 1000.0, paymentMethod: 'BANK_TRANSFER', transactionRef: 'TX-102' }],
    },
    // cust-2: 3 sales totaling 450 -> LOYAL
    {
      id: 'sale-3',
      invoiceNumber: 'INV-2026-0003',
      customerId: 'cust-2',
      userId: 'user-1',
      subtotal: 140.0,
      taxAmount: 10.0,
      discountAmount: 0.0,
      totalAmount: 150.0,
      status: 'COMPLETED',
      notes: 'Loyal order 1',
      createdAt: recentDate,
      updatedAt: recentDate,
      user: { id: 'user-1', name: 'Cashier One', email: 'cashier1@smartstock.com' },
      items: [],
      payments: [],
    },
    {
      id: 'sale-4',
      invoiceNumber: 'INV-2026-0004',
      customerId: 'cust-2',
      userId: 'user-1',
      subtotal: 140.0,
      taxAmount: 10.0,
      discountAmount: 0.0,
      totalAmount: 150.0,
      status: 'COMPLETED',
      notes: 'Loyal order 2',
      createdAt: recentDate,
      updatedAt: recentDate,
      user: { id: 'user-1', name: 'Cashier One', email: 'cashier1@smartstock.com' },
      items: [],
      payments: [],
    },
    {
      id: 'sale-5',
      invoiceNumber: 'INV-2026-0005',
      customerId: 'cust-2',
      userId: 'user-1',
      subtotal: 140.0,
      taxAmount: 10.0,
      discountAmount: 0.0,
      totalAmount: 150.0,
      status: 'COMPLETED',
      notes: 'Loyal order 3',
      createdAt: recentDate,
      updatedAt: recentDate,
      user: { id: 'user-1', name: 'Cashier One', email: 'cashier1@smartstock.com' },
      items: [],
      payments: [],
    },
    // cust-3: 1 sale 120 days ago -> AT_RISK
    {
      id: 'sale-6',
      invoiceNumber: 'INV-2025-0099',
      customerId: 'cust-3',
      userId: 'user-1',
      subtotal: 75.0,
      taxAmount: 5.0,
      discountAmount: 0.0,
      totalAmount: 80.0,
      status: 'COMPLETED',
      notes: 'Old order',
      createdAt: oldDate,
      updatedAt: oldDate,
      user: { id: 'user-1', name: 'Cashier One', email: 'cashier1@smartstock.com' },
      items: [],
      payments: [],
    },
  ];

  const mockRepo = new MockCustomerRepository(initialCustomers, initialSales);
  const service = new CustomerService(mockRepo);

  // Test 8: Auto-generates sequential customer code (CUST-005) when omitted
  try {
    const created = await service.createCustomer({
      name: 'Dynamic Solutions Inc',
      email: 'contact@dynamicsolutions.com',
      phone: '+1-555-5555',
    });
    assert(
      created.code === 'CUST-005' && created.name === 'Dynamic Solutions Inc',
      '8. Service: Auto-generates sequential code (CUST-005) when omitted'
    );
  } catch (err: any) {
    assert(false, '8. Service: Auto-generates sequential code when omitted', err.message);
  }

  // Test 9: Rejects duplicate customer code with 409 Conflict
  try {
    await service.createCustomer({
      code: 'CUST-001',
      name: 'Duplicate Code Co',
    });
    assert(false, '9. Service: Rejects duplicate customer code with 409 Conflict');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.statusCode === 409 && err.message.includes('CUST-001'),
      '9. Service: Rejects duplicate customer code with 409 Conflict'
    );
  }

  // Test 10: Rejects duplicate customer name with 409 Conflict
  try {
    await service.createCustomer({
      name: 'high roller enterprises',
    });
    assert(false, '10. Service: Rejects duplicate customer name with 409 Conflict');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.statusCode === 409 && err.message.includes('already exists'),
      '10. Service: Rejects duplicate customer name with 409 Conflict'
    );
  }

  // Test 11: Rejects duplicate phone with 409 Conflict
  try {
    await service.createCustomer({
      name: 'Unique Name Co',
      phone: '+1-555-0001',
    });
    assert(false, '11. Service: Rejects duplicate phone number with 409 Conflict');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.statusCode === 409 && err.message.includes('phone number'),
      '11. Service: Rejects duplicate phone number with 409 Conflict'
    );
  }

  // Test 12: Successfully updates customer details and credit limit
  try {
    const updated = await service.updateCustomer('cust-2', {
      creditLimit: 3000.0,
      address: '77 New Harbor Rd, Boston, MA',
    });
    assert(
      updated.creditLimit === 3000.0 && updated.address === '77 New Harbor Rd, Boston, MA',
      '12. Service: Successfully updates customer details and credit limit'
    );
  } catch (err: any) {
    assert(false, '12. Service: Successfully updates customer details and credit limit', err.message);
  }

  // Test 13: Calculates totalSpent, totalOrders, averageOrderValue accurately
  try {
    const detail = await service.getCustomerById('cust-1');
    assert(
      detail.totalOrders === 2 &&
        detail.totalSpent === 2500.0 &&
        detail.averageOrderValue === 1250.0 &&
        detail.salesHistory.length === 2,
      '13. Analytics: Accurately computes totalOrders (2), totalSpent ($2500.00), and avg order ($1250.00)'
    );
  } catch (err: any) {
    assert(false, '13. Analytics: Accurately computes totalOrders, totalSpent, and avg order', err.message);
  }

  // ==========================================
  // SECTION 3: RFM SEGMENTATION & ANALYTICS
  // ==========================================
  console.log('\n--- 3. RFM Customer Segmentation & Analytics ---');

  // Test 14: Classifies high spender ($1,000+) as VIP
  try {
    const cust1 = await service.getCustomerById('cust-1');
    assert(cust1.segment === 'VIP', '14. Segmentation: Customer with $2500 spend classified as VIP');
  } catch (err: any) {
    assert(false, '14. Segmentation: Customer with $2500 spend classified as VIP', err.message);
  }

  // Test 15: Classifies frequent repeat buyer as LOYAL
  try {
    const cust2 = await service.getCustomerById('cust-2');
    assert(cust2.segment === 'LOYAL', '15. Segmentation: Customer with 3 orders classified as LOYAL');
  } catch (err: any) {
    assert(false, '15. Segmentation: Customer with 3 orders classified as LOYAL', err.message);
  }

  // Test 16: Classifies dormant customer (> 90 days) as AT_RISK
  try {
    const cust3 = await service.getCustomerById('cust-3');
    assert(cust3.segment === 'AT_RISK', '16. Segmentation: Customer inactive for 120 days classified as AT_RISK');
  } catch (err: any) {
    assert(false, '16. Segmentation: Customer inactive for 120 days classified as AT_RISK', err.message);
  }

  // Test 17: Classifies registered customer with 0 purchases as PROSPECT
  try {
    const custClean = await service.getCustomerById('cust-clean');
    assert(custClean.segment === 'PROSPECT', '17. Segmentation: Customer with 0 orders classified as PROSPECT');
  } catch (err: any) {
    assert(false, '17. Segmentation: Customer with 0 orders classified as PROSPECT', err.message);
  }

  // ==========================================
  // SECTION 4: WALK-IN CUSTOMER SUPPORT
  // ==========================================
  console.log('\n--- 4. Walk-in Customer Support ---');

  // Test 18: Retrieves or initializes system Walk-in customer
  try {
    const walkIn = await service.getWalkInCustomer();
    assert(
      walkIn.code === WALK_IN_CUSTOMER_CODE &&
        walkIn.name === 'Walk-in Customer' &&
        walkIn.segment === 'WALK_IN',
      '18. Walk-in: Successfully initializes and retrieves system Walk-in customer (CUST-WALKIN)'
    );
  } catch (err: any) {
    assert(false, '18. Walk-in: Successfully initializes system Walk-in customer', err.message);
  }

  // Test 19: Prevents modifying Walk-in customer code
  try {
    const walkIn = await service.getWalkInCustomer();
    await service.updateCustomer(walkIn.id, { code: 'CUSTOM-CODE' });
    assert(false, '19. Walk-in: Blocks renaming system Walk-in customer code');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.statusCode === 400 && err.message.includes('Walk-in Customer code'),
      '19. Walk-in: Blocks renaming system Walk-in customer code (400 Bad Request)'
    );
  }

  // Test 20: Prevents deleting Walk-in customer record
  try {
    const walkIn = await service.getWalkInCustomer();
    await service.deleteCustomer(walkIn.id);
    assert(false, '20. Walk-in: Blocks deleting system Walk-in customer record');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.statusCode === 400 && err.message.includes('Walk-in Customer record cannot be deleted'),
      '20. Walk-in: Blocks deleting system Walk-in customer record (400 Bad Request)'
    );
  }

  // ==========================================
  // SECTION 5: SAFE DELETION INTEGRITY
  // ==========================================
  console.log('\n--- 5. Safe Deletion & Audit Integrity ---');

  // Test 21: Blocks deletion of customer with sales history
  try {
    await service.deleteCustomer('cust-1');
    assert(false, '21. Safety: Blocks deletion of customer with sales history');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.statusCode === 400 && err.message.includes('associated sales invoice'),
      '21. Safety: Blocks deletion of customer with sales history (400 Bad Request)'
    );
  }

  // Test 22: Safely deletes clean customer without sales history
  try {
    const deleted = await service.deleteCustomer('cust-clean');
    assert(
      deleted.id === 'cust-clean' && deleted.code === 'CUST-004',
      '22. Safety: Safely deletes clean customer without sales history'
    );
  } catch (err: any) {
    assert(false, '22. Safety: Safely deletes clean customer without sales history', err.message);
  }

  // ==========================================
  // SECTION 6: SEARCH, FILTERING & QUERIES
  // ==========================================
  console.log('\n--- 6. Search, Filtering & Queries ---');

  // Test 23: Multi-field search
  {
    const searchRes = await service.listCustomers({
      search: 'regular',
      page: 1,
      limit: 10,
    });
    assert(
      searchRes.items.length === 1 && searchRes.items[0].code === 'CUST-002',
      '23a. Query: Search by name keyword matches customer'
    );
  }

  {
    const phoneRes = await service.listCustomers({
      search: '0001',
      page: 1,
      limit: 10,
    });
    assert(
      phoneRes.items.length === 1 && phoneRes.items[0].code === 'CUST-001',
      '23b. Query: Search by phone digits matches customer'
    );
  }

  // Test 24: Filter by customer segment
  {
    const vipRes = await service.listCustomers({
      segment: 'VIP',
      page: 1,
      limit: 10,
    });
    assert(
      vipRes.items.every((c) => c.segment === 'VIP'),
      '24. Query: Filters customers by VIP segment'
    );
  }

  // ==========================================
  // SECTION 7: ROLE-BASED ACCESS CONTROL (RBAC)
  // ==========================================
  console.log('\n--- 7. Role-Based Access Control (RBAC) ---');

  // Test 25: Cashier is blocked with 403 Forbidden from deleting customers
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
      forbiddenError !== null &&
        forbiddenError.statusCode === 403 &&
        forbiddenError.message.includes("Role 'CASHIER' does not have sufficient permissions"),
      '25. RBAC: Cashier is blocked with 403 Forbidden from deleting customers'
    );
  }

  // Test 26: Admin and Manager roles are permitted to delete customers
  {
    const adminReq = {
      user: { id: 'admin-1', role: UserRole.ADMIN },
    } as unknown as Request;
    let adminAllowed = false;
    const adminNext: NextFunction = (err?: any) => {
      if (!err) adminAllowed = true;
    };
    const rbacMiddleware = authorize(UserRole.ADMIN, UserRole.MANAGER);
    rbacMiddleware(adminReq, {} as Response, adminNext);

    const managerReq = {
      user: { id: 'manager-1', role: UserRole.MANAGER },
    } as unknown as Request;
    let managerAllowed = false;
    const managerNext: NextFunction = (err?: any) => {
      if (!err) managerAllowed = true;
    };
    rbacMiddleware(managerReq, {} as Response, managerNext);

    assert(
      adminAllowed && managerAllowed,
      '26. RBAC: Admin and Manager roles are permitted to delete customers'
    );
  }

  console.log(`\n📊 Customer Test Suite Results: ${passedTests}/${totalTests} Passed.\n`);

  if (passedTests !== totalTests) {
    throw new Error('Customer Test Suite failed');
  }
}

if (require.main === module) {
  runCustomerTests()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
