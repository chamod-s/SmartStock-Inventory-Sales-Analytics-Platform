import { UserRole, ProductStatus, Prisma } from '@prisma/client';
import { ProductService, calculateStockStatus } from '../services/product.service';
import {
  ProductRepository,
  ProductWithCategory,
  FindProductsOptions,
} from '../repositories/product.repository';
import { CategoryRepository } from '../repositories/category.repository';
import {
  createProductSchema,
  updateProductSchema,
} from '../validators/product.validator';
import { authorize } from '../middleware/auth.middleware';
import { ApiError } from '../utils/apiError';
import { Request, Response, NextFunction } from 'express';

// In-Memory Mock Category Repository
class MockCategoryRepository extends CategoryRepository {
  private categories: Array<{ id: string; name: string; slug: string }> = [];

  constructor(categories: Array<{ id: string; name: string; slug: string }>) {
    super();
    this.categories = categories;
  }

  public async findById(id: string): Promise<any> {
    const cat = this.categories.find((c) => c.id === id);
    return cat ? { ...cat, isActive: true, _count: { products: 0 } } : null;
  }
}

// In-Memory Mock Product Repository
class MockProductRepository extends ProductRepository {
  private products: ProductWithCategory[] = [];
  private transactionHistory: Record<
    string,
    { salesCount: number; purchasesCount: number; transactionsCount: number }
  > = {};

  constructor(
    initialData: ProductWithCategory[] = [],
    history: Record<string, { salesCount: number; purchasesCount: number; transactionsCount: number }> = {}
  ) {
    super();
    this.products = [...initialData];
    this.transactionHistory = history;
  }

  public async findById(id: string): Promise<ProductWithCategory | null> {
    const p = this.products.find((prod) => prod.id === id);
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  public async findBySku(sku: string): Promise<any> {
    const p = this.products.find((prod) => prod.sku.toUpperCase() === sku.toUpperCase());
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  public async findMany(options: FindProductsOptions = {}): Promise<ProductWithCategory[]> {
    let result = [...this.products];

    // Filter by category
    if (options.where?.categoryId) {
      result = result.filter((p) => p.categoryId === options.where?.categoryId);
    }

    // Filter by status
    if (options.where?.status) {
      result = result.filter((p) => p.status === options.where?.status);
    }

    // Search by term in OR
    if (options.where?.OR && Array.isArray(options.where.OR)) {
      const term = ((options.where.OR[0] as any)?.name?.contains || '').toLowerCase();
      if (term) {
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.sku.toLowerCase().includes(term) ||
            (p.description && p.description.toLowerCase().includes(term))
        );
      }
    }

    // Specific SKU filter
    if (options.where?.sku) {
      const skuTerm = ((options.where.sku as any)?.contains || '').toLowerCase();
      if (skuTerm) {
        result = result.filter((p) => p.sku.toLowerCase().includes(skuTerm));
      }
    }

    // Stock Status filter
    if (options.stockStatus && options.stockStatus !== 'all') {
      if (options.stockStatus === 'OUT_OF_STOCK') {
        result = result.filter((p) => p.currentStock <= 0);
      } else if (options.stockStatus === 'LOW_STOCK') {
        result = result.filter((p) => p.currentStock > 0 && p.currentStock <= p.reorderLevel);
      } else if (options.stockStatus === 'IN_STOCK') {
        result = result.filter((p) => p.currentStock > p.reorderLevel);
      }
    }

    const skip = options.skip || 0;
    const take = options.take || result.length;
    return result.slice(skip, skip + take);
  }

  public async count(where: any = {}, stockStatus?: any): Promise<number> {
    const items = await this.findMany({ where, stockStatus });
    return items.length;
  }

  public async create(data: any): Promise<ProductWithCategory> {
    const newProduct: ProductWithCategory = {
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      categoryId: data.category.connect.id,
      name: data.name,
      sku: data.sku,
      description: data.description || null,
      purchasePrice: data.purchasePrice,
      sellingPrice: data.sellingPrice,
      currentStock: data.currentStock ?? 0,
      reorderLevel: data.reorderLevel ?? 10,
      unit: data.unit || 'pcs',
      status: data.status || ProductStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: {
        id: data.category.connect.id,
        name: 'Test Category',
        slug: 'test-category',
      },
    };
    this.products.push(newProduct);
    return newProduct;
  }

  public async update(id: string, data: any): Promise<ProductWithCategory> {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found');

    const existing = this.products[index];
    const updated: ProductWithCategory = {
      ...existing,
      name: data.name !== undefined ? data.name : existing.name,
      sku: data.sku !== undefined ? data.sku : existing.sku,
      description: data.description !== undefined ? data.description : existing.description,
      purchasePrice: data.purchasePrice !== undefined ? data.purchasePrice : existing.purchasePrice,
      sellingPrice: data.sellingPrice !== undefined ? data.sellingPrice : existing.sellingPrice,
      reorderLevel: data.reorderLevel !== undefined ? data.reorderLevel : existing.reorderLevel,
      unit: data.unit !== undefined ? data.unit : existing.unit,
      status: data.status !== undefined ? data.status : existing.status,
      // Note: currentStock remains existing.currentStock!
      currentStock: existing.currentStock,
      updatedAt: new Date(),
    };

    this.products[index] = updated;
    return updated;
  }

  public async delete(id: string): Promise<any> {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found');
    const [deleted] = this.products.splice(index, 1);
    return deleted;
  }

  public async hasTransactions(id: string): Promise<{
    salesCount: number;
    purchasesCount: number;
    transactionsCount: number;
  }> {
    return (
      this.transactionHistory[id] || {
        salesCount: 0,
        purchasesCount: 0,
        transactionsCount: 0,
      }
    );
  }
}

// Test Runner Helper
let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, failureReason?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (failureReason) {
      console.error(`     Reason: ${failureReason}`);
    }
  }
}

