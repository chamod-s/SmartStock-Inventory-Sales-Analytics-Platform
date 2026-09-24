import { Prisma, PrismaClient, Sale, SaleStatus } from '@prisma/client';
import { prisma } from '../config/prisma';

export type SaleWithRelations = Sale & {
  customer: {
    id: string;
    code: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    subtotal: Prisma.Decimal;
    product: {
      id: string;
      name: string;
      sku: string;
      unit: string;
    };
  }>;
  payments: Array<{
    id: string;
    amount: Prisma.Decimal;
    paymentMethod: string;
    transactionRef: string | null;
    paidAt: Date;
  }>;
  _count?: {
    items: number;
  };
};

export type SaleWithDetails = SaleWithRelations & {
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    subtotal: Prisma.Decimal;
    product: {
      id: string;
      name: string;
      sku: string;
      unit: string;
      category?: {
        id: string;
        name: string;
        slug: string;
      };
    };
  }>;
};

export interface SaleSummary {
  totalSales: number;
  totalRevenue: number;
  completedCount: number;
  refundedCount: number;
  cancelledCount: number;
}

export interface FindSalesOptions {
  where?: Prisma.SaleWhereInput;
  orderBy?: Prisma.SaleOrderByWithRelationInput | Prisma.SaleOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

export class SaleRepository {
  constructor(private client: PrismaClient = prisma) {}

  public async findMany(options: FindSalesOptions = {}): Promise<SaleWithRelations[]> {
    const { where, orderBy, skip, take } = options;

    return this.client.sale.findMany({
      where,
      orderBy: orderBy || { createdAt: 'desc' },
      skip,
      take,
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            name: true,
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
              },
            },
          },
        },
        payments: true,
      },
    }) as unknown as Promise<SaleWithRelations[]>;
  }

  public async count(where?: Prisma.SaleWhereInput): Promise<number> {
    return this.client.sale.count({ where });
  }

  public async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.client
  ): Promise<SaleWithDetails | null> {
    return tx.sale.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            name: true,
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
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
        payments: true,
      },
    }) as unknown as Promise<SaleWithDetails | null>;
  }

  public async findByInvoiceNumber(
    invoiceNumber: string,
    tx: Prisma.TransactionClient | PrismaClient = this.client
  ): Promise<SaleWithDetails | null> {
    return tx.sale.findUnique({
      where: { invoiceNumber },
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            name: true,
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
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
        payments: true,
      },
    }) as unknown as Promise<SaleWithDetails | null>;
  }

  public async getSummary(
    where: Prisma.SaleWhereInput = {},
    tx: Prisma.TransactionClient | PrismaClient = this.client
  ): Promise<SaleSummary> {
    const [totalSales, totalRevenueAgg, completedCount, refundedCount, cancelledCount] =
      await Promise.all([
        tx.sale.count({ where }),
        tx.sale.aggregate({
          where: { ...where, status: SaleStatus.COMPLETED },
          _sum: { totalAmount: true },
        }),
        tx.sale.count({
          where: { ...where, status: SaleStatus.COMPLETED },
        }),
        tx.sale.count({
          where: { ...where, status: SaleStatus.REFUNDED },
        }),
        tx.sale.count({
          where: { ...where, status: SaleStatus.CANCELLED },
        }),
      ]);

    return {
      totalSales,
      totalRevenue: Number(totalRevenueAgg._sum.totalAmount || 0),
      completedCount,
      refundedCount,
      cancelledCount,
    };
  }

  public async generateInvoiceNumber(
    tx: Prisma.TransactionClient | PrismaClient = this.client
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const lastSale = await tx.sale.findFirst({
      where: {
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let sequence = 1;
    if (lastSale?.invoiceNumber) {
      const parts = lastSale.invoiceNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(5, '0')}`;
  }
}

export const saleRepository = new SaleRepository();
