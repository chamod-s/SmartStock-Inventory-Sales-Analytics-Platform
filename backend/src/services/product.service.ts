import { Prisma, ProductStatus } from '@prisma/client';
import {
  ProductRepository,
  productRepository as defaultProductRepo,
  ProductWithCategory,
} from '../repositories/product.repository';
import {
  CategoryRepository,
  categoryRepository as defaultCategoryRepo,
} from '../repositories/category.repository';
import {
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
  createProductSchema,
  updateProductSchema,
} from '../validators/product.validator';
import { ApiError } from '../utils/apiError';
import { IPaginatedData } from '../types';

export type StockStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';

export function calculateStockStatus(currentStock: number, reorderLevel: number): StockStatus {
  if (currentStock <= 0) return 'OUT_OF_STOCK';
  if (currentStock <= reorderLevel) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export type ProductResponse = ProductWithCategory & {
  stockStatus: StockStatus;
};

export class ProductService {
  constructor(
    private productRepo: ProductRepository = defaultProductRepo,
    private categoryRepo: CategoryRepository = defaultCategoryRepo
  ) {}

  public async listProducts(
    query: ProductQueryInput
  ): Promise<IPaginatedData<ProductResponse>> {
    const {
      page = 1,
      limit = 10,
      search,
      sku,
      categoryId,
      status = 'all',
      stockStatus = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ProductWhereInput = {};

    // 1. Multi-field search
    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    // 2. SKU exact/partial filter
    if (sku && sku.trim().length > 0) {
      where.sku = { contains: sku.trim().toUpperCase(), mode: 'insensitive' };
    }

    // 3. Category filter
    if (categoryId && categoryId.trim().length > 0) {
      where.categoryId = categoryId.trim();
    }

    // 4. Status filter
    if (status !== 'all') {
      where.status = status as ProductStatus;
    }

    // 5. Sorting
    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const skip = (page - 1) * limit;
    const take = limit;

    const [rawItems, totalItems] = await Promise.all([
      this.productRepo.findMany({ where, orderBy, skip, take, stockStatus }),
      this.productRepo.count(where, stockStatus),
    ]);

    const items: ProductResponse[] = rawItems.map((item) => ({
      ...item,
      stockStatus: calculateStockStatus(item.currentStock, item.reorderLevel),
    }));

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  public async getProductById(id: string): Promise<ProductResponse> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw ApiError.notFound(`Product with ID '${id}' was not found`);
    }

    return {
      ...product,
      stockStatus: calculateStockStatus(product.currentStock, product.reorderLevel),
    };
  }

  public async createProduct(input: CreateProductInput): Promise<ProductResponse> {
    const validated = createProductSchema.parse(input);

    // 1. Validate Category Exists
    const category = await this.categoryRepo.findById(validated.categoryId);
    if (!category) {
      throw ApiError.notFound(`Category with ID '${validated.categoryId}' was not found`);
    }

    // 2. Validate SKU Uniqueness
    const normalizedSku = validated.sku.trim().toUpperCase();
    const existingSku = await this.productRepo.findBySku(normalizedSku);
    if (existingSku) {
      throw ApiError.conflict(`Product with SKU '${normalizedSku}' already exists`);
    }

    // 3. Validate Prices & Reorder Level
    if (validated.purchasePrice < 0) {
      throw ApiError.badRequest('Purchase price cannot be negative');
    }
    if (validated.sellingPrice < 0) {
      throw ApiError.badRequest('Selling price cannot be negative');
    }
    if (validated.reorderLevel !== undefined && validated.reorderLevel < 0) {
      throw ApiError.badRequest('Reorder level cannot be negative');
    }

    // 4. Initial currentStock is strictly 0 (controlled by inventory operations only)
    const product = await this.productRepo.create({
      name: validated.name.trim(),
      sku: normalizedSku,
      description: validated.description ?? null,
      purchasePrice: new Prisma.Decimal(validated.purchasePrice),
      sellingPrice: new Prisma.Decimal(validated.sellingPrice),
      currentStock: 0,
      reorderLevel: validated.reorderLevel ?? 10,
      unit: validated.unit?.trim() || 'pcs',
      status: validated.status || ProductStatus.ACTIVE,
      category: {
        connect: { id: validated.categoryId },
      },
    });

    return {
      ...product,
      stockStatus: calculateStockStatus(product.currentStock, product.reorderLevel),
    };
  }

  public async updateProduct(id: string, input: UpdateProductInput): Promise<ProductResponse> {
    const validated = updateProductSchema.parse(input);

    const existing = await this.productRepo.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Product with ID '${id}' was not found`);
    }

    // 1. Validate SKU Uniqueness if updating SKU
    if (validated.sku !== undefined) {
      const normalizedSku = validated.sku.trim().toUpperCase();
      if (normalizedSku !== existing.sku) {
        const duplicateSku = await this.productRepo.findBySku(normalizedSku);
        if (duplicateSku && duplicateSku.id !== id) {
          throw ApiError.conflict(`Product with SKU '${normalizedSku}' already exists`);
        }
      }
    }

    // 2. Validate Category Exists if updating Category
    if (validated.categoryId !== undefined && validated.categoryId !== existing.categoryId) {
      const cat = await this.categoryRepo.findById(validated.categoryId);
      if (!cat) {
        throw ApiError.notFound(`Category with ID '${validated.categoryId}' was not found`);
      }
    }

    // 3. Validate Price constraints
    if (validated.purchasePrice !== undefined && validated.purchasePrice < 0) {
      throw ApiError.badRequest('Purchase price cannot be negative');
    }
    if (validated.sellingPrice !== undefined && validated.sellingPrice < 0) {
      throw ApiError.badRequest('Selling price cannot be negative');
    }
    if (validated.reorderLevel !== undefined && validated.reorderLevel < 0) {
      throw ApiError.badRequest('Reorder level cannot be negative');
    }

    // 4. Stock cannot be manually changed through normal product editing
    // Construct update data strictly from validated fields
    const updateData: Prisma.ProductUpdateInput = {};

    if (validated.name !== undefined) updateData.name = validated.name.trim();
    if (validated.sku !== undefined) updateData.sku = validated.sku.trim().toUpperCase();
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.purchasePrice !== undefined) {
      updateData.purchasePrice = new Prisma.Decimal(validated.purchasePrice);
    }
    if (validated.sellingPrice !== undefined) {
      updateData.sellingPrice = new Prisma.Decimal(validated.sellingPrice);
    }
    if (validated.reorderLevel !== undefined) updateData.reorderLevel = validated.reorderLevel;
    if (validated.unit !== undefined) updateData.unit = validated.unit.trim();
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.categoryId !== undefined) {
      updateData.category = { connect: { id: validated.categoryId } };
    }

    const updated = await this.productRepo.update(id, updateData);

    return {
      ...updated,
      stockStatus: calculateStockStatus(updated.currentStock, updated.reorderLevel),
    };
  }

  public async deleteProduct(id: string): Promise<{ id: string; name: string; sku: string }> {
    const existing = await this.productRepo.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Product with ID '${id}' was not found`);
    }

    // Transaction & audit protection check
    const transactions = await this.productRepo.hasTransactions(id);
    const totalLinked =
      transactions.salesCount + transactions.purchasesCount + transactions.transactionsCount;

    if (totalLinked > 0) {
      throw ApiError.badRequest(
        `Cannot delete product '${existing.name}' (SKU: ${existing.sku}) because it has associated transaction records (${transactions.salesCount} sale item(s), ${transactions.purchasesCount} purchase item(s), ${transactions.transactionsCount} inventory movement(s)). Please archive the product by setting its status to DISCONTINUED or INACTIVE instead.`
      );
    }

    await this.productRepo.delete(id);
    return { id: existing.id, name: existing.name, sku: existing.sku };
  }
}

export const productService = new ProductService();
