import { UserRole } from '@prisma/client';
import { CategoryService } from '../services/category.service';
import {
  CategoryRepository,
  CategoryWithProductCount,
} from '../repositories/category.repository';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validators/category.validator';
import { authorize } from '../middleware/auth.middleware';
import { ApiError } from '../utils/apiError';
import { Request, Response, NextFunction } from 'express';

// In-Memory Mock Repository for Isolated Unit Testing
class MockCategoryRepository extends CategoryRepository {
  private categories: CategoryWithProductCount[] = [];

  constructor(initialData: CategoryWithProductCount[] = []) {
    super();
    this.categories = [...initialData];
  }

  public async findById(id: string): Promise<CategoryWithProductCount | null> {
    const cat = this.categories.find((c) => c.id === id);
    return cat ? JSON.parse(JSON.stringify(cat)) : null;
  }

  public async findBySlug(slug: string): Promise<CategoryWithProductCount | null> {
    const cat = this.categories.find((c) => c.slug === slug);
    return cat ? JSON.parse(JSON.stringify(cat)) : null;
  }

  public async findByName(name: string): Promise<CategoryWithProductCount | null> {
    const cat = this.categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    return cat ? JSON.parse(JSON.stringify(cat)) : null;
  }

  public async findMany(options: any = {}): Promise<CategoryWithProductCount[]> {
    let result = [...this.categories];

    if (options.where?.isActive !== undefined) {
      result = result.filter((c) => c.isActive === options.where.isActive);
    }

    if (options.where?.OR) {
      const term = options.where.OR[0]?.name?.contains?.toLowerCase() || '';
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.slug.toLowerCase().includes(term) ||
          (c.description && c.description.toLowerCase().includes(term))
      );
    }