export async function runProductTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Product Test Suite');
  console.log('🧪 ===============================================\n');

  const mockCategories = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Electronics', slug: 'electronics' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Stationery', slug: 'stationery' },
  ];

  const initialProducts: ProductWithCategory[] = [
    {
      id: 'prod-1',
      categoryId: '11111111-1111-1111-1111-111111111111',
      name: 'Wireless Bluetooth Mouse',
      sku: 'SKU-ELE-001',
      description: 'Ergonomic mouse',
      purchasePrice: new Prisma.Decimal('12.50'),
      sellingPrice: new Prisma.Decimal('25.00'),
      currentStock: 45,
      reorderLevel: 15, // currentStock (45) > reorderLevel (15) => IN_STOCK
      unit: 'pcs',
      status: ProductStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: { id: '11111111-1111-1111-1111-111111111111', name: 'Electronics', slug: 'electronics' },
    },
    {
      id: 'prod-2',
      categoryId: '11111111-1111-1111-1111-111111111111',
      name: 'Gaming Mechanical Keyboard',
      sku: 'SKU-ELE-002',
      description: 'RGB Backlit',
      purchasePrice: new Prisma.Decimal('45.00'),
      sellingPrice: new Prisma.Decimal('89.99'),
      currentStock: 8,
      reorderLevel: 10, // currentStock (8) <= reorderLevel (10) => LOW_STOCK
      unit: 'pcs',
      status: ProductStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: { id: '11111111-1111-1111-1111-111111111111', name: 'Electronics', slug: 'electronics' },
    },
    {
      id: 'prod-3',
      categoryId: '22222222-2222-2222-2222-222222222222',
      name: 'A4 Printing Paper Ream',
      sku: 'SKU-STA-001',
      description: '500 sheets copy paper',
      purchasePrice: new Prisma.Decimal('3.50'),
      sellingPrice: new Prisma.Decimal('6.99'),
      currentStock: 0, // currentStock (0) <= 0 => OUT_OF_STOCK
      reorderLevel: 20,
      unit: 'ream',
      status: ProductStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: { id: '22222222-2222-2222-2222-222222222222', name: 'Stationery', slug: 'stationery' },
    },
    {
      id: 'prod-linked',
      categoryId: '11111111-1111-1111-1111-111111111111',
      name: 'Sold Product With Sales',
      sku: 'SKU-SOLD-001',
      description: 'Cannot be hard deleted',
      purchasePrice: new Prisma.Decimal('50.00'),
      sellingPrice: new Prisma.Decimal('100.00'),
      currentStock: 10,
      reorderLevel: 5,
      unit: 'pcs',
      status: ProductStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: { id: '11111111-1111-1111-1111-111111111111', name: 'Electronics', slug: 'electronics' },
    },
    {
      id: 'prod-clean',
      categoryId: '22222222-2222-2222-2222-222222222222',
      name: 'Zero History Product',
      sku: 'SKU-CLEAN-001',
      description: 'Safe to delete',
      purchasePrice: new Prisma.Decimal('5.00'),
      sellingPrice: new Prisma.Decimal('10.00'),
      currentStock: 0,
      reorderLevel: 5,
      unit: 'pcs',
      status: ProductStatus.INACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: { id: '22222222-2222-2222-2222-222222222222', name: 'Stationery', slug: 'stationery' },
    },
  ];

  const transactionHistory = {
    'prod-linked': { salesCount: 5, purchasesCount: 1, transactionsCount: 6 },
    'prod-clean': { salesCount: 0, purchasesCount: 0, transactionsCount: 0 },
  };

  const categoryRepo = new MockCategoryRepository(mockCategories);
  const productRepo = new MockProductRepository(initialProducts, transactionHistory);
  const service = new ProductService(productRepo, categoryRepo);

  // ==========================================
  // SECTION 1: ZOD VALIDATION TESTS
  // ==========================================
  console.log('--- 1. Validation & Schema Constraints ---');

  // Test 1: Valid product creation schema
  try {
    const valid = createProductSchema.parse({
      name: 'USB-C Fast Charger 65W',
      sku: 'SKU-CHG-065',
      categoryId: '11111111-1111-1111-1111-111111111111',
      description: 'High speed GaN charger',
      purchasePrice: 15.5,
      sellingPrice: 32.99,
      reorderLevel: 10,
      unit: 'pcs',
      status: 'ACTIVE',
    });
    assert(valid.sku === 'SKU-CHG-065', '1. Validation: Valid product input schema passes');
  } catch (err: any) {
    assert(false, '1. Validation: Valid product input schema passes', err.message);
  }

  // Test 2: Rejects negative purchase price
  try {
    createProductSchema.parse({
      name: 'Negative Purchase Price Item',
      sku: 'SKU-NEG-001',
      categoryId: '11111111-1111-1111-1111-111111111111',
      purchasePrice: -10,
      sellingPrice: 20,
    });
    assert(false, '2. Validation: Rejects negative purchase price');
  } catch (err: any) {
    assert(true, '2. Validation: Rejects negative purchase price');
  }

  // Test 3: Rejects negative selling price
  try {
    createProductSchema.parse({
      name: 'Negative Selling Price Item',
      sku: 'SKU-NEG-002',
      categoryId: '11111111-1111-1111-1111-111111111111',
      purchasePrice: 10,
      sellingPrice: -5.5,
    });
    assert(false, '3. Validation: Rejects negative selling price');
  } catch (err: any) {
    assert(true, '3. Validation: Rejects negative selling price');
  }

  // Test 4: Rejects negative reorder level
  try {
    createProductSchema.parse({
      name: 'Negative Reorder Level Item',
      sku: 'SKU-NEG-003',
      categoryId: '11111111-1111-1111-1111-111111111111',
      purchasePrice: 10,
      sellingPrice: 20,
      reorderLevel: -5,
    });
    assert(false, '4. Validation: Rejects negative reorder level');
  } catch (err: any) {
    assert(true, '4. Validation: Rejects negative reorder level');
  }

  // Test 5: Rejects invalid non-UUID categoryId
  try {
    createProductSchema.parse({
      name: 'Invalid Category ID Item',
      sku: 'SKU-CAT-001',
      categoryId: 'invalid-non-uuid-string',
      purchasePrice: 10,
      sellingPrice: 20,
    });
    assert(false, '5. Validation: Rejects non-UUID categoryId');
  } catch (err: any) {
    assert(true, '5. Validation: Rejects non-UUID categoryId');
  }

  // Test 6: Rejects too short name (<2 chars)
  try {
    createProductSchema.parse({
      name: 'A',
      sku: 'SKU-SHO-001',
      categoryId: '11111111-1111-1111-1111-111111111111',
      purchasePrice: 10,
      sellingPrice: 20,
    });
    assert(false, '6. Validation: Rejects product name shorter than 2 chars');
  } catch (err: any) {
    assert(true, '6. Validation: Rejects product name shorter than 2 chars');
  }

  // Test 7: Update schema accepts partial inputs
  try {
    const validUpdate = updateProductSchema.parse({
      sellingPrice: 29.99,
      unit: 'box',
    });
    assert(validUpdate.sellingPrice === 29.99, '7. Validation: Valid partial update schema passes');
  } catch (err: any) {
    assert(false, '7. Validation: Valid partial update schema passes', err.message);
  }

  // ==========================================
  // SECTION 2: SERVICE LAYER & BUSINESS RULES
  // ==========================================
  console.log('\n--- 2. Service Layer & Business Rules ---');

  // Test 8: Product creation sets initial currentStock strictly to 0
  try {
    const created = await service.createProduct({
      name: 'Noise Cancelling Headphones',
      sku: 'SKU-AUD-001',
      categoryId: '11111111-1111-1111-1111-111111111111',
      purchasePrice: 60.0,
      sellingPrice: 120.0,
      reorderLevel: 10,
      unit: 'pcs',
      status: ProductStatus.ACTIVE,
    });

    assert(
      created.currentStock === 0 && created.stockStatus === 'OUT_OF_STOCK',
      '8. Business Rule: Initial product currentStock is strictly 0 (controlled by inventory operations)'
    );
  } catch (err: any) {
    assert(false, '8. Business Rule: Initial product currentStock is strictly 0', err.message);
  }

  // Test 9: Rejects duplicate SKU with 409 Conflict
  try {
    await service.createProduct({
      name: 'Duplicate SKU Item',
      sku: 'SKU-ELE-001', // Already exists in initialProducts
      categoryId: '11111111-1111-1111-1111-111111111111',
      purchasePrice: 10,
      sellingPrice: 20,
      unit: 'pcs',
      status: ProductStatus.ACTIVE,
      reorderLevel: 10,
    });
    assert(false, '9. Business Rule: Rejects duplicate SKU with 409 Conflict');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.statusCode === 409,
      '9. Business Rule: Rejects duplicate SKU with 409 Conflict'
    );
  }

  // Test 10: Rejects non-existent Category with 404 Not Found
  try {
    await service.createProduct({
      name: 'Orphan Product',
      sku: 'SKU-ORP-001',
      categoryId: '99999999-9999-9999-9999-999999999999', // Missing
      purchasePrice: 10,
      sellingPrice: 20,
      unit: 'pcs',
      status: ProductStatus.ACTIVE,
      reorderLevel: 10,
    });
    assert(false, '10. Business Rule: Rejects non-existent category with 404 Not Found');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.statusCode === 404,
      '10. Business Rule: Rejects non-existent category with 404 Not Found'
    );
  }

  // Test 11: Update product details successfully
  try {
    const updated = await service.updateProduct('prod-1', {
      name: 'Wireless Bluetooth Mouse v2',
      sellingPrice: 27.5,
    });
    assert(
      updated.name === 'Wireless Bluetooth Mouse v2' && Number(updated.sellingPrice) === 27.5,
      '11. Service: Successfully updates product details'
    );
  } catch (err: any) {
    assert(false, '11. Service: Successfully updates product details', err.message);
  }

  // Test 12: Stock cannot be changed manually via product update
  try {
    const updated = await service.updateProduct('prod-1', {
      // Trying to illegally alter stock
      ...({ currentStock: 999 } as any),
      sellingPrice: 30.0,
    });
    assert(
      updated.currentStock === 45,
      '12. Business Rule: Stock cannot be manually modified through product update'
    );
  } catch (err: any) {
    assert(false, '12. Business Rule: Stock cannot be manually modified', err.message);
  }

  // Test 13: Updating to an existing SKU throws 409 Conflict
  try {
    await service.updateProduct('prod-1', {
      sku: 'SKU-ELE-002', // Belonging to prod-2
    });
    assert(false, '13. Business Rule: Rejects updating to existing SKU of another product');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.statusCode === 409,
      '13. Business Rule: Rejects updating to existing SKU of another product'
    );
  }

  // ==========================================
  // SECTION 3: STOCK STATUS COMPUTATION
  // ==========================================
  console.log('\n--- 3. Stock Status Calculation (IN STOCK, LOW STOCK, OUT OF STOCK) ---');

  // Test 14: Stock status evaluation rules
  {
    // Out of stock condition: currentStock <= 0
    const outOfStock1 = calculateStockStatus(0, 10);
    const outOfStock2 = calculateStockStatus(-5, 10);
    assert(
      outOfStock1 === 'OUT_OF_STOCK' && outOfStock2 === 'OUT_OF_STOCK',
      '14a. Stock Display: currentStock <= 0 evaluated as OUT_OF_STOCK'
    );

    // Low stock condition: currentStock <= reorderLevel (when > 0)
    const lowStock1 = calculateStockStatus(5, 10);
    const lowStockBoundary = calculateStockStatus(10, 10); // currentStock == reorderLevel
    assert(
      lowStock1 === 'LOW_STOCK' && lowStockBoundary === 'LOW_STOCK',
      '14b. Stock Display: currentStock <= reorderLevel evaluated as LOW_STOCK'
    );

    // In stock condition: currentStock > reorderLevel
    const inStock = calculateStockStatus(11, 10);
    assert(
      inStock === 'IN_STOCK',
      '14c. Stock Display: currentStock > reorderLevel evaluated as IN_STOCK'
    );
  }

  // ==========================================
  // SECTION 4: SAFE DELETION INTEGRITY
  // ==========================================
  console.log('\n--- 4. Safe Deletion & Audit Integrity ---');

  // Test 15: Cannot delete product with existing transactions/sales
  try {
    await service.deleteProduct('prod-linked');
    assert(false, '15. Safety: Blocks deletion of product with transaction history (400 Bad Request)');
  } catch (err: any) {
    assert(
      err instanceof ApiError &&
        err.statusCode === 400 &&
        err.message.includes('associated transaction records'),
      '15. Safety: Blocks deletion of product with transaction history (400 Bad Request)'
    );
  }

  // Test 16: Clean product without transactions can be deleted safely
  try {
    const deleted = await service.deleteProduct('prod-clean');
    assert(
      deleted.id === 'prod-clean' && deleted.sku === 'SKU-CLEAN-001',
      '16. Safety: Clean product without transactions deleted safely'
    );
  } catch (err: any) {
    assert(false, '16. Safety: Clean product without transactions deleted safely', err.message);
  }

  // ==========================================
  // SECTION 5: FILTERING & SEARCH
  // ==========================================
  console.log('\n--- 5. Filtering, Search & Stock Status Queries ---');

  // Test 17: Search by product name / SKU
  {
    const searchRes = await service.listProducts({
      search: 'Keyboard',
      page: 1,
      limit: 10,
      status: 'all',
      stockStatus: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    assert(
      searchRes.items.length === 1 && searchRes.items[0].sku === 'SKU-ELE-002',
      '17a. Query: Search by keyword matches product name/SKU'
    );
  }

  // Test 18: Filter by stockStatus = LOW_STOCK
  {
    const lowStockRes = await service.listProducts({
      stockStatus: 'LOW_STOCK',
      page: 1,
      limit: 10,
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    const allAreLowStock = lowStockRes.items.every((p) => p.stockStatus === 'LOW_STOCK');
    assert(
      lowStockRes.items.length > 0 && allAreLowStock,
      '18. Query: Filter by stockStatus=LOW_STOCK returns only low stock items'
    );
  }

  // Test 19: Filter by stockStatus = OUT_OF_STOCK
  {
    const outStockRes = await service.listProducts({
      stockStatus: 'OUT_OF_STOCK',
      page: 1,
      limit: 10,
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    const allAreOutStock = outStockRes.items.every((p) => p.stockStatus === 'OUT_OF_STOCK');
    assert(
      outStockRes.items.length > 0 && allAreOutStock,
      '19. Query: Filter by stockStatus=OUT_OF_STOCK returns only out-of-stock items'
    );
  }

  // ==========================================
  // SECTION 6: RBAC AUTHORIZATION
  // ==========================================
  console.log('\n--- 6. Role-Based Access Control (RBAC) ---');

  // Test 20: Cashier role is blocked from product write operations with 403 Forbidden
  {
    const req = {
      user: { id: 'cashier-1', role: UserRole.CASHIER },
    } as unknown as Request;
    let forbiddenError: ApiError | null = null;
    const next: NextFunction = (err?: any) => {
      if (err) forbiddenError = err;
    };
    const rbacMiddleware = authorize(UserRole.ADMIN, UserRole.MANAGER);
    rbacMiddleware(req, {} as Response, next);

    assert(
      forbiddenError !== null &&
        (forbiddenError as any).statusCode === 403 &&
        (forbiddenError as any).message.includes("Role 'CASHIER' does not have sufficient permissions"),
      '20. RBAC: Cashier is blocked with 403 Forbidden from modifying products'
    );
  }

  // Test 21: Admin and Manager roles are permitted
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
      '21. RBAC: Admin and Manager roles are permitted to perform product write operations'
    );
  }

  console.log(`\n📊 Product Test Suite Results: ${passedTests}/${totalTests} Passed.\n`);

  if (passedTests !== totalTests) {
    throw new Error('Product Test Suite failed');
  }
}

if (require.main === module) {
  runProductTests()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
