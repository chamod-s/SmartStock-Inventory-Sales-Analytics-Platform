import { Prisma, Supplier } from '@prisma/client';
import { prisma } from '../config/prisma';

export type SupplierWithPurchaseCount = Supplier & {
  _count: {
    purchases: number;
  };
};

export type SupplierWithDetails = Supplier & {
  _count: {
    purchases: number;
  };
  purchases: Array<{
    id: string;
    purchaseOrderNumber: string;
    totalAmount: Prisma.Decimal;
    status: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
    };
    items: Array<{
      id: string;
      quantity: number;
      unitCost: Prisma.Decimal;
      subtotal: Prisma.Decimal;
      product: {
        id: string;
        name: string;
        sku: string;
        unit: string;
      };
    }>;
  }>;
};

export interface FindSuppliersOptions {
  where?: Prisma.SupplierWhereInput;
  orderBy?: Prisma.SupplierOrderByWithRelationInput | Prisma.SupplierOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

export class SupplierRepository {
  public async findById(id: string, includePurchases: boolean = false): Promise<SupplierWithDetails | SupplierWithPurchaseCount | null> {
    if (includePurchases) {
      return prisma.supplier.findUnique({
        where: { id },
        include: {
          _count: {
            select: { purchases: true },
          },
          purchases: {
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      sku: true,
                      unit: true,
                    },
                  },
                },
              },
            },
          },
        },
      }) as unknown as Promise<SupplierWithDetails | null>;
    }

    return prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });
  }

  public async findByCode(code: string): Promise<Supplier | null> {
    return prisma.supplier.findUnique({
      where: { code },
    });
  }

  public async findByName(name: string): Promise<Supplier | null> {
    return prisma.supplier.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
  }

  public async findMany(options: FindSuppliersOptions = {}): Promise<SupplierWithPurchaseCount[]> {
    const { where, orderBy, skip, take } = options;
    return prisma.supplier.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });
  }

  public async count(where?: Prisma.SupplierWhereInput): Promise<number> {
    return prisma.supplier.count({ where });
  }

  public async create(data: Prisma.SupplierCreateInput): Promise<SupplierWithPurchaseCount> {
    return prisma.supplier.create({
      data,
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });
  }

  public async update(
    id: string,
    data: Prisma.SupplierUpdateInput
  ): Promise<SupplierWithPurchaseCount> {
    return prisma.supplier.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });
  }

  public async delete(id: string): Promise<Supplier> {
    return prisma.supplier.delete({
      where: { id },
    });
  }

  public async hasPurchases(id: string): Promise<number> {
    return prisma.purchase.count({
      where: { supplierId: id },
    });
  }

  public async getSupplierPurchasesSum(supplierId: string): Promise<number> {
    const agg = await prisma.purchase.aggregate({
      where: { supplierId },
      _sum: { totalAmount: true },
    });
    return agg._sum.totalAmount ? Number(agg._sum.totalAmount) : 0;
  }

  public async getPurchasesSumsBySupplierIds(supplierIds: string[]): Promise<Record<string, number>> {
    if (supplierIds.length === 0) return {};

    const purchases = await prisma.purchase.groupBy({
      by: ['supplierId'],
      where: {
        supplierId: { in: supplierIds },
      },
      _sum: {
        totalAmount: true,
      },
    });

    const result: Record<string, number> = {};
    for (const p of purchases) {
      result[p.supplierId] = p._sum.totalAmount ? Number(p._sum.totalAmount) : 0;
    }
    return result;
  }

  public async getGlobalStats(): Promise<{
    totalSuppliers: number;
    activeSuppliers: number;
    totalPurchases: number;
    totalSpend: number;
  }> {
    const [totalSuppliers, activeSuppliers, purchaseAgg] = await Promise.all([
      prisma.supplier.count(),
      prisma.supplier.count({ where: { isActive: true } }),
      prisma.purchase.aggregate({
        _count: true,
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalSuppliers,
      activeSuppliers,
      totalPurchases: purchaseAgg._count || 0,
      totalSpend: purchaseAgg._sum.totalAmount ? Number(purchaseAgg._sum.totalAmount) : 0,
    };
  }

  public async getLatestCode(): Promise<string | null> {
    const latest = await prisma.supplier.findFirst({
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    return latest?.code || null;
  }
}

export const supplierRepository = new SupplierRepository();
