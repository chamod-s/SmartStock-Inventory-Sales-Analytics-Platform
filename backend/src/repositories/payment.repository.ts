import { Prisma, PrismaClient, Payment, PaymentMethod } from '@prisma/client';
import { prisma } from '../config/prisma';

export type PaymentWithSale = Payment & {
  sale: {
    id: string;
    invoiceNumber: string;
    totalAmount: Prisma.Decimal;
    status: string;
    payments?: {
      amount: Prisma.Decimal;
    }[];
    customer: {
      id: string;
      code: string;
      name: string;
      phone: string | null;
      email: string | null;
    } | null;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  };
};

export interface PaymentSummary {
  totalPayments: number;
  totalAmount: number;
  cashTotal: number;
  cardTotal: number;
  bankTransferTotal: number;
  onlineTotal: number;
}

export interface FindPaymentsOptions {
  where?: Prisma.PaymentWhereInput;
  orderBy?: Prisma.PaymentOrderByWithRelationInput | Prisma.PaymentOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

export class PaymentRepository {
  constructor(private client: PrismaClient = prisma) {}

  public async findMany(options: FindPaymentsOptions = {}): Promise<PaymentWithSale[]> {
    const { where, orderBy, skip, take } = options;

    return this.client.payment.findMany({
      where,
      orderBy: orderBy || { paidAt: 'desc' },
      skip,
      take,
      include: {
        sale: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
            payments: {
              select: {
                amount: true,
              },
            },
            customer: {
              select: {
                id: true,
                code: true,
                name: true,
                phone: true,
                email: true,
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
        },
      },
    }) as unknown as Promise<PaymentWithSale[]>;
  }

  public async count(where?: Prisma.PaymentWhereInput): Promise<number> {
    return this.client.payment.count({ where });
  }

  public async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.client
  ): Promise<PaymentWithSale | null> {
    return tx.payment.findUnique({
      where: { id },
      include: {
        sale: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
            payments: {
              select: {
                amount: true,
              },
            },
            customer: {
              select: {
                id: true,
                code: true,
                name: true,
                phone: true,
                email: true,
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
        },
      },
    }) as unknown as Promise<PaymentWithSale | null>;
  }

  public async findBySaleId(
    saleId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.client
  ): Promise<Payment[]> {
    return tx.payment.findMany({
      where: { saleId },
      orderBy: { paidAt: 'asc' },
    });
  }

  public async create(
    data: Prisma.PaymentUncheckedCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.client
  ): Promise<Payment> {
    return tx.payment.create({
      data,
    });
  }

  public async getSummary(
    where: Prisma.PaymentWhereInput = {},
    tx: Prisma.TransactionClient | PrismaClient = this.client
  ): Promise<PaymentSummary> {
    const [
      totalPayments,
      totalAmountAgg,
      cashAgg,
      cardAgg,
      bankTransferAgg,
      onlineAgg,
    ] = await Promise.all([
      tx.payment.count({ where }),
      tx.payment.aggregate({
        where,
        _sum: { amount: true },
      }),
      tx.payment.aggregate({
        where: { ...where, paymentMethod: PaymentMethod.CASH },
        _sum: { amount: true },
      }),
      tx.payment.aggregate({
        where: { ...where, paymentMethod: PaymentMethod.CARD },
        _sum: { amount: true },
      }),
      tx.payment.aggregate({
        where: { ...where, paymentMethod: PaymentMethod.BANK_TRANSFER },
        _sum: { amount: true },
      }),
      tx.payment.aggregate({
        where: { ...where, paymentMethod: PaymentMethod.ONLINE },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalPayments,
      totalAmount: Number(totalAmountAgg._sum.amount || 0),
      cashTotal: Number(cashAgg._sum.amount || 0),
      cardTotal: Number(cardAgg._sum.amount || 0),
      bankTransferTotal: Number(bankTransferAgg._sum.amount || 0),
      onlineTotal: Number(onlineAgg._sum.amount || 0),
    };
  }
}

export const paymentRepository = new PaymentRepository();
