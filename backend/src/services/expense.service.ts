import { Prisma, PrismaClient, PaymentMethod } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  ExpenseRepository,
  expenseRepository as defaultExpenseRepo,
  ExpenseWithUser,
  ExpenseSummary,
} from '../repositories/expense.repository';
import {
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseQueryInput,
  createExpenseSchema,
  updateExpenseSchema,
  expenseQuerySchema,
} from '../validators/expense.validator';
import { ApiError } from '../utils/apiError';
import { IPaginatedData } from '../types';

export interface ExpenseListResult extends IPaginatedData<ExpenseWithUser> {
  summary: ExpenseSummary;
}

export class ExpenseService {
  constructor(
    private prismaClient: PrismaClient = prisma,
    private expenseRepo: ExpenseRepository = defaultExpenseRepo
  ) {}

  public async createExpense(
    rawInput: CreateExpenseInput,
    userId: string
  ): Promise<ExpenseWithUser> {
    const input = createExpenseSchema.parse(rawInput);

    if (!userId) {
      throw ApiError.unauthorized('User context is missing');
    }

    const amount = Number(input.amount);
    if (isNaN(amount) || amount <= 0) {
      throw ApiError.badRequest('Expense amount must be a positive monetary value greater than zero');
    }

    const expenseDate = input.expenseDate ? new Date(input.expenseDate) : new Date();

    const expense = await this.prismaClient.$transaction(async (tx) => {
      const created = await this.expenseRepo.create(
        {
          userId,
          category: input.category,
          amount: new Prisma.Decimal(amount.toFixed(2)),
          description: input.description,
          paymentMethod: input.paymentMethod,
          expenseDate,
          isActive: true,
        },
        tx
      );

      // Create Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'EXPENSE_CREATE',
          entity: 'Expense',
          entityId: created.id,
          details: `Created expense [${input.category}] of $${amount.toFixed(2)} via ${input.paymentMethod}: "${input.description}"`,
        },
      });

