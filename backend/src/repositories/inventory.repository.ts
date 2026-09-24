import { Prisma, PrismaClient, TransactionType } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface InventoryItemWithDetails {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  purchasePrice: Prisma.Decimal | number;
  sellingPrice: Prisma.Decimal | number;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface InventoryTransactionWithRelations {
  id: string;
  productId: string;
  userId: string | null;
  type: TransactionType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  referenceId: string | null;
  notes: string | null;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    purchasePrice: Prisma.Decimal | number;
    sellingPrice: Prisma.Decimal | number;
    category?: {
      id: string;
      name: string;
      slug: string;
    };
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export interface InventorySummary {
  totalProducts: number;
  totalStockUnits: number;
  totalValuation: number;
  totalRetailValuation: number;
  potentialProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
}

export interface FindInventoryOptions {
  where?: Prisma.ProductWhereInput;
  orderBy?: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[];
  skip?: number;
  take?: number;
  stockStatus?: 'all' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface FindTransactionsOptions {
  where?: Prisma.InventoryTransactionWhereInput;
  orderBy?: Prisma.InventoryTransactionOrderByWithRelationInput | Prisma.InventoryTransactionOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

export class InventoryRepository {
  constructor(private client: PrismaClient = prisma) {}

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
      if (this.client.$queryRaw) {
        try {
          const lowStockIds = await this.client.$queryRaw<{ id: string }[]>`
            SELECT id FROM "Product" WHERE "currentStock" > 0 AND "currentStock" <= "reorderLevel"
          `;
          return {
            ...baseWhere,
            id: { in: lowStockIds.map((row) => row.id) },
          };
        } catch {
          // Fallback if queryRaw is unavailable (e.g., custom mocks)
        }
      }
      return baseWhere;
    }

    if (stockStatus === 'IN_STOCK') {
      if (this.client.$queryRaw) {
        try {
          const inStockIds = await this.client.$queryRaw<{ id: string }[]>`
            SELECT id FROM "Product" WHERE "currentStock" > "reorderLevel"
          `;
          return {
            ...baseWhere,
            id: { in: inStockIds.map((row) => row.id) },
          };
        } catch {
          // Fallback
        }
      }
      return baseWhere;
    }

    return baseWhere;
  }

  public async findProducts(options: FindInventoryOptions = {}): Promise<InventoryItemWithDetails[]> {
    const { orderBy, skip, take, stockStatus } = options;
    const where = await this.applyStockStatusFilter(options.where, stockStatus);

    return this.client.product.findMany({
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
    }) as unknown as Promise<InventoryItemWithDetails[]>;
  }

  public async countProducts(
    where?: Prisma.ProductWhereInput,
    stockStatus?: 'all' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  ): Promise<number> {
    const resolvedWhere = await this.applyStockStatusFilter(where, stockStatus);
    return this.client.product.count({ where: resolvedWhere });
  }

  public async findTransactions(
    options: FindTransactionsOptions = {}
  ): Promise<InventoryTransactionWithRelations[]> {
    const { where, orderBy, skip, take } = options;

    return this.client.inventoryTransaction.findMany({
      where,
      orderBy: orderBy || { createdAt: 'desc' },
      skip,
      take,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            purchasePrice: true,
            sellingPrice: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }) as unknown as Promise<InventoryTransactionWithRelations[]>;
  }

  public async countTransactions(where?: Prisma.InventoryTransactionWhereInput): Promise<number> {
    return this.client.inventoryTransaction.count({ where });
  }

  public async getSummary(): Promise<InventorySummary> {
    if (this.client.$queryRaw) {
      try {
        const rawResults = await this.client.$queryRaw<
          {
            totalProducts: number;
            totalStockUnits: number;
            totalValuation: string | number;
            totalRetailValuation: string | number;
            lowStockCount: number;
            outOfStockCount: number;
            inStockCount: number;
          }[]
        >`
          SELECT 
            COUNT(*)::int as "totalProducts",
            COALESCE(SUM("currentStock"), 0)::int as "totalStockUnits",
            COALESCE(SUM("currentStock" * "purchasePrice"), 0)::numeric as "totalValuation",
            COALESCE(SUM("currentStock" * "sellingPrice"), 0)::numeric as "totalRetailValuation",
            COALESCE(SUM(CASE WHEN "currentStock" <= 0 THEN 1 ELSE 0 END), 0)::int as "outOfStockCount",
            COALESCE(SUM(CASE WHEN "currentStock" > 0 AND "currentStock" <= "reorderLevel" THEN 1 ELSE 0 END), 0)::int as "lowStockCount",
            COALESCE(SUM(CASE WHEN "currentStock" > "reorderLevel" THEN 1 ELSE 0 END), 0)::int as "inStockCount"
          FROM "Product"
        `;

        if (rawResults && rawResults.length > 0) {
          const row = rawResults[0];
          const totalValuation = Number(Number(row.totalValuation || 0).toFixed(2));
          const totalRetailValuation = Number(Number(row.totalRetailValuation || 0).toFixed(2));
          const potentialProfit = Number((totalRetailValuation - totalValuation).toFixed(2));

          return {
            totalProducts: Number(row.totalProducts || 0),
            totalStockUnits: Number(row.totalStockUnits || 0),
            totalValuation,
            totalRetailValuation,
            potentialProfit,
            lowStockCount: Number(row.lowStockCount || 0),
            outOfStockCount: Number(row.outOfStockCount || 0),
            inStockCount: Number(row.inStockCount || 0),
          };
        }
      } catch {
        // Fallback to JS aggregation below
      }
    }

    // In-memory or fallback aggregation
    const products = await this.client.product.findMany();
    let totalStockUnits = 0;
    let totalValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inStockCount = 0;

    for (const p of products) {
      const stock = p.currentStock || 0;
      const pPrice = Number(p.purchasePrice || 0);
      const sPrice = Number(p.sellingPrice || 0);

      totalStockUnits += stock;
      totalValuation += stock * pPrice;
      totalRetailValuation += stock * sPrice;

      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= p.reorderLevel) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
    }

    totalValuation = Number(totalValuation.toFixed(2));
    totalRetailValuation = Number(totalRetailValuation.toFixed(2));

    return {
      totalProducts: products.length,
      totalStockUnits,
      totalValuation,
      totalRetailValuation,
      potentialProfit: Number((totalRetailValuation - totalValuation).toFixed(2)),
      lowStockCount,
      outOfStockCount,
      inStockCount,
    };
  }

  public async getLowStockProducts(limit: number = 50): Promise<InventoryItemWithDetails[]> {
    if (this.client.$queryRaw) {
      try {
        const rows = await this.client.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Product" 
          WHERE "currentStock" <= "reorderLevel"
          ORDER BY ("currentStock"::float / GREATEST("reorderLevel", 1)) ASC, "currentStock" ASC
          LIMIT ${limit}
        `;
        const ids = rows.map((r) => r.id);
        if (ids.length > 0) {
          const products = await this.client.product.findMany({
            where: { id: { in: ids } },
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
          // Preserve queryRaw order
          const idMap = new Map(products.map((p) => [p.id, p]));
          return ids.map((id) => idMap.get(id)!).filter(Boolean) as unknown as InventoryItemWithDetails[];
        }
        return [];
      } catch {
        // Fallback
      }
    }

    const all = await this.client.product.findMany({
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

    return all
      .filter((p) => p.currentStock <= p.reorderLevel)
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, limit) as unknown as InventoryItemWithDetails[];
  }
}

export const inventoryRepository = new InventoryRepository();
