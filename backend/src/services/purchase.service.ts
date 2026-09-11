import { Prisma, PurchaseStatus, TransactionType, PrismaClient } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  PurchaseRepository,
  purchaseRepository as defaultPurchaseRepo,
  PurchaseWithRelations,
  PurchaseWithDetails,
  PurchaseSummary,
} from '../repositories/purchase.repository';
import {
  CreatePurchaseInput,
  UpdatePurchaseInput,
  PurchaseQueryInput,
  createPurchaseSchema,
  updatePurchaseSchema,
} from '../validators/purchase.validator';
import { ApiError } from '../utils/apiError';
import { IPaginatedData } from '../types';

export interface PurchaseListResult extends IPaginatedData<PurchaseWithRelations> {
  summary: PurchaseSummary;
}

export class PurchaseService {
  constructor(
    private prismaClient: PrismaClient = prisma,
    private purchaseRepo: PurchaseRepository = defaultPurchaseRepo
  ) {}

  public async listPurchases(query: PurchaseQueryInput): Promise<PurchaseListResult> {
    const {
      page = 1,
      limit = 20,
      search,
      supplierId,
      status = 'all',
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.PurchaseWhereInput = {};

    // 1. Search term across PO Number, Supplier name, or Notes
    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { purchaseOrderNumber: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
        { supplier: { name: { contains: term, mode: 'insensitive' } } },
        { supplier: { code: { contains: term, mode: 'insensitive' } } },
      ];
    }

    // 2. Supplier filter
    if (supplierId) {
      where.supplierId = supplierId;
    }

    // 3. Status filter
    if (status !== 'all') {
      where.status = status as PurchaseStatus;
    }

    // 4. Date range filter
    if (startDate || endDate) {
      where.purchaseDate = {};
      if (startDate) {
        where.purchaseDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.purchaseDate.lte = end;
      }
    }

    const skip = (page - 1) * limit;
    const take = limit;
    const orderBy: Prisma.PurchaseOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, totalItems, summary] = await Promise.all([
      this.purchaseRepo.findMany({ where, orderBy, skip, take }),
      this.purchaseRepo.count(where),
      this.purchaseRepo.getSummary(where),
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

  public async getPurchaseById(id: string): Promise<PurchaseWithDetails> {
    if (!id) {
      throw ApiError.badRequest('Purchase ID is required');
    }

    const purchase = await this.purchaseRepo.findById(id);
    if (!purchase) {
      throw ApiError.notFound(`Purchase order with ID '${id}' not found`);
    }

    return purchase;
  }

  public async createPurchase(
    rawInput: CreatePurchaseInput,
    userId: string
  ): Promise<PurchaseWithDetails> {
    let input: ReturnType<typeof createPurchaseSchema.parse>;
    try {
      input = createPurchaseSchema.parse(rawInput);
    } catch (err: any) {
      const msg = err.errors?.[0]?.message || 'Invalid purchase data';
      throw ApiError.badRequest(msg, err.errors);
    }

    // Validate user presence
    if (!userId) {
      throw ApiError.unauthorized('User authentication context missing');
    }

    // Validate items array
    if (!input.items || input.items.length === 0) {
      throw ApiError.badRequest('At least one product item is required in the purchase order');
    }

    // Check for duplicate products in items
    const productIds = input.items.map((i) => i.productId);
    const uniqueIds = new Set(productIds);
    if (uniqueIds.size !== productIds.length) {
      throw ApiError.badRequest('Duplicate products found in purchase order items');
    }

    // Validate quantities and unit costs strictly
    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw ApiError.badRequest(`Invalid quantity: '${item.quantity}'. Quantity must be a positive integer`);
      }
      if (item.unitCost < 0) {
        throw ApiError.badRequest(`Invalid unit cost: '${item.unitCost}'. Unit cost cannot be negative`);
      }
    }

    const targetStatus = input.status || PurchaseStatus.RECEIVED;

    // Execute atomic transaction
    return await this.prismaClient.$transaction(
      async (tx) => {
        // 1. Verify supplier existence and active state
        const supplier = await tx.supplier.findUnique({
          where: { id: input.supplierId },
        });

        if (!supplier) {
          throw ApiError.notFound(`Supplier with ID '${input.supplierId}' not found`);
        }

        if (!supplier.isActive) {
          throw ApiError.badRequest(`Cannot create purchase order for inactive supplier '${supplier.name}'`);
        }

        // 2. Verify all products exist
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });

        if (products.length !== productIds.length) {
          const foundIds = new Set(products.map((p) => p.id));
          const missingIds = productIds.filter((id) => !foundIds.has(id));
          throw ApiError.notFound(`Product(s) with ID(s) ${missingIds.join(', ')} not found`);
        }

        const productMap = new Map(products.map((p) => [p.id, p]));

        // 3. Compute calculated financial totals
        let subtotal = 0;
        const lineItems = input.items.map((item) => {
          const lineSubtotal = Number((item.quantity * item.unitCost).toFixed(2));
          subtotal += lineSubtotal;
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitCost: new Prisma.Decimal(item.unitCost.toFixed(2)),
            subtotal: new Prisma.Decimal(lineSubtotal.toFixed(2)),
          };
        });

