import { Prisma, PrismaClient, PaymentMethod, Payment } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  PaymentRepository,
  paymentRepository as defaultPaymentRepo,
  PaymentWithSale,
  PaymentSummary,
} from '../repositories/payment.repository';
import {
  CreatePaymentInput,
  PaymentQueryInput,
  createPaymentSchema,
  paymentQuerySchema,
} from '../validators/payment.validator';
import { ApiError } from '../utils/apiError';
import { IPaginatedData } from '../types';

export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';

export interface FormattedPaymentItem extends PaymentWithSale {
  paymentStatus: PaymentStatus;
  balanceRemaining: number;
  totalPaid: number;
}

export interface PaymentListResult extends IPaginatedData<FormattedPaymentItem> {
  summary: PaymentSummary;
}

export interface RecordPaymentResult {
  payment: Payment;
  saleId: string;
  invoiceNumber: string;
  totalAmount: number;
  amountPaid: number;
  totalPaid: number;
  balanceRemaining: number;
  paymentStatus: PaymentStatus;
}

export class PaymentService {
  constructor(
    private prismaClient: PrismaClient = prisma,
    private paymentRepo: PaymentRepository = defaultPaymentRepo
  ) {}

  public static calculatePaymentStatus(totalAmount: number, totalPaid: number): PaymentStatus {
    if (totalPaid >= totalAmount - 0.001) return 'PAID';
    if (totalPaid > 0) return 'PARTIALLY_PAID';
    return 'UNPAID';
  }

  /**
   * Record a payment towards a sale.
   * Can run standalone or within an existing Prisma transaction (e.g. during POS checkout).
   */
  public async recordPayment(
    rawInput: CreatePaymentInput,
    tx?: Prisma.TransactionClient
  ): Promise<RecordPaymentResult> {
    const input = createPaymentSchema.parse(rawInput);
    const amount = Number(input.amount);

    if (amount <= 0) {
      throw ApiError.badRequest('Payment amount must be greater than zero');
    }

    const executeOperation = async (client: Prisma.TransactionClient) => {
      // 1. Validate that the sale exists
      const sale = await client.sale.findUnique({
        where: { id: input.saleId },
        include: {
          payments: true,
          customer: true,
        },
      });

      if (!sale) {
        throw ApiError.notFound(`Sale with ID '${input.saleId}' was not found`);
      }

      // 2. Validate sale status
      if (sale.status === 'CANCELLED' || sale.status === 'REFUNDED') {
        throw ApiError.badRequest(
          `Cannot record payment for a ${sale.status.toLowerCase()} sale order (${sale.invoiceNumber})`
        );
      }

      // 3. Validate payment business rules against sale balance
      const saleTotal = Number(sale.totalAmount);
      const existingPaymentsTotal = sale.payments.reduce(
        (acc, p) => acc + Number(p.amount),
        0
      );
      const balanceRemainingBefore = Math.max(0, Number((saleTotal - existingPaymentsTotal).toFixed(2)));

      if (balanceRemainingBefore <= 0.001) {
        throw ApiError.badRequest(
          `Sale ${sale.invoiceNumber} is already fully paid ($${existingPaymentsTotal.toFixed(2)} of $${saleTotal.toFixed(2)} paid). No remaining balance.`
        );
      }

      if (amount > balanceRemainingBefore + 0.001) {
        throw ApiError.badRequest(
          `Payment amount of $${amount.toFixed(2)} exceeds the remaining unpaid balance of $${balanceRemainingBefore.toFixed(2)} for invoice ${sale.invoiceNumber}`
        );
      }

      // 4. Create the Payment record
      const payment = await this.paymentRepo.create(
        {
          saleId: sale.id,
          amount: new Prisma.Decimal(amount.toFixed(2)),
          paymentMethod: input.paymentMethod,
          transactionRef: input.transactionRef?.trim() || null,
          paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
        },
        client
      );

      // 5. Update customer totalSpent if customer attached
      if (sale.customerId) {
        await client.customer.update({
          where: { id: sale.customerId },
          data: {
            totalSpent: {
              increment: new Prisma.Decimal(amount.toFixed(2)),
            },
          },
        });
      }

      const newTotalPaid = Number((existingPaymentsTotal + amount).toFixed(2));
      const newBalanceRemaining = Math.max(0, Number((saleTotal - newTotalPaid).toFixed(2)));
      const paymentStatus = PaymentService.calculatePaymentStatus(saleTotal, newTotalPaid);

      return {
        payment,
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        totalAmount: saleTotal,
        amountPaid: amount,
        totalPaid: newTotalPaid,
        balanceRemaining: newBalanceRemaining,
        paymentStatus,
      };
    };

    if (tx) {
      return await executeOperation(tx);
    } else {
      return await this.prismaClient.$transaction(
        async (newTx) => {
          return await executeOperation(newTx);
        },
        { timeout: 10000 }
      );
    }
  }

