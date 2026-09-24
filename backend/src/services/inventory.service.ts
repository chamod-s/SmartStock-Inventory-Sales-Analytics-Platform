import { Prisma, PrismaClient, TransactionType } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  InventoryRepository,
  inventoryRepository as defaultInventoryRepo,
  InventoryItemWithDetails,
  InventorySummary,
} from '../repositories/inventory.repository';
import {
  InventoryAdjustmentInput,
  InventoryQueryInput,
  InventoryHistoryQueryInput,
  inventoryAdjustmentSchema,
  inventoryQuerySchema,
  inventoryHistoryQuerySchema,
} from '../validators/inventory.validator';
import { ApiError } from '../utils/apiError';
import { IPaginatedData } from '../types';
import { calculateStockStatus, StockStatus } from './product.service';

export interface FormattedInventoryItem extends Omit<InventoryItemWithDetails, 'purchasePrice' | 'sellingPrice'> {
  purchasePrice: number;
  sellingPrice: number;
  stockValue: number;
  retailValue: number;
  stockStatus: StockStatus;
}

export interface InventoryListResult extends IPaginatedData<FormattedInventoryItem> {
  summary?: InventorySummary;
}

export interface FormattedInventoryTransaction {
  id: string;
  date: Date;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    category?: string;
  };
  type: TransactionType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  reference: string | null;
  createdAt: Date;
}

export interface LowStockAlertItem extends FormattedInventoryItem {
  deficit: number;
  severity: 'CRITICAL' | 'WARNING';
}

export interface RecordStockMovementOptions {
  productId: string;
  userId?: string | null;
  type: TransactionType;
  quantityDelta: number;
  referenceId?: string | null;
  notes?: string | null;
  newPurchasePrice?: Prisma.Decimal | number;
}

export interface StockMovementResult {
  product: any;
  transaction: any;
  stockBefore: number;
  stockAfter: number;
}

export class InventoryService {
  constructor(
    private prismaClient: PrismaClient = prisma,
    private inventoryRepo: InventoryRepository = defaultInventoryRepo
  ) {}

  /**
   * Centralized method to record any stock movement and create the corresponding audit transaction.
   * Enforces non-negative stock constraint and database atomicity.
   */
  public async recordStockMovement(
    tx: Prisma.TransactionClient,
    options: RecordStockMovementOptions
  ): Promise<StockMovementResult> {
    const { productId, userId, type, quantityDelta, referenceId, notes, newPurchasePrice } = options;

    if (!productId) {
      throw ApiError.badRequest('Product ID is required for inventory stock movement');
    }

    // Fetch existing product
    const product = await tx.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw ApiError.notFound(`Product with ID '${productId}' was not found`);
    }

    const stockBefore = product.currentStock;
    const stockAfter = stockBefore + quantityDelta;

    // Strict validation: Do not allow negative stock
    if (stockAfter < 0) {
      throw ApiError.badRequest(
        `Insufficient inventory. Stock for product '${product.name}' (SKU: ${product.sku}) cannot be negative. Current stock: ${stockBefore}, requested change: ${quantityDelta > 0 ? `+${quantityDelta}` : quantityDelta}, resulting stock: ${stockAfter}.`
      );
    }

    // Update product stock and optionally purchase price
    const updateData: Prisma.ProductUpdateInput = {
      currentStock: stockAfter,
    };