      return created;
    });

    const fullExpense = await this.expenseRepo.findById(expense.id);
    return fullExpense!;
  }

  public async getExpenseById(id: string): Promise<ExpenseWithUser> {
    const expense = await this.expenseRepo.findById(id);
    if (!expense) {
      throw ApiError.notFound(`Expense record with ID '${id}' was not found`);
    }
    return expense;
  }

  public async updateExpense(
    id: string,
    rawInput: UpdateExpenseInput,
    userId: string
  ): Promise<ExpenseWithUser> {
    const input = updateExpenseSchema.parse(rawInput);

    const existing = await this.expenseRepo.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Expense record with ID '${id}' was not found`);
    }

    const updateData: Prisma.ExpenseUncheckedUpdateInput = {};

    if (input.category !== undefined) {
      updateData.category = input.category;
    }

    if (input.amount !== undefined) {
      const amt = Number(input.amount);
      if (isNaN(amt) || amt <= 0) {
        throw ApiError.badRequest('Expense amount must be a positive monetary value greater than zero');
      }
      updateData.amount = new Prisma.Decimal(amt.toFixed(2));
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.paymentMethod !== undefined) {
      updateData.paymentMethod = input.paymentMethod;
    }

    if (input.expenseDate !== undefined) {
      updateData.expenseDate = new Date(input.expenseDate);
    }

    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }

    await this.prismaClient.$transaction(async (tx) => {
      await this.expenseRepo.update(id, updateData, tx);

      await tx.auditLog.create({
        data: {
          userId,
          action: 'EXPENSE_UPDATE',
          entity: 'Expense',
          entityId: id,
          details: `Updated expense ${id}: ${JSON.stringify(input)}`,
        },
      });
    });

    const updated = await this.expenseRepo.findById(id);
    return updated!;
  }

  public async deactivateExpense(id: string, userId: string): Promise<ExpenseWithUser> {
    const existing = await this.expenseRepo.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Expense record with ID '${id}' was not found`);
    }

    await this.prismaClient.$transaction(async (tx) => {
      await this.expenseRepo.update(id, { isActive: false }, tx);

      await tx.auditLog.create({
        data: {
          userId,
          action: 'EXPENSE_DEACTIVATE',
          entity: 'Expense',
          entityId: id,
          details: `Deactivated expense [${existing.category}] of $${Number(existing.amount).toFixed(2)}`,
        },
      });
    });

    const updated = await this.expenseRepo.findById(id);
    return updated!;
  }

  public async activateExpense(id: string, userId: string): Promise<ExpenseWithUser> {
    const existing = await this.expenseRepo.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Expense record with ID '${id}' was not found`);
    }

    await this.prismaClient.$transaction(async (tx) => {
      await this.expenseRepo.update(id, { isActive: true }, tx);

      await tx.auditLog.create({
        data: {
          userId,
          action: 'EXPENSE_ACTIVATE',
          entity: 'Expense',
          entityId: id,
          details: `Reactivated expense [${existing.category}] of $${Number(existing.amount).toFixed(2)}`,
        },
      });
    });

    const updated = await this.expenseRepo.findById(id);
    return updated!;
  }

  public async deleteExpense(id: string, userId: string): Promise<{ id: string; success: boolean }> {
    const existing = await this.expenseRepo.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Expense record with ID '${id}' was not found`);
    }

    await this.prismaClient.$transaction(async (tx) => {
      await this.expenseRepo.delete(id, tx);

      await tx.auditLog.create({
        data: {
          userId,
          action: 'EXPENSE_DELETE',
          entity: 'Expense',
          entityId: id,
          details: `Deleted expense [${existing.category}] of $${Number(existing.amount).toFixed(2)}`,
        },
      });
    });

    return { id, success: true };
  }

  public async listExpenses(query: ExpenseQueryInput): Promise<ExpenseListResult> {
    const validated = expenseQuerySchema.parse(query);
    const {
      page = 1,
      limit = 10,
      search,
      category = 'all',
      paymentMethod = 'all',
      status = 'all',
      startDate,
      endDate,
      sortBy = 'expenseDate',
      sortOrder = 'desc',
    } = validated;

    const where: Prisma.ExpenseWhereInput = {};

    // 1. Search term (in description, category, user name)
    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { description: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { user: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    // 2. Category filter
    if (category && category !== 'all') {
      where.category = { equals: category, mode: 'insensitive' };
    }

    // 3. Payment Method filter
    if (paymentMethod && paymentMethod !== 'all') {
      where.paymentMethod = paymentMethod as PaymentMethod;
    }

    // 4. Status filter
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // 5. Date range filter
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) {
        where.expenseDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        if (endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.expenseDate.lte = end;
      }
    }

    const skip = (page - 1) * limit;
    const take = limit;
    const orderBy: Prisma.ExpenseOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, totalItems, summary] = await Promise.all([
      this.expenseRepo.findMany({ where, orderBy, skip, take }),
      this.expenseRepo.count(where),
      this.expenseRepo.getSummary(where),
    ]);

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
      summary,
    };
  }

  public async getSummary(query?: Partial<ExpenseQueryInput>): Promise<ExpenseSummary> {
    const where: Prisma.ExpenseWhereInput = {};
    if (query?.category && query.category !== 'all') {
      where.category = { equals: query.category, mode: 'insensitive' };
    }
    if (query?.paymentMethod && query.paymentMethod !== 'all') {
      where.paymentMethod = query.paymentMethod as PaymentMethod;
    }
    if (query?.startDate || query?.endDate) {
      where.expenseDate = {};
      if (query.startDate) where.expenseDate.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        if (query.endDate.length <= 10) end.setHours(23, 59, 59, 999);
        where.expenseDate.lte = end;
      }
    }
    return this.expenseRepo.getSummary(where);
  }
}

export const expenseService = new ExpenseService();
