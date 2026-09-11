import { UserRole } from '@prisma/client';
import { SupplierService } from '../services/supplier.service';
import { SupplierRepository } from '../repositories/supplier.repository';
import {
  createSupplierSchema,
  updateSupplierSchema,
  supplierQuerySchema,
} from '../validators/supplier.validator';
import { authorize } from '../middleware/auth.middleware';
import { ApiError } from '../utils/apiError';
import { Request, Response, NextFunction } from 'express';

// In-Memory Mock Repository for Isolated Unit & Integration Testing
class MockSupplierRepository extends SupplierRepository {
  private suppliers: any[] = [];
  private purchases: any[] = [];

  constructor(initialSuppliers: any[] = [], initialPurchases: any[] = []) {
    super();
    this.suppliers = JSON.parse(JSON.stringify(initialSuppliers));
    this.purchases = JSON.parse(JSON.stringify(initialPurchases));
  }

  public async findById(id: string, includePurchases: boolean = false): Promise<any> {
    const sup = this.suppliers.find((s) => s.id === id);
    if (!sup) return null;

    const purchaseList = this.purchases.filter((p) => p.supplierId === id);
    const result = {
      ...sup,
      _count: { purchases: purchaseList.length },
    };

    if (includePurchases) {
      result.purchases = purchaseList;
    }
    return JSON.parse(JSON.stringify(result));
  }

  public async findByCode(code: string): Promise<any> {
    const sup = this.suppliers.find((s) => s.code.toUpperCase() === code.toUpperCase());
    return sup ? JSON.parse(JSON.stringify(sup)) : null;
  }

  public async findByName(name: string): Promise<any> {
    const sup = this.suppliers.find((s) => s.name.toLowerCase() === name.toLowerCase());
    return sup ? JSON.parse(JSON.stringify(sup)) : null;
  }

  public async findMany(options: any = {}): Promise<any[]> {
    let result = [...this.suppliers];

    if (options.where?.isActive !== undefined) {
      result = result.filter((s) => s.isActive === options.where.isActive);
    }

    if (options.where?.OR) {
      const term = options.where.OR[0]?.name?.contains?.toLowerCase() || '';
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.code.toLowerCase().includes(term) ||
          (s.contactPerson && s.contactPerson.toLowerCase().includes(term)) ||
          (s.email && s.email.toLowerCase().includes(term)) ||
          (s.phone && s.phone.toLowerCase().includes(term))
      );
    }

    const resWithCounts = result.map((s) => {
      const purchaseCount = this.purchases.filter((p) => p.supplierId === s.id).length;
      return {
        ...s,
        _count: { purchases: purchaseCount },
      };
    });

