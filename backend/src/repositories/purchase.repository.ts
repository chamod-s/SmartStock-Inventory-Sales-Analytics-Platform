import { Prisma, Purchase, PurchaseStatus, PurchaseItem, InventoryTransaction } from '@prisma/client';
import { prisma } from '../config/prisma';

export type PurchaseWithRelations = Purchase & {
  supplier: {
    id: string;
    code: string;
    name: string;
    contactPerson: string | null;
    email: string | null;
    phone: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  items: Array<
    PurchaseItem & {
      product: {
        id: string;
        name: string;
        sku: string;
        unit: string;
        currentStock: number;
        purchasePrice: Prisma.Decimal;
        sellingPrice: Prisma.Decimal;
      };
    }
  >;
  _count?: {
    items: number;
  };
};

export type PurchaseWithDetails = PurchaseWithRelations & {
  inventoryTransactions?: InventoryTransaction[];
};

export interface FindPurchasesOptions {
  where?: Prisma.PurchaseWhereInput;
  orderBy?: Prisma.PurchaseOrderByWithRelationInput | Prisma.PurchaseOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

export interface PurchaseSummary {
  totalPurchases: number;
  totalSpend: number;
  receivedCount: number;
  pendingCount: number;
  cancelledCount: number;
}

export class PurchaseRepository {
  public async findById(
    id: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<PurchaseWithDetails | null> {
    const purchase = await tx.purchase.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
            contactPerson: true,
            email: true,
            phone: true,
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
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                currentStock: true,
                purchasePrice: true,
                sellingPrice: true,
              },
            },
          },
        },
      },
    });

    if (!purchase) return null;

    // Fetch related inventory transactions created for this purchase
    const inventoryTransactions = await tx.inventoryTransaction.findMany({
      where: { referenceId: purchase.id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      ...purchase,
      inventoryTransactions,
    };
  }

  public async findByPoNumber(
    purchaseOrderNumber: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<Purchase | null> {
    return tx.purchase.findUnique({
      where: { purchaseOrderNumber },
    });
  }

  public async findMany(
    options: FindPurchasesOptions = {},
    tx: Prisma.TransactionClient = prisma
  ): Promise<PurchaseWithRelations[]> {
    return tx.purchase.findMany({
      where: options.where,
      orderBy: options.orderBy || { createdAt: 'desc' },
      skip: options.skip,
      take: options.take,
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
            contactPerson: true,
            email: true,
            phone: true,
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
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                currentStock: true,
                purchasePrice: true,
                sellingPrice: true,
              },
            },
          },
        },
        _count: {
          select: { items: true },
        },
      },
    });
  }

  public async count(
    where?: Prisma.PurchaseWhereInput,
    tx: Prisma.TransactionClient = prisma
  ): Promise<number> {
    return tx.purchase.count({ where });
  }

  public async getSummary(
    where?: Prisma.PurchaseWhereInput,
    tx: Prisma.TransactionClient = prisma
  ): Promise<PurchaseSummary> {
    const [totalPurchases, totalSpendAgg, receivedCount, pendingCount, cancelledCount] =
      await Promise.all([
        tx.purchase.count({ where }),
        tx.purchase.aggregate({
          where,
          _sum: { totalAmount: true },
        }),
        tx.purchase.count({
          where: { ...where, status: PurchaseStatus.RECEIVED },
        }),
        tx.purchase.count({
          where: { ...where, status: PurchaseStatus.PENDING },
        }),
        tx.purchase.count({
          where: { ...where, status: PurchaseStatus.CANCELLED },
        }),
      ]);

    return {
      totalPurchases,
      totalSpend: Number(totalSpendAgg._sum.totalAmount || 0),
      receivedCount,
      pendingCount,
      cancelledCount,
    };
  }

  public async generatePoNumber(tx: Prisma.TransactionClient = prisma): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;
    const lastPurchase = await tx.purchase.findFirst({
      where: {
        purchaseOrderNumber: { startsWith: prefix },
      },
      orderBy: { purchaseOrderNumber: 'desc' },
      select: { purchaseOrderNumber: true },
    });

    let sequence = 1;
    if (lastPurchase?.purchaseOrderNumber) {
      const parts = lastPurchase.purchaseOrderNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }
}

export const purchaseRepository = new PurchaseRepository();