        subtotal = Number(subtotal.toFixed(2));
        const discountAmount = Number((input.discountAmount ?? input.discount ?? 0).toFixed(2));
        const taxAmount = Number((input.taxAmount ?? input.tax ?? 0).toFixed(2));
        const totalAmount = Math.max(0, Number((subtotal - discountAmount + taxAmount).toFixed(2)));

        // 4. Generate or validate unique PO Number
        let poNumber = input.purchaseOrderNumber?.trim();
        if (!poNumber) {
          poNumber = await this.purchaseRepo.generatePoNumber(tx);
        } else {
          const existing = await tx.purchase.findUnique({
            where: { purchaseOrderNumber: poNumber },
          });
          if (existing) {
            throw ApiError.conflict(`Purchase order number '${poNumber}' already exists`);
          }
        }

        // 5. Create Purchase Order and Line Items
        const createdPurchase = await tx.purchase.create({
          data: {
            purchaseOrderNumber: poNumber,
            supplierId: input.supplierId,
            userId,
            subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
            taxAmount: new Prisma.Decimal(taxAmount.toFixed(2)),
            discountAmount: new Prisma.Decimal(discountAmount.toFixed(2)),
            totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
            status: targetStatus,
            notes: input.notes?.trim() || null,
            purchaseDate: input.purchaseDate || new Date(),
            items: {
              create: lineItems,
            },
          },
        });

        // 6. If status is RECEIVED, update stock and create Inventory Transactions
        if (targetStatus === PurchaseStatus.RECEIVED) {
          for (const item of input.items) {
            const product = productMap.get(item.productId)!;
            const stockBefore = product.currentStock;
            const stockAfter = stockBefore + item.quantity;

            // Increase product currentStock and update purchasePrice
            await tx.product.update({
              where: { id: item.productId },
              data: {
                currentStock: stockAfter,
                purchasePrice: new Prisma.Decimal(item.unitCost.toFixed(2)),
              },
            });

            // Create InventoryTransaction audit record
            await tx.inventoryTransaction.create({
              data: {
                productId: item.productId,
                userId,
                type: TransactionType.PURCHASE,
                quantity: item.quantity,
                stockBefore,
                stockAfter,
                referenceId: createdPurchase.id,
                notes: `Purchase Order ${createdPurchase.purchaseOrderNumber} received (+${item.quantity} ${product.unit})`,
              },
            });
          }
        }

        // 7. Return detailed purchase
        const fullPurchase = await this.purchaseRepo.findById(createdPurchase.id, tx);
        return fullPurchase!;
      },
      {
        timeout: 10000,
      }
    );
  }

  public async updatePurchase(
    id: string,
    rawInput: UpdatePurchaseInput,
    userId: string
  ): Promise<PurchaseWithDetails> {
    if (!id) {
      throw ApiError.badRequest('Purchase ID is required');
    }

    let input: ReturnType<typeof updatePurchaseSchema.parse>;
    try {
      input = updatePurchaseSchema.parse(rawInput);
    } catch (err: any) {
      const msg = err.errors?.[0]?.message || 'Invalid update data';
      throw ApiError.badRequest(msg, err.errors);
    }

    return await this.prismaClient.$transaction(
      async (tx) => {
        const purchase = await tx.purchase.findUnique({
          where: { id },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        if (!purchase) {
          throw ApiError.notFound(`Purchase order with ID '${id}' not found`);
        }

        const newStatus = input.status;

        // Check status transition rules
        if (newStatus) {
          if (purchase.status === PurchaseStatus.RECEIVED) {
            throw ApiError.badRequest('Cannot modify status of an already RECEIVED purchase order');
          }

          if (purchase.status === PurchaseStatus.CANCELLED) {
            throw ApiError.badRequest('Cannot modify status of a CANCELLED purchase order');
          }

          // Transition: PENDING -> RECEIVED
          if (newStatus === PurchaseStatus.RECEIVED && purchase.status === PurchaseStatus.PENDING) {
            for (const item of purchase.items) {
              if (item.quantity <= 0) {
                throw ApiError.badRequest(`Invalid quantity for product ${item.product.name}`);
              }

              // Fetch fresh product data to avoid concurrency race conditions
              const freshProduct = await tx.product.findUnique({
                where: { id: item.productId },
              });

              if (!freshProduct) {
                throw ApiError.notFound(`Product with ID '${item.productId}' not found`);
              }

              const stockBefore = freshProduct.currentStock;
              const stockAfter = stockBefore + item.quantity;

              // Increase product stock
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  currentStock: stockAfter,
                  purchasePrice: item.unitCost,
                },
              });

              // Create inventory transaction
              await tx.inventoryTransaction.create({
                data: {
                  productId: item.productId,
                  userId,
                  type: TransactionType.PURCHASE,
                  quantity: item.quantity,
                  stockBefore,
                  stockAfter,
                  referenceId: purchase.id,
                  notes: `Purchase Order ${purchase.purchaseOrderNumber} received (+${item.quantity} ${freshProduct.unit})`,
                },
              });
            }
          }
        }

        // Update purchase record
        await tx.purchase.update({
          where: { id },
          data: {
            status: newStatus ?? purchase.status,
            notes: input.notes !== undefined ? input.notes : purchase.notes,
          },
        });

        const updated = await this.purchaseRepo.findById(id, tx);
        return updated!;
      },
      {
        timeout: 10000,
      }
    );
  }
}

export const purchaseService = new PurchaseService();
