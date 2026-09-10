import { Product, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export type ProductWithCategory = Product & {
  category: {
    id: string;
    name: string;
    slug: string;
  };
};

export interface FindProductsOptions {
  where?: Prisma.ProductWhereInput;
  orderBy?: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[];
  skip?: number;
  take?: number;
  stockStatus?: 'all' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export class ProductRepository {
  public async findById(id: string): Promise<ProductWithCategory | null> {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  public async findBySku(sku: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { sku: sku.toUpperCase() },
    });
  }

  private async applyStockStatusFilter(
    baseWhere: Prisma.ProductWhereInput = {},
    stockStatus?: 'all' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  ): Promise<Prisma.ProductWhereInput> {
    if (!stockStatus || stockStatus === 'all') {
      return baseWhere;
    }

    if (stockStatus === 'OUT_OF_STOCK') {
      return {
        ...baseWhere,
        currentStock: { lte: 0 },
      };
    }

    if (stockStatus === 'LOW_STOCK') {
      // Products where currentStock > 0 and currentStock <= reorderLevel
      const lowStockIds = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Product" WHERE "currentStock" > 0 AND "currentStock" <= "reorderLevel"
      `;
      const ids = lowStockIds.map((row) => row.id);
      return {
        ...baseWhere,
        id: { in: ids },
      };
    }

    if (stockStatus === 'IN_STOCK') {
      // Products where currentStock > reorderLevel
      const inStockIds = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Product" WHERE "currentStock" > "reorderLevel"
      `;
      const ids = inStockIds.map((row) => row.id);
      return {
        ...baseWhere,
        id: { in: ids },
      };
    }

    return baseWhere;
  }

  public async findMany(options: FindProductsOptions = {}): Promise<ProductWithCategory[]> {
    const { orderBy, skip, take, stockStatus } = options;
    const where = await this.applyStockStatusFilter(options.where, stockStatus);

    return prisma.product.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  public async count(where?: Prisma.ProductWhereInput, stockStatus?: 'all' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'): Promise<number> {
    const resolvedWhere = await this.applyStockStatusFilter(where, stockStatus);
    return prisma.product.count({ where: resolvedWhere });
  }

  public async create(data: Prisma.ProductCreateInput): Promise<ProductWithCategory> {
    return prisma.product.create({
      data,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  public async update(
    id: string,
    data: Prisma.ProductUpdateInput
  ): Promise<ProductWithCategory> {
    return prisma.product.update({
      where: { id },
      data,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  public async delete(id: string): Promise<Product> {
    return prisma.product.delete({
      where: { id },
    });
  }

  public async hasTransactions(id: string): Promise<{
    salesCount: number;
    purchasesCount: number;
    transactionsCount: number;
  }> {
    const [salesCount, purchasesCount, transactionsCount] = await Promise.all([
      prisma.saleItem.count({ where: { productId: id } }),
      prisma.purchaseItem.count({ where: { productId: id } }),
      prisma.inventoryTransaction.count({ where: { productId: id } }),
    ]);

    return {
      salesCount,
      purchasesCount,
      transactionsCount,
    };
  }
}

export const productRepository = new ProductRepository();
