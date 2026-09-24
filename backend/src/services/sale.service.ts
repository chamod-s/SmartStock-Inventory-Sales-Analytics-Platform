import { Prisma, PrismaClient, SaleStatus, TransactionType, PaymentMethod } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  SaleRepository,
  saleRepository as defaultSaleRepo,
  SaleWithRelations,
  SaleWithDetails,
  SaleSummary,
} from '../repositories/sale.repository';
import {
  InventoryService,
  inventoryService as defaultInventoryService,
} from './inventory.service';
import {
  CreateSaleInput,
  SaleQueryInput,
  createSaleSchema,
} from '../validators/sale.validator';
import { WALK_IN_CUSTOMER_CODE } from '../repositories/customer.repository';
import { ApiError } from '../utils/apiError';
import { IPaginatedData } from '../types';

export interface SaleListResult extends IPaginatedData<SaleWithRelations> {
  summary: SaleSummary;
}

export class SaleService {
  constructor(
    private prismaClient: PrismaClient = prisma,
    private saleRepo: SaleRepository = defaultSaleRepo,
    private inventoryService: InventoryService = defaultInventoryService
  ) {}

  public async listSales(query: SaleQueryInput): Promise<SaleListResult> {
    const {
      page = 1,
      limit = 10,
      search,
      customerId,
      userId,
      status = 'all',
      paymentMethod = 'all',
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.SaleWhereInput = {};

    // 1. Search term
    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { invoiceNumber: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
        { customer: { name: { contains: term, mode: 'insensitive' } } },
        { customer: { phone: { contains: term, mode: 'insensitive' } } },
        { customer: { code: { contains: term, mode: 'insensitive' } } },
        { user: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    // 2. Customer filter
    if (customerId && customerId.trim() !== '' && customerId !== 'all') {
      where.customerId = customerId.trim();
    }

    // 3. User (cashier) filter
    if (userId && userId.trim() !== '' && userId !== 'all') {
      where.userId = userId.trim();
    }

    // 4. Status filter
    if (status !== 'all') {
      where.status = status as SaleStatus;
    }

    // 5. Payment method filter
    if (paymentMethod !== 'all') {
      where.payments = {
        some: {
          paymentMethod: paymentMethod as PaymentMethod,
        },
      };
    }

    // 6. Date range filter
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

    const skip = (page - 1) * limit;
    const take = limit;
    const orderBy: Prisma.SaleOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, totalItems, summary] = await Promise.all([
      this.saleRepo.findMany({ where, orderBy, skip, take }),
      this.saleRepo.count(where),
      this.saleRepo.getSummary(where),
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

  public async getSaleById(id: string): Promise<SaleWithDetails> {
    const sale = await this.saleRepo.findById(id);
    if (!sale) {
      throw ApiError.notFound(`Sale transaction with ID '${id}' was not found`);
    }
    return sale;
  }

  public async getSaleByInvoice(invoiceNumber: string): Promise<SaleWithDetails> {
    const sale = await this.saleRepo.findByInvoiceNumber(invoiceNumber);
    if (!sale) {
      throw ApiError.notFound(`Sale invoice '${invoiceNumber}' was not found`);
    }
    return sale;
  }

  public async getSummary(): Promise<SaleSummary> {
    return this.saleRepo.getSummary();
  }

  /**
   * Complete a checkout sale inside a single ACID Prisma transaction.
   * Executes the 10-step validation and mutation sequence:
   * 1. Validate product
   * 2. Validate quantity
   * 3. Check available stock
   * 4. Reject insufficient stock (never allow negative stock)
   * 5. Create sale
   * 6. Create sale items (storing unitCost for historical profit accuracy)
   * 7. Reduce stock
   * 8. Create inventory transactions
   * 9. Create payment
   * 10. Generate invoice number
   */
  public async createSale(rawInput: CreateSaleInput, userId: string): Promise<SaleWithDetails> {
    const input = createSaleSchema.parse(rawInput);

    if (!userId) {
      throw ApiError.unauthorized('User authentication context is missing');
    }

    if (!input.items || input.items.length === 0) {
      throw ApiError.badRequest('Cart is empty. At least one item is required to complete a sale');
    }

    // Consolidate duplicate products if any in cart
    const itemMap = new Map<string, { quantity: number; unitPrice?: number }>();
    for (const item of input.items) {
      // Step 2: Validate quantity
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw ApiError.badRequest(`Invalid quantity '${item.quantity}'. Quantity must be a positive integer`);
      }

      if (itemMap.has(item.productId)) {
        const existing = itemMap.get(item.productId)!;
        existing.quantity += item.quantity;
      } else {
        itemMap.set(item.productId, { quantity: item.quantity, unitPrice: item.unitPrice });
      }
    }

    const productIds = Array.from(itemMap.keys());

    // Execute everything inside ONE atomic Prisma database transaction
    return await this.prismaClient.$transaction(
      async (tx) => {
        // Step 1: Validate products exist and are active
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });

        if (products.length !== productIds.length) {
          const foundIds = new Set(products.map((p) => p.id));
          const missingIds = productIds.filter((id) => !foundIds.has(id));
          throw ApiError.notFound(`Product(s) with ID(s) ${missingIds.join(', ')} were not found`);
        }

        const productLookup = new Map(products.map((p) => [p.id, p]));

        // Step 3 & 4: Check available stock and reject insufficient stock
        for (const [prodId, cartItem] of itemMap.entries()) {
          const product = productLookup.get(prodId)!;

          if (product.status === 'DISCONTINUED') {
            throw ApiError.badRequest(
              `Cannot sell discontinued product '${product.name}' (SKU: ${product.sku})`
            );
          }

          if (product.currentStock < cartItem.quantity) {
            throw ApiError.badRequest(
              `Insufficient stock for '${product.name}' (SKU: ${product.sku}). Available stock: ${product.currentStock} ${product.unit}, requested in cart: ${cartItem.quantity} ${product.unit}. Sale rejected to prevent negative inventory.`
            );
          }
        }

        // Step 10 & 5: Generate unique invoice number
        const invoiceNumber = await this.saleRepo.generateInvoiceNumber(tx);

        // Resolve customer
        let resolvedCustomerId: string | null = null;
        if (input.customerId && input.customerId !== 'walk-in' && input.customerId.trim() !== '') {
          const customer = await tx.customer.findUnique({
            where: { id: input.customerId },
          });
          if (!customer) {
            throw ApiError.notFound(`Customer with ID '${input.customerId}' was not found`);
          }
          resolvedCustomerId = customer.id;
        } else {
          // Check for default Walk-In customer record
          const walkInCustomer = await tx.customer.findUnique({
            where: { code: WALK_IN_CUSTOMER_CODE },
          });
          if (walkInCustomer) {
            resolvedCustomerId = walkInCustomer.id;
          }
        }

        // Step 6: Compute financial totals and prepare sale items with historical unitCost
        let subtotal = 0;
        const lineItems = Array.from(itemMap.entries()).map(([prodId, cartItem]) => {
          const product = productLookup.get(prodId)!;
          const unitPrice =
            cartItem.unitPrice !== undefined ? cartItem.unitPrice : Number(product.sellingPrice);
          const unitCost = Number(product.purchasePrice);
          const lineSubtotal = Number((cartItem.quantity * unitPrice).toFixed(2));
          subtotal += lineSubtotal;

          return {
            productId: prodId,
            quantity: cartItem.quantity,
            unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)),
            unitCost: new Prisma.Decimal(unitCost.toFixed(2)), // Storing unitCost for historical profit accuracy
            subtotal: new Prisma.Decimal(lineSubtotal.toFixed(2)),
          };
        });

        subtotal = Number(subtotal.toFixed(2));
        const discountAmount = Number((input.discountAmount ?? input.discount ?? 0).toFixed(2));
        const taxAmount = Number((input.taxAmount ?? input.tax ?? 0).toFixed(2));
        const totalAmount = Math.max(0, Number((subtotal - discountAmount + taxAmount).toFixed(2)));

        // Step 5: Create Sale and Line Items
        const createdSale = await tx.sale.create({
          data: {
            invoiceNumber,
            customerId: resolvedCustomerId,
            userId,
            subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
            taxAmount: new Prisma.Decimal(taxAmount.toFixed(2)),
            discountAmount: new Prisma.Decimal(discountAmount.toFixed(2)),
            totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
            status: SaleStatus.COMPLETED,
            notes: input.notes?.trim() || null,
            items: {
              create: lineItems,
            },
          },
        });

        // Step 7 & 8: Reduce stock and create inventory transactions via Centralized InventoryService
        for (const [prodId, cartItem] of itemMap.entries()) {
          const product = productLookup.get(prodId)!;
          await this.inventoryService.recordStockMovement(tx, {
            productId: prodId,
            userId,
            type: TransactionType.SALE,
            quantityDelta: -cartItem.quantity, // Negative delta reduces stock
            referenceId: createdSale.id,
            notes: `POS Checkout Invoice ${createdSale.invoiceNumber} (-${cartItem.quantity} ${product.unit})`,
          });
        }

        // Step 9: Create Payment record
        const paymentAmount =
          input.amountPaid !== undefined && input.amountPaid > 0
            ? Math.min(input.amountPaid, totalAmount)
            : totalAmount;

        await tx.payment.create({
          data: {
            saleId: createdSale.id,
            amount: new Prisma.Decimal(paymentAmount.toFixed(2)),
            paymentMethod: input.paymentMethod,
            transactionRef: input.transactionRef?.trim() || null,
            paidAt: new Date(),
          },
        });

        // Step 11: If customer linked, update customer totalSpent
        if (resolvedCustomerId) {
          await tx.customer.update({
            where: { id: resolvedCustomerId },
            data: {
              totalSpent: {
                increment: new Prisma.Decimal(totalAmount.toFixed(2)),
              },
            },
          });
        }

        // Return detailed sale
        const fullSale = await this.saleRepo.findById(createdSale.id, tx);
        return fullSale!;
      },
      {
        timeout: 10000,
      }
    );
  }
}

export const saleService = new SaleService();
