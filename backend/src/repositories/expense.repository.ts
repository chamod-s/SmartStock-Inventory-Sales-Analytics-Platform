import { Prisma, PrismaClient, Expense, PaymentMethod } from '@prisma/client';
import { prisma } from '../config/prisma';

export type ExpenseWithUser = Expense & {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export interface ExpenseSummary {
  totalExpenses: number;
  totalAmount: number;
  categoryBreakdown: {
    rent: number;
    electricity: number;
    salary: number;
    transport: number;
    marketing: number;
    maintenance: number;
    other: number;
  };
  methodBreakdown: {
    cash: number;
    card: number;
    bankTransfer: number;
    online: number;
  };
}

export interface FindExpensesOptions {
  where?: Prisma.ExpenseWhereInput;
  orderBy?: Prisma.ExpenseOrderByWithRelationInput | Prisma.ExpenseOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

export class ExpenseRepository {
  constructor(private client: PrismaClient = prisma) {}

  public async findMany(options: FindExpensesOptions = {}): Promise<ExpenseWithUser[]> {
    const { where, orderBy, skip, take } = options;

    return this.client.expense.findMany({
      where,
      orderBy: orderBy || { expenseDate: 'desc' },
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }) as unknown as Promise<ExpenseWithUser[]>;
  }

  public async count(where?: Prisma.ExpenseWhereInput): Promise<number> {
    return this.client.expense.count({ where });
  }

  public async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.client
  ): Promise<ExpenseWithUser | null> {
    return tx.expense.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }) as unknown as Promise<ExpenseWithUser | null>;
  }

  public async create(
    data: Prisma.ExpenseUncheckedCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.client
  ): Promise<Expense> {
    return tx.expense.create({
      data,
    });
  }

  public async update(
    id: string,
    data: Prisma.ExpenseUncheckedUpdateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.client
  ): Promise<Expense> {
    return tx.expense.update({
      where: { id },
      data,
    });
  }

  public async delete(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.client
  ): Promise<Expense> {
    return tx.expense.delete({
      where: { id },
    });
  }

  public async getSummary(
    where: Prisma.ExpenseWhereInput = {},
    tx: Prisma.TransactionClient | PrismaClient = this.client
  ): Promise<ExpenseSummary> {
    const [
      totalCount,
      totalAmountAgg,
      rentAgg,
      electricityAgg,
      salaryAgg,
      transportAgg,
      marketingAgg,
      maintenanceAgg,
      otherAgg,
      cashAgg,
      cardAgg,
      bankTransferAgg,
      onlineAgg,
    ] = await Promise.all([
      tx.expense.count({ where }),
      tx.expense.aggregate({ where, _sum: { amount: true } }),
      tx.expense.aggregate({ where: { ...where, category: { equals: 'Rent', mode: 'insensitive' } }, _sum: { amount: true } }),
      tx.expense.aggregate({ where: { ...where, category: { equals: 'Electricity', mode: 'insensitive' } }, _sum: { amount: true } }),
      tx.expense.aggregate({ where: { ...where, category: { equals: 'Salary', mode: 'insensitive' } }, _sum: { amount: true } }),
      tx.expense.aggregate({ where: { ...where, category: { equals: 'Transport', mode: 'insensitive' } }, _sum: { amount: true } }),
      tx.expense.aggregate({ where: { ...where, category: { equals: 'Marketing', mode: 'insensitive' } }, _sum: { amount: true } }),
      tx.expense.aggregate({ where: { ...where, category: { equals: 'Maintenance', mode: 'insensitive' } }, _sum: { amount: true } }),
      tx.expense.aggregate({ where: { ...where, category: { equals: 'Other', mode: 'insensitive' } }, _sum: { amount: true } }),
      tx.expense.aggregate({ where: { ...where, paymentMethod: PaymentMethod.CASH }, _sum: { amount: true } }),
      tx.expense.aggregate({ where: { ...where, paymentMethod: PaymentMethod.CARD }, _sum: { amount: true } }),
      tx.expense.aggregate({ where: { ...where, paymentMethod: PaymentMethod.BANK_TRANSFER }, _sum: { amount: true } }),
      tx.expense.aggregate({ where: { ...where, paymentMethod: PaymentMethod.ONLINE }, _sum: { amount: true } }),
    ]);

    return {
      totalExpenses: totalCount,
      totalAmount: Number(totalAmountAgg._sum.amount || 0),
      categoryBreakdown: {
        rent: Number(rentAgg._sum.amount || 0),
        electricity: Number(electricityAgg._sum.amount || 0),
        salary: Number(salaryAgg._sum.amount || 0),
        transport: Number(transportAgg._sum.amount || 0),
        marketing: Number(marketingAgg._sum.amount || 0),
        maintenance: Number(maintenanceAgg._sum.amount || 0),
        other: Number(otherAgg._sum.amount || 0),
      },
      methodBreakdown: {
        cash: Number(cashAgg._sum.amount || 0),
        card: Number(cardAgg._sum.amount || 0),
        bankTransfer: Number(bankTransferAgg._sum.amount || 0),
        online: Number(onlineAgg._sum.amount || 0),
      },
    };
  }
}

export const expenseRepository = new ExpenseRepository();