    const skip = options.skip || 0;
    const take = options.take !== undefined ? options.take : resWithCounts.length;
    return resWithCounts.slice(skip, skip + take);
  }

  public async count(where: any = {}): Promise<number> {
    let result = [...this.suppliers];
    if (where?.isActive !== undefined) {
      result = result.filter((s) => s.isActive === where.isActive);
    }
    return result.length;
  }

  public async create(data: any): Promise<any> {
    const newSupplier = {
      id: `sup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      code: data.code,
      name: data.name,
      contactPerson: data.contactPerson || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      taxId: data.taxId || null,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { purchases: 0 },
    };
    this.suppliers.push(newSupplier);
    return JSON.parse(JSON.stringify(newSupplier));
  }

  public async update(id: string, data: any): Promise<any> {
    const index = this.suppliers.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Not found');

    const updated = {
      ...this.suppliers[index],
      ...data,
      updatedAt: new Date(),
    };
    this.suppliers[index] = updated;

    const purchaseCount = this.purchases.filter((p) => p.supplierId === id).length;
    return JSON.parse(JSON.stringify({ ...updated, _count: { purchases: purchaseCount } }));
  }

  public async delete(id: string): Promise<any> {
    const index = this.suppliers.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Not found');
    const removed = this.suppliers.splice(index, 1)[0];
    return JSON.parse(JSON.stringify(removed));
  }

  public async hasPurchases(id: string): Promise<number> {
    return this.purchases.filter((p) => p.supplierId === id).length;
  }

  public async getSupplierPurchasesSum(supplierId: string): Promise<number> {
    const linked = this.purchases.filter((p) => p.supplierId === supplierId);
    return linked.reduce((sum, p) => sum + Number(p.totalAmount), 0);
  }

  public async getPurchasesSumsBySupplierIds(supplierIds: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    for (const sid of supplierIds) {
      const linked = this.purchases.filter((p) => p.supplierId === sid);
      result[sid] = linked.reduce((sum, p) => sum + Number(p.totalAmount), 0);
    }
    return result;
  }

  public async getGlobalStats(): Promise<any> {
    const totalPurchases = this.purchases.length;
    const totalSpend = this.purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
    return {
      totalSuppliers: this.suppliers.length,
      activeSuppliers: this.suppliers.filter((s) => s.isActive).length,
      totalPurchases,
      totalSpend,
    };
  }

  public async getLatestCode(): Promise<string | null> {
    if (this.suppliers.length === 0) return null;
    const sorted = [...this.suppliers].sort((a, b) => b.code.localeCompare(a.code));
    return sorted[0].code;
  }
}

export async function runSupplierTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Supplier Test Suite');
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
    const parsed = createSupplierSchema.parse({
      code: 'SUP-001',
      name: 'Global Tech Wholesale',
      contactPerson: 'David Miller',
      email: 'sales@globaltech.com',
      phone: '+1-555-0199',
      address: '100 Silicon Way, San Jose, CA',
      taxId: 'TAX-998811',
      isActive: true,
    });
    assert(
      parsed.name === 'Global Tech Wholesale' && parsed.code === 'SUP-001',
      '1. Validation: Valid supplier schema passes'
    );
  } catch (err: any) {
    assert(false, '1. Validation: Valid supplier schema passes', err.message);
  }

  // Test 2: Rejects name shorter than 2 characters
  try {
    createSupplierSchema.parse({
      name: 'A',
      email: 'valid@example.com',
    });
    assert(false, '2. Validation: Rejects short name (< 2 chars)');
  } catch (err: any) {
    assert(
      err.errors && err.errors[0].message.includes('at least 2 characters'),
      '2. Validation: Rejects short name (< 2 chars)'
    );
  }

  // Test 3: Rejects invalid email format
  try {
    createSupplierSchema.parse({
      name: 'Acme Corp',
      email: 'invalid-email-address',
    });
    assert(false, '3. Validation: Rejects invalid email format');
  } catch (err: any) {
    assert(
      err.errors && err.errors[0].message.includes('Invalid email'),
      '3. Validation: Rejects invalid email format'
    );
  }

  // Test 4: Normalizes and validates supplier code format
  try {
    createSupplierSchema.parse({
      code: 'INVALID CODE WITH SPACES',
      name: 'Acme Corp',
    });
    assert(false, '4. Validation: Rejects code with spaces/special characters');
  } catch (err: any) {
    assert(
      err.errors && err.errors[0].message.includes('must only contain alphanumeric'),
      '4. Validation: Rejects code with spaces/special characters'
    );
  }

  // Test 5: Valid partial update schema passes
  try {
    const updated = updateSupplierSchema.parse({
      contactPerson: 'Jane Doe',
      phone: '+1-555-9876',
      isActive: false,
    });
    assert(
      updated.contactPerson === 'Jane Doe' && updated.isActive === false,
      '5. Validation: Valid partial update schema passes'
    );
  } catch (err: any) {
    assert(false, '5. Validation: Valid partial update schema passes', err.message);
  }

  // Test 5b: Query schema parses pagination and sorting defaults
  try {
    const query = supplierQuerySchema.parse({
      page: '2',
      limit: '15',
      search: 'Electronics',
      status: 'ACTIVE',
      sortBy: 'totalPurchaseAmount',
      sortOrder: 'desc',
    });
    assert(
      query.page === 2 &&
        query.limit === 15 &&
        query.search === 'Electronics' &&
        query.status === 'ACTIVE' &&
        query.sortBy === 'totalPurchaseAmount',
      '5b. Validation: Query schema parses pagination and custom sort defaults'
    );
  } catch (err: any) {
    assert(false, '5b. Validation: Query schema parses pagination and custom sort defaults', err.message);
  }

  // ==========================================
  // SECTION 2: SERVICE LAYER & BUSINESS RULES
  // ==========================================
  console.log('\n--- 2. Service Layer & Business Rules ---');

  const initialSuppliers = [
    {
      id: 'sup-1',
      code: 'SUP-001',
      name: 'Nexus Tech Global Ltd',
      contactPerson: 'David Miller',
      email: 'sales@nexustech.com',
      phone: '+1-800-555-0190',
      address: '100 Tech Parkway, San Jose, CA',
      taxId: 'TAX-998811',
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'sup-2',
      code: 'SUP-002',
      name: 'PaperCraft Supplies Co',
      contactPerson: 'Sarah Jenkins',
      email: 'orders@papercraft.com',
      phone: '+1-800-555-0191',
      address: '45 Industrial Ave, Chicago, IL',
      taxId: 'TAX-998812',
      isActive: false,
      createdAt: new Date('2026-01-02'),
      updatedAt: new Date('2026-01-02'),
    },
    {
      id: 'sup-clean',
      code: 'SUP-003',
      name: 'Clean Supplier No Orders',
      contactPerson: 'Bob Ross',
      email: 'bob@cleansupplier.com',
      phone: '+1-800-555-0193',
      address: '12 Paint Lane, Seattle, WA',
      taxId: 'TAX-998813',
      isActive: true,
      createdAt: new Date('2026-01-03'),
      updatedAt: new Date('2026-01-03'),
    },
  ];

  const initialPurchases = [
    {
      id: 'po-1',
      purchaseOrderNumber: 'PO-2026-0001',
      supplierId: 'sup-1',
      userId: 'user-manager-1',
      totalAmount: 2470.0,
      status: 'RECEIVED',
      notes: 'Electronics stock',
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date('2026-02-01'),
      user: { id: 'user-manager-1', name: 'Marcus Brody', email: 'manager1@smartstock.com' },
      items: [
        {
          id: 'pi-1',
          quantity: 30,
          unitCost: 45.0,
          subtotal: 1350.0,
          product: { id: 'prod-1', name: 'Wireless Headset', sku: 'SKU-001', unit: 'pcs' },
        },
      ],
    },
    {
      id: 'po-2',
      purchaseOrderNumber: 'PO-2026-0002',
      supplierId: 'sup-1',
      userId: 'user-manager-1',
      totalAmount: 530.0,
      status: 'RECEIVED',
      notes: 'Additional cables',
      createdAt: new Date('2026-02-15'),
      updatedAt: new Date('2026-02-15'),
      user: { id: 'user-manager-1', name: 'Marcus Brody', email: 'manager1@smartstock.com' },
      items: [],
    },
  ];

  const mockRepo = new MockSupplierRepository(initialSuppliers, initialPurchases);
  const service = new SupplierService(mockRepo);

  // Test 6: Auto-generates unique sequential supplier code when omitted
  try {
    const created = await service.createSupplier({
      name: 'Autonomous Innovations Ltd',
      contactPerson: 'Alan Turing',
      email: 'alan@innovations.com',
    });
    assert(
      created.code === 'SUP-004' && created.name === 'Autonomous Innovations Ltd',
      '6. Service: Auto-generates sequential code (SUP-004) when omitted'
    );
  } catch (err: any) {
    assert(false, '6. Service: Auto-generates sequential code when omitted', err.message);
  }

  // Test 7: Rejects duplicate supplier code with 409 Conflict
  try {
    await service.createSupplier({
      code: 'SUP-001',
      name: 'Another Vendor Inc',
    });
    assert(false, '7. Service: Rejects duplicate supplier code with 409 Conflict');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.statusCode === 409 && err.message.includes('SUP-001'),
      '7. Service: Rejects duplicate supplier code with 409 Conflict'
    );
  }

  // Test 8: Rejects duplicate supplier name with 409 Conflict (case-insensitive)
  try {
    await service.createSupplier({
      code: 'SUP-999',
      name: 'nexus tech global ltd',
    });
    assert(false, '8. Service: Rejects duplicate supplier name with 409 Conflict');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.statusCode === 409 && err.message.includes('already exists'),
      '8. Service: Rejects duplicate supplier name with 409 Conflict'
    );
  }

  // Test 9: Successfully updates supplier details & active status
  try {
    const updated = await service.updateSupplier('sup-2', {
      contactPerson: 'Sarah Connor',
      phone: '+1-555-8888',
      isActive: true,
    });
    assert(
      updated.contactPerson === 'Sarah Connor' &&
        updated.phone === '+1-555-8888' &&
        updated.isActive === true,
      '9. Service: Successfully updates supplier details and status'
    );
  } catch (err: any) {
    assert(false, '9. Service: Successfully updates supplier details and status', err.message);
  }

  // Test 10: Calculates totalPurchases and totalPurchaseAmount correctly
  try {
    const detail = await service.getSupplierById('sup-1');
    assert(
      detail.totalPurchases === 2 &&
        detail.totalPurchaseAmount === 3000.0 &&
        detail.purchaseHistory.length === 2 &&
        detail.purchaseHistory[0].purchaseOrderNumber === 'PO-2026-0001',
      '10. Service: Accurately computes purchase count (2) and total volume ($3000.00)'
    );
  } catch (err: any) {
    assert(false, '10. Service: Accurately computes purchase count and total volume', err.message);
  }

  // Test 11: Non-existent supplier returns 404 Not Found
  try {
    await service.getSupplierById('sup-does-not-exist');
    assert(false, '11. Service: Rejects non-existent supplier with 404 Not Found');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.statusCode === 404,
      '11. Service: Rejects non-existent supplier with 404 Not Found'
    );
  }

  // ==========================================
  // SECTION 3: SAFE DELETION INTEGRITY
  // ==========================================
  console.log('\n--- 3. Safe Deletion & Audit Integrity ---');

  // Test 12: Blocks deletion when supplier has purchase orders
  try {
    await service.deleteSupplier('sup-1');
    assert(false, '12. Safety: Blocks deletion of supplier with purchase history (400 Bad Request)');
  } catch (err: any) {
    assert(
      err instanceof ApiError &&
        err.statusCode === 400 &&
        err.message.includes('associated purchase order'),
      '12. Safety: Blocks deletion of supplier with purchase history (400 Bad Request)'
    );
  }

  // Test 13: Clean supplier without purchase orders can be deleted safely
  try {
    const deleted = await service.deleteSupplier('sup-clean');
    assert(
      deleted.id === 'sup-clean' && deleted.code === 'SUP-003',
      '13. Safety: Clean supplier without purchase history is deleted safely'
    );
  } catch (err: any) {
    assert(false, '13. Safety: Clean supplier without purchase history is deleted safely', err.message);
  }

  // ==========================================
  // SECTION 4: FILTERING, SEARCH & PAGINATION
  // ==========================================
  console.log('\n--- 4. Filtering, Search & Queries ---');

  // Test 14: Search by name, code, contact person, or email
  {
    const searchRes = await service.listSuppliers({
      search: 'nexus',
      page: 1,
      limit: 10,
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    assert(
      searchRes.items.length === 1 && searchRes.items[0].code === 'SUP-001',
      '14a. Query: Search by name keyword returns matching supplier'
    );
  }

  {
    const searchPhoneRes = await service.listSuppliers({
      search: '8888',
      page: 1,
      limit: 10,
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    assert(
      searchPhoneRes.items.length === 1 && searchPhoneRes.items[0].id === 'sup-2',
      '14b. Query: Search by phone digits returns matching supplier'
    );
  }

  // Test 15: Filter by status
  {
    const activeRes = await service.listSuppliers({
      status: 'ACTIVE',
      page: 1,
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    const allActive = activeRes.items.every((s) => s.isActive);
    assert(allActive && activeRes.items.length >= 2, '15. Query: Filters suppliers by ACTIVE status');
  }

  // ==========================================
  // SECTION 5: ROLE-BASED ACCESS CONTROL (RBAC)
  // ==========================================
  console.log('\n--- 5. Role-Based Access Control (RBAC) ---');

  // Test 16: Cashier is blocked with 403 Forbidden from supplier management
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
      '16. RBAC: Cashier is blocked with 403 Forbidden from supplier management'
    );
  }

  // Test 17: Admin and Manager roles are permitted
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
      '17. RBAC: Admin and Manager roles are permitted to manage suppliers'
    );
  }

  console.log(`\n📊 Supplier Test Suite Results: ${passedTests}/${totalTests} Passed.\n`);

  if (passedTests !== totalTests) {
    throw new Error('Supplier Test Suite failed');
  }
}

if (require.main === module) {
  runSupplierTests()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