    if (newPurchasePrice !== undefined) {
      updateData.purchasePrice = new Prisma.Decimal(Number(newPurchasePrice).toFixed(2));
    }

    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: updateData,
    });

    // Create InventoryTransaction record
    const transaction = await tx.inventoryTransaction.create({
      data: {
        productId,
        userId: userId || null,
        type,
        quantity: quantityDelta,
        stockBefore,
        stockAfter,
        referenceId: referenceId || null,
        notes: notes || null,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
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
    });

    return {
      product: updatedProduct,
      transaction,
      stockBefore,
      stockAfter,
    };
  }

  /**
   * Adjust inventory stock by authorized users (Admin / Manager).
   */
  public async adjustStock(
    rawInput: InventoryAdjustmentInput,
    userId: string
  ): Promise<StockMovementResult> {
    const validated = inventoryAdjustmentSchema.parse(rawInput);

    return await this.prismaClient.$transaction(
      async (tx) => {
        // Fetch current product to compute delta if SET mode
        const product = await tx.product.findUnique({
          where: { id: validated.productId },
        });

        if (!product) {
          throw ApiError.notFound(`Product with ID '${validated.productId}' was not found`);
        }

        let quantityDelta = 0;

        switch (validated.mode) {
          case 'ADD':
            quantityDelta = Math.abs(validated.quantity!);
            break;
          case 'DEDUCT':
            quantityDelta = -Math.abs(validated.quantity!);
            break;
          case 'SET':
            quantityDelta = validated.targetStock! - product.currentStock;
            break;
          case 'DELTA':
          default:
            quantityDelta = validated.quantity!;
            break;
        }

        // Format notes with audit context if needed
        let finalReason = validated.reason.trim();
        if (validated.mode === 'SET') {
          finalReason = `Physical audit recount to ${validated.targetStock} (${quantityDelta >= 0 ? `+${quantityDelta}` : quantityDelta}): ${finalReason}`;
        }

        return await this.recordStockMovement(tx, {
          productId: validated.productId,
          userId,
          type: validated.type,
          quantityDelta,
          referenceId: validated.reference?.trim() || null,
          notes: finalReason,
        });
      },
      {
        timeout: 10000,
      }
    );
  }

  /**
   * List inventory items with stock value, status, and filters.
   */
  public async listInventory(query: InventoryQueryInput): Promise<InventoryListResult> {
    const validated = inventoryQuerySchema.parse(query);
    const { page, limit, search, categoryId, stockStatus, sortBy, sortOrder } = validated;

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

    // 2. Category filter
    if (categoryId && categoryId.trim() !== '' && categoryId !== 'all') {
      where.categoryId = categoryId.trim();
    }

    // 3. Sorting
    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortBy === 'stockValue' ? 'currentStock' : sortBy]: sortOrder,
    };

    const skip = (page - 1) * limit;
    const take = limit;

    const [rawItems, totalItems, summary] = await Promise.all([
      this.inventoryRepo.findProducts({ where, orderBy, skip, take, stockStatus }),
      this.inventoryRepo.countProducts(where, stockStatus),
      this.inventoryRepo.getSummary(),
    ]);

    const items: FormattedInventoryItem[] = rawItems.map((item) => {
      const purchasePrice = Number(item.purchasePrice);
      const sellingPrice = Number(item.sellingPrice);
      const currentStock = item.currentStock;
      const stockValue = Number((currentStock * purchasePrice).toFixed(2));
      const retailValue = Number((currentStock * sellingPrice).toFixed(2));
      const status = calculateStockStatus(currentStock, item.reorderLevel);

      return {
        ...item,
        purchasePrice,
        sellingPrice,
        stockValue,
        retailValue,
        stockStatus: status,
      };
    });

    // In-memory sort by stockValue if requested
    if (sortBy === 'stockValue') {
      items.sort((a, b) => (sortOrder === 'asc' ? a.stockValue - b.stockValue : b.stockValue - a.stockValue));
    }

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

  /**
   * List inventory transaction history with comprehensive relations.
   */
  public async listHistory(
    query: InventoryHistoryQueryInput
  ): Promise<IPaginatedData<FormattedInventoryTransaction>> {
    const validated = inventoryHistoryQuerySchema.parse(query);
    const { page, limit, productId, type, search, startDate, endDate, userId, sortBy, sortOrder } =
      validated;

    const where: Prisma.InventoryTransactionWhereInput = {};

    // 1. Product filter
    if (productId && productId.trim() !== '' && productId !== 'all') {
      where.productId = productId.trim();
    }

    // 2. Transaction Type filter
    if (type && type !== 'all') {
      where.type = type as TransactionType;
    }

    // 3. User filter
    if (userId && userId.trim() !== '') {
      where.userId = userId.trim();
    }

    // 4. Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        if (endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = end;
      }
    }

    // 5. Search in Product name, SKU, notes, or referenceId
    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { notes: { contains: term, mode: 'insensitive' } },
        { referenceId: { contains: term, mode: 'insensitive' } },
        { product: { name: { contains: term, mode: 'insensitive' } } },
        { product: { sku: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;
    const take = limit;
    const orderBy: Prisma.InventoryTransactionOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [rawTransactions, totalItems] = await Promise.all([
      this.inventoryRepo.findTransactions({ where, orderBy, skip, take }),
      this.inventoryRepo.countTransactions(where),
    ]);

    const items: FormattedInventoryTransaction[] = rawTransactions.map((tx) => ({
      id: tx.id,
      date: tx.createdAt,
      productId: tx.productId,
      product: {
        id: tx.product.id,
        name: tx.product.name,
        sku: tx.product.sku,
        unit: tx.product.unit,
        category: tx.product.category?.name,
      },
      type: tx.type,
      quantity: tx.quantity,
      stockBefore: tx.stockBefore,
      stockAfter: tx.stockAfter,
      reason: tx.notes || 'No reason provided',
      user: tx.user,
      reference: tx.referenceId,
      createdAt: tx.createdAt,
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

  /**
   * Get high-level inventory metrics & valuation summary.
   */
  public async getSummary(): Promise<InventorySummary> {
    return this.inventoryRepo.getSummary();
  }

  /**
   * Low-stock alerts: products where currentStock <= reorderLevel.
   */
  public async getLowStockAlerts(limit: number = 50): Promise<LowStockAlertItem[]> {
    const products = await this.inventoryRepo.getLowStockProducts(limit);

    return products.map((item) => {
      const purchasePrice = Number(item.purchasePrice);
      const sellingPrice = Number(item.sellingPrice);
      const currentStock = item.currentStock;
      const reorderLevel = item.reorderLevel;
      const stockValue = Number((currentStock * purchasePrice).toFixed(2));
      const retailValue = Number((currentStock * sellingPrice).toFixed(2));
      const stockStatus = calculateStockStatus(currentStock, reorderLevel);
      const deficit = Math.max(0, reorderLevel - currentStock);
      const severity: 'CRITICAL' | 'WARNING' = currentStock <= 0 ? 'CRITICAL' : 'WARNING';

      return {
        ...item,
        purchasePrice,
        sellingPrice,
        stockValue,
        retailValue,
        stockStatus,
        deficit,
        severity,
      };
    });
  }
}

export const inventoryService = new InventoryService();