    const skip = options.skip || 0;
    const take = options.take || result.length;
    return result.slice(skip, skip + take);
  }

  public async count(where: any = {}): Promise<number> {
    let result = [...this.categories];
    if (where?.isActive !== undefined) {
      result = result.filter((c) => c.isActive === where.isActive);
    }
    return result.length;
  }

  public async create(data: any): Promise<CategoryWithProductCount> {
    const newCategory: CategoryWithProductCount = {
      id: `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { products: 0 },
    };
    this.categories.push(newCategory);
    return newCategory;
  }

  public async update(id: string, data: any): Promise<CategoryWithProductCount> {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Not found');

    const updated = {
      ...this.categories[index],
      ...data,
      updatedAt: new Date(),
    };
    this.categories[index] = updated;
    return updated;
  }

  public async delete(id: string): Promise<any> {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Not found');
    const [deleted] = this.categories.splice(index, 1);
    return deleted;
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

export async function runCategoryTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 Starting SmartStock Category Test Suite');
  console.log('🧪 ===============================================\n');

  const initialCategories: CategoryWithProductCount[] = [
    {
      id: 'cat-1',
      name: 'Electronics & Gadgets',
      slug: 'electronics-gadgets',
      description: 'Consumer electronics',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { products: 15 }, // Has linked products!
    },
    {
      id: 'cat-2',
      name: 'Empty Category',
      slug: 'empty-category',
      description: 'Zero products category for safe delete testing',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { products: 0 }, // 0 linked products
    },
    {
      id: 'cat-3',
      name: 'Discontinued Items',
      slug: 'discontinued-items',
      description: 'Old inventory',
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { products: 2 },
    },
  ];

  const mockRepo = new MockCategoryRepository(initialCategories);
  const service = new CategoryService(mockRepo);

  // Test 1: Zod Validation - Success with valid input
  try {
    const valid = createCategorySchema.parse({
      name: 'Industrial Hardware',
      slug: 'industrial-hardware',
      description: 'Heavy machinery and nuts/bolts',
      isActive: true,
    });
    assert(valid.name === 'Industrial Hardware', '1. Validation: Valid category schema passes');
  } catch (err: any) {
    assert(false, '1. Validation: Valid category schema passes', err.message);
  }

  // Test 2: Zod Validation - Rejection on invalid inputs
  try {
    createCategorySchema.parse({ name: 'A' }); // Too short
    assert(false, '2. Validation: Rejects too short name (<2 chars)');
  } catch (err: any) {
    assert(true, '2. Validation: Rejects too short name (<2 chars)');
  }

  try {
    createCategorySchema.parse({ name: 'Valid Name', slug: 'Invalid Slug with Spaces!' });
    assert(false, '3. Validation: Rejects malformed slug with spaces');
  } catch (err: any) {
    assert(true, '3. Validation: Rejects malformed slug with spaces');
  }

  // Test 3b: Update category schema parsing
  try {
    const updatedValid = updateCategorySchema.parse({
      description: 'Updated category description',
      isActive: false,
    });
    assert(updatedValid.isActive === false, '3b. Validation: Valid update category schema passes');
  } catch (err: any) {
    assert(false, '3b. Validation: Valid update category schema passes', err.message);
  }
  // Test 4: Create Category with auto-slug generation
  try {
    const created = await service.createCategory({
      name: 'Smart Home & Audio',
    });
    assert(
      created.slug === 'smart-home-audio' && created.isActive === true,
      '4. Service: Auto-slugifies category name when slug is omitted'
    );
  } catch (err: any) {
    assert(false, '4. Service: Auto-slugifies category name', err.message);
  }

  // Test 5: Conflict check on duplicate name
  try {
    await service.createCategory({
      name: 'Electronics & Gadgets', // Already exists in initialData
    });
    assert(false, '5. Service: Conflict error on duplicate category name');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.statusCode === 409,
      '5. Service: Conflict error (409) on duplicate category name'
    );
  }

  // Test 6: Deactivate category (Toggle isActive)
  try {
    const updated = await service.updateCategory('cat-1', {
      isActive: false,
    });
    assert(
      updated.isActive === false,
      '6. Service: Category deactivation sets isActive to false'
    );
  } catch (err: any) {
    assert(false, '6. Service: Category deactivation', err.message);
  }

  // Test 7: Prevent UNSAFE DELETION when products are attached (CRITICAL SAFETY BARRIER)
  try {
    await service.deleteCategory('cat-1'); // cat-1 has 15 products!
    assert(false, '7. Safety Barrier: Blocks deletion of category with attached products');
  } catch (err: any) {
    assert(
      err instanceof ApiError &&
        err.statusCode === 400 &&
        err.message.includes('associated product(s)'),
      '7. Safety Barrier: Blocks deletion (400) when products are attached to category'
    );
  }

  // Test 8: Allow SAFE DELETION when product count is 0
  try {
    const deleted = await service.deleteCategory('cat-2'); // cat-2 has 0 products
    const lookup = await mockRepo.findById('cat-2');
    assert(
      deleted.id === 'cat-2' && lookup === null,
      '8. Service: Safely deletes category when product count is 0'
    );
  } catch (err: any) {
    assert(false, '8. Service: Safely deletes empty category', err.message);
  }

  // Test 9: Pagination and Active Status Filtering
  try {
    const listResult = await service.listCategories({
      page: 1,
      limit: 2,
      status: 'active',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    assert(
      listResult.pagination.limit === 2 &&
        listResult.items.every((c) => c.isActive === true),
      '9. Service: Correctly filters by active status and applies pagination'
    );
  } catch (err: any) {
    assert(false, '9. Service: Pagination and Status Filtering', err.message);
  }

  // Test 10: Role-Based Access Control (RBAC) Middleware
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
      '10. RBAC: Cashier is blocked with 403 from category modification operations'
    );
  }

  // Test 11: RBAC Middleware allows Admin & Manager
  {
    const req = {
      user: { id: 'admin-1', role: UserRole.ADMIN },
    } as unknown as Request;
    let nextCalledWithoutError = false;
    const next: NextFunction = (err?: any) => {
      if (!err) nextCalledWithoutError = true;
    };
    const rbacMiddleware = authorize(UserRole.ADMIN, UserRole.MANAGER);
    rbacMiddleware(req, {} as Response, next);

    assert(
      nextCalledWithoutError,
      '11. RBAC: Admin and Manager are permitted to perform category operations'
    );
  }

  console.log(`\n📊 Category Test Suite Results: ${passedTests}/${totalTests} Passed.\n`);

  if (passedTests !== totalTests) {
    throw new Error('Category Test Suite failed');
  }
}

if (require.main === module) {
  runCategoryTests()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