  public async getPaymentById(id: string): Promise<FormattedPaymentItem> {
    const payment = await this.paymentRepo.findById(id);
    if (!payment) {
      throw ApiError.notFound(`Payment record with ID '${id}' was not found`);
    }

    // Get all payments for this sale to calculate context
    const salePayments = await this.paymentRepo.findBySaleId(payment.sale.id);
    const saleTotal = Number(payment.sale.totalAmount);
    const totalPaid = Number(
      salePayments.reduce((acc, p) => acc + Number(p.amount), 0).toFixed(2)
    );
    const balanceRemaining = Math.max(0, Number((saleTotal - totalPaid).toFixed(2)));
    const paymentStatus = PaymentService.calculatePaymentStatus(saleTotal, totalPaid);

    return {
      ...payment,
      paymentStatus,
      balanceRemaining,
      totalPaid,
    };
  }

  public async listPayments(query: PaymentQueryInput): Promise<PaymentListResult> {
    const validated = paymentQuerySchema.parse(query);
    const {
      page = 1,
      limit = 10,
      saleId,
      paymentMethod = 'all',
      search,
      startDate,
      endDate,
      sortBy = 'paidAt',
      sortOrder = 'desc',
    } = validated;

    const where: Prisma.PaymentWhereInput = {};

    // 1. Sale ID filter
    if (saleId && saleId.trim() !== '') {
      where.saleId = saleId.trim();
    }

    // 2. Payment Method filter
    if (paymentMethod !== 'all') {
      where.paymentMethod = paymentMethod as PaymentMethod;
    }

    // 3. Search filter
    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { transactionRef: { contains: term, mode: 'insensitive' } },
        { sale: { invoiceNumber: { contains: term, mode: 'insensitive' } } },
        { sale: { customer: { name: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    // 4. Date range filter
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) {
        where.paidAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        if (endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.paidAt.lte = end;
      }
    }

    const skip = (page - 1) * limit;
    const take = limit;
    const orderBy: Prisma.PaymentOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, totalItems, summary] = await Promise.all([
      this.paymentRepo.findMany({ where, orderBy, skip, take }),
      this.paymentRepo.count(where),
      this.paymentRepo.getSummary(where),
    ]);

    const formattedItems: FormattedPaymentItem[] = items.map((p) => {
      const saleTotal = Number(p.sale.totalAmount);
      const totalPaid =
        p.sale.payments && p.sale.payments.length > 0
          ? Number(p.sale.payments.reduce((acc, curr) => acc + Number(curr.amount), 0).toFixed(2))
          : Number(p.amount);
      const balanceRemaining = Math.max(0, Number((saleTotal - totalPaid).toFixed(2)));
      const paymentStatus = PaymentService.calculatePaymentStatus(saleTotal, totalPaid);

      return {
        ...p,
        paymentStatus,
        balanceRemaining,
        totalPaid,
      };
    });

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      items: formattedItems,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      summary,
    };
  }

  public async getPaymentsBySaleId(saleId: string): Promise<Payment[]> {
    return this.paymentRepo.findBySaleId(saleId);
  }

  public async getSummary(): Promise<PaymentSummary> {
    return this.paymentRepo.getSummary();
  }
}

export const paymentService = new PaymentService();
