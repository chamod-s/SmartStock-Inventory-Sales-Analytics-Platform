import { Prisma } from '@prisma/client';
import {
  CustomerRepository,
  customerRepository as defaultCustomerRepo,
  CustomerWithSalesDetails,
  WALK_IN_CUSTOMER_CODE,
} from '../repositories/customer.repository';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryInput,
  createCustomerSchema,
  updateCustomerSchema,
} from '../validators/customer.validator';
import { ApiError } from '../utils/apiError';
import { IPaginatedData } from '../types';

export type CustomerSegment =
  | 'VIP'
  | 'LOYAL'
  | 'NEW'
  | 'AT_RISK'
  | 'OCCASIONAL'
  | 'PROSPECT'
  | 'WALK_IN';

export interface CustomerItemResponse {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  creditLimit: number;
  totalSpent: number;
  totalOrders: number;
  averageOrderValue: number;
  lastPurchaseDate: Date | null;
  segment: CustomerSegment;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleHistoryItem {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
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
    unitPrice: number;
    subtotal: number;
    product: {
      id: string;
      name: string;
      sku: string;
      unit: string;
    };
  }>;
  payments: Array<{
    id: string;
    amount: number;
    paymentMethod: string;
    transactionRef: string | null;
  }>;
}

export interface CustomerDetailResponse extends CustomerItemResponse {
  salesHistory: SaleHistoryItem[];
  analytics: {
    daysSinceLastPurchase: number | null;
    purchaseFrequency: string;
    rfmScore: {
      recency: 'ACTIVE' | 'LAPSING' | 'DORMANT' | 'NONE';
      frequency: 'HIGH' | 'MEDIUM' | 'LOW' | 'ZERO';
      monetary: 'HIGH' | 'MEDIUM' | 'LOW' | 'ZERO';
    };
  };
}

export interface CustomerListResult extends IPaginatedData<CustomerItemResponse> {
  stats?: {
    totalCustomers: number;
    activeCustomers: number;
    totalRevenue: number;
    avgLifetimeValue: number;
  };
}

export class CustomerService {
  constructor(private customerRepo: CustomerRepository = defaultCustomerRepo) {}

  public calculateSegment(
    code: string,
    totalSpent: number,
    totalOrders: number,
    lastPurchaseDate: Date | null,
    createdAt: Date
  ): CustomerSegment {
    if (code === WALK_IN_CUSTOMER_CODE) {
      return 'WALK_IN';
    }

    if (totalOrders === 0) {
      return 'PROSPECT';
    }

    // High Spender threshold ($1,000+)
    if (totalSpent >= 1000) {
      return 'VIP';
    }

    const now = new Date().getTime();

    // Check Recency: If last purchase was more than 90 days ago
    if (lastPurchaseDate) {
      const daysSince = Math.floor((now - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 90) {
        return 'AT_RISK';
      }
    }

    // Frequent repeat buyer (3+ completed orders)
    if (totalOrders >= 3) {
      return 'LOYAL';
    }

    // New Customer: Joined or placed first order within 30 days
    const daysSinceCreation = Math.floor((now - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreation <= 30 || totalOrders === 1) {
      return 'NEW';
    }

    return 'OCCASIONAL';
  }

  public async listCustomers(query: Partial<CustomerQueryInput>): Promise<CustomerListResult> {
    const {
      page = 1,
      limit = 10,
      search,
      segment = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.CustomerWhereInput = {};

    // 1. Multi-field search
    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    // 2. Sorting
    const isCustomSort =
      sortBy === 'totalSpent' || sortBy === 'totalOrders' || sortBy === 'lastPurchaseDate';
    const orderBy: Prisma.CustomerOrderByWithRelationInput = !isCustomSort
      ? { [sortBy]: sortOrder }
      : { createdAt: 'desc' };

    const skip = (page - 1) * limit;
    const take = limit;

    const [rawCustomers, totalItems, globalStats] = await Promise.all([
      this.customerRepo.findMany({
        where,
        orderBy,
        skip: isCustomSort || segment !== 'all' ? undefined : skip,
        take: isCustomSort || segment !== 'all' ? undefined : take,
      }),
      this.customerRepo.count(where),
      this.customerRepo.getGlobalStats(),
    ]);

    const customerIds = rawCustomers.map((c) => c.id);
    const salesAggregates = await this.customerRepo.getSalesAggregates(customerIds);

    let items: CustomerItemResponse[] = rawCustomers.map((c) => {
      const agg = salesAggregates[c.id] || {
        totalOrders: c._count?.sales ?? 0,
        totalSpent: Number(c.totalSpent) || 0,
        lastPurchaseDate: null,
      };

      const totalSpent = Math.round((agg.totalSpent || Number(c.totalSpent) || 0) * 100) / 100;
      const totalOrders = agg.totalOrders || c._count?.sales || 0;
      const averageOrderValue =
        totalOrders > 0 ? Math.round((totalSpent / totalOrders) * 100) / 100 : 0;
      const computedSegment = this.calculateSegment(
        c.code,
        totalSpent,
        totalOrders,
        agg.lastPurchaseDate,
        c.createdAt
      );

      return {
        id: c.id,
        code: c.code,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        creditLimit: Number(c.creditLimit),
        totalSpent,
        totalOrders,
        averageOrderValue,
        lastPurchaseDate: agg.lastPurchaseDate,
        segment: computedSegment,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    // Segment filtering (if requested)
    if (segment !== 'all') {
      items = items.filter((c) => c.segment === segment);
    }

    // Custom in-memory sorting when requested
    if (isCustomSort) {
      items.sort((a, b) => {
        let valA: any = a[sortBy as keyof CustomerItemResponse];
        let valB: any = b[sortBy as keyof CustomerItemResponse];

        if (sortBy === 'lastPurchaseDate') {
          valA = valA ? new Date(valA).getTime() : 0;
          valB = valB ? new Date(valB).getTime() : 0;
        }

        return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
      });
    }

    const filteredTotal = segment !== 'all' ? items.length : totalItems;
    if (isCustomSort || segment !== 'all') {
      items = items.slice(skip, skip + take);
    }

    const totalPages = Math.ceil(filteredTotal / limit) || 1;

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems: filteredTotal,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats: globalStats,
    };
  }

  public async getCustomerById(id: string): Promise<CustomerDetailResponse> {
    const customer = (await this.customerRepo.findById(id, true)) as CustomerWithSalesDetails | null;
    if (!customer) {
      throw ApiError.notFound(`Customer with ID '${id}' was not found`);
    }

    const salesHistory: SaleHistoryItem[] = (customer.sales || []).map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      subtotal: Number(s.subtotal),
      taxAmount: Number(s.taxAmount),
      discountAmount: Number(s.discountAmount),
      totalAmount: Number(s.totalAmount),
      status: s.status,
      notes: s.notes,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      user: s.user,
      items: (s.items || []).map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        product: item.product,
      })),
      payments: (s.payments || []).map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod,
        transactionRef: p.transactionRef,
      })),
    }));

    const totalSpent = salesHistory.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalOrders = salesHistory.length;
    const averageOrderValue =
      totalOrders > 0 ? Math.round((totalSpent / totalOrders) * 100) / 100 : 0;
    const lastPurchaseDate = salesHistory.length > 0 ? salesHistory[0].createdAt : null;

    const segment = this.calculateSegment(
      customer.code,
      totalSpent,
      totalOrders,
      lastPurchaseDate,
      customer.createdAt
    );

    // Calculate RFM specifics
    const now = new Date().getTime();
    let daysSinceLastPurchase: number | null = null;
    let recencyTier: 'ACTIVE' | 'LAPSING' | 'DORMANT' | 'NONE' = 'NONE';

    if (lastPurchaseDate) {
      daysSinceLastPurchase = Math.floor(
        (now - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastPurchase <= 30) recencyTier = 'ACTIVE';
      else if (daysSinceLastPurchase <= 90) recencyTier = 'LAPSING';
      else recencyTier = 'DORMANT';
    }

    const frequencyTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'ZERO' =
      totalOrders >= 5 ? 'HIGH' : totalOrders >= 2 ? 'MEDIUM' : totalOrders === 1 ? 'LOW' : 'ZERO';

    const monetaryTier: 'HIGH' | 'MEDIUM' | 'LOW' | 'ZERO' =
      totalSpent >= 1000 ? 'HIGH' : totalSpent >= 200 ? 'MEDIUM' : totalSpent > 0 ? 'LOW' : 'ZERO';

    return {
      id: customer.id,
      code: customer.code,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      creditLimit: Number(customer.creditLimit),
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalOrders,
      averageOrderValue,
      lastPurchaseDate,
      segment,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      salesHistory,
      analytics: {
        daysSinceLastPurchase,
        purchaseFrequency: totalOrders > 1 ? `${Math.round(daysSinceLastPurchase || 0 / totalOrders)} days / order` : 'N/A',
        rfmScore: {
          recency: recencyTier,
          frequency: frequencyTier,
          monetary: monetaryTier,
        },
      },
    };
  }

  public async createCustomer(input: CreateCustomerInput): Promise<CustomerItemResponse> {
    const validated = createCustomerSchema.parse(input);

    // 1. Generate or validate customer code
    let finalCode = validated.code?.trim().toUpperCase();
    if (!finalCode) {
      finalCode = await this.generateNextCustomerCode();
    } else {
      const existingWithCode = await this.customerRepo.findByCode(finalCode);
      if (existingWithCode) {
        throw ApiError.conflict(`Customer with code '${finalCode}' already exists`);
      }
    }

    // 2. Validate customer name uniqueness (case-insensitive)
    const existingWithName = await this.customerRepo.findByName(validated.name.trim());
    if (existingWithName) {
      throw ApiError.conflict(`Customer with name '${validated.name.trim()}' already exists`);
    }

    // 3. Validate phone uniqueness if phone is provided
    if (validated.phone) {
      const existingWithPhone = await this.customerRepo.findByPhone(validated.phone.trim());
      if (existingWithPhone) {
        throw ApiError.conflict(`Customer with phone number '${validated.phone.trim()}' already exists`);
      }
    }

    const created = await this.customerRepo.create({
      code: finalCode,
      name: validated.name.trim(),
      email: validated.email ?? null,
      phone: validated.phone ?? null,
      address: validated.address ?? null,
      creditLimit: new Prisma.Decimal(validated.creditLimit ?? 0.0),
      totalSpent: new Prisma.Decimal(0.0),
    });

    return {
      id: created.id,
      code: created.code,
      name: created.name,
      email: created.email,
      phone: created.phone,
      address: created.address,
      creditLimit: Number(created.creditLimit),
      totalSpent: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      lastPurchaseDate: null,
      segment: created.code === WALK_IN_CUSTOMER_CODE ? 'WALK_IN' : 'PROSPECT',
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  public async updateCustomer(id: string, input: UpdateCustomerInput): Promise<CustomerItemResponse> {
    const validated = updateCustomerSchema.parse(input);

    const existing = await this.customerRepo.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Customer with ID '${id}' was not found`);
    }

    // Prevent changing code of the system Walk-in customer
    if (existing.code === WALK_IN_CUSTOMER_CODE && validated.code && validated.code !== WALK_IN_CUSTOMER_CODE) {
      throw ApiError.badRequest('The system Walk-in Customer code cannot be modified.');
    }

    // 1. Validate Code Uniqueness if updating code
    if (validated.code !== undefined && validated.code !== null) {
      const normalizedCode = validated.code.trim().toUpperCase();
      if (normalizedCode !== existing.code) {
        const duplicateCode = await this.customerRepo.findByCode(normalizedCode);
        if (duplicateCode && duplicateCode.id !== id) {
          throw ApiError.conflict(`Customer with code '${normalizedCode}' already exists`);
        }
      }
    }

    // 2. Validate Name Uniqueness if updating name
    if (validated.name !== undefined && validated.name !== null) {
      const trimmedName = validated.name.trim();
      if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicateName = await this.customerRepo.findByName(trimmedName);
        if (duplicateName && duplicateName.id !== id) {
          throw ApiError.conflict(`Customer with name '${trimmedName}' already exists`);
        }
      }
    }

    // 3. Validate Phone Uniqueness if updating phone
    if (validated.phone !== undefined && validated.phone !== null) {
      const trimmedPhone = validated.phone.trim();
      if (trimmedPhone !== existing.phone) {
        const duplicatePhone = await this.customerRepo.findByPhone(trimmedPhone);
        if (duplicatePhone && duplicatePhone.id !== id) {
          throw ApiError.conflict(`Customer with phone '${trimmedPhone}' already exists`);
        }
      }
    }

    const updateData: Prisma.CustomerUpdateInput = {};
    if (validated.code !== undefined) updateData.code = validated.code.trim().toUpperCase();
    if (validated.name !== undefined) updateData.name = validated.name.trim();
    if (validated.email !== undefined) updateData.email = validated.email;
    if (validated.phone !== undefined) updateData.phone = validated.phone;
    if (validated.address !== undefined) updateData.address = validated.address;
    if (validated.creditLimit !== undefined) {
      updateData.creditLimit = new Prisma.Decimal(validated.creditLimit);
    }

    const updated = await this.customerRepo.update(id, updateData);
    const aggMap = await this.customerRepo.getSalesAggregates([id]);
    const agg = aggMap[id] || { totalOrders: 0, totalSpent: 0, lastPurchaseDate: null };

    const totalSpent = Math.round((agg.totalSpent || Number(updated.totalSpent) || 0) * 100) / 100;
    const totalOrders = agg.totalOrders || updated._count?.sales || 0;
    const averageOrderValue =
      totalOrders > 0 ? Math.round((totalSpent / totalOrders) * 100) / 100 : 0;
    const segment = this.calculateSegment(
      updated.code,
      totalSpent,
      totalOrders,
      agg.lastPurchaseDate,
      updated.createdAt
    );

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      creditLimit: Number(updated.creditLimit),
      totalSpent,
      totalOrders,
      averageOrderValue,
      lastPurchaseDate: agg.lastPurchaseDate,
      segment,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  public async deleteCustomer(id: string): Promise<{ id: string; name: string; code: string }> {
    const existing = await this.customerRepo.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Customer with ID '${id}' was not found`);
    }

    // Barrier 1: System Walk-in record cannot be deleted
    if (existing.code === WALK_IN_CUSTOMER_CODE) {
      throw ApiError.badRequest('The system Walk-in Customer record cannot be deleted.');
    }

    // Barrier 2: Safe Deletion - cannot delete customer with sales history
    const salesCount = await this.customerRepo.hasSales(id);
    if (salesCount > 0) {
      throw ApiError.badRequest(
        `Cannot delete customer '${existing.name}' (Code: ${existing.code}) because they have ${salesCount} associated sales invoice(s). Please retain the profile to preserve sales audit records.`
      );
    }

    await this.customerRepo.delete(id);
    return { id: existing.id, name: existing.name, code: existing.code };
  }

  public async getWalkInCustomer(): Promise<CustomerItemResponse> {
    const walkIn = await this.customerRepo.getOrCreateWalkInCustomer();
    const aggMap = await this.customerRepo.getSalesAggregates([walkIn.id]);
    const agg = aggMap[walkIn.id] || { totalOrders: 0, totalSpent: 0, lastPurchaseDate: null };

    return {
      id: walkIn.id,
      code: walkIn.code,
      name: walkIn.name,
      email: walkIn.email,
      phone: walkIn.phone,
      address: walkIn.address,
      creditLimit: Number(walkIn.creditLimit),
      totalSpent: agg.totalSpent,
      totalOrders: agg.totalOrders,
      averageOrderValue: agg.totalOrders > 0 ? Math.round((agg.totalSpent / agg.totalOrders) * 100) / 100 : 0,
      lastPurchaseDate: agg.lastPurchaseDate,
      segment: 'WALK_IN',
      createdAt: walkIn.createdAt,
      updatedAt: walkIn.updatedAt,
    };
  }

  public async generateNextCustomerCode(): Promise<string> {
    const latestCode = await this.customerRepo.getLatestCode();
    if (!latestCode) {
      return 'CUST-001';
    }

    const match = latestCode.match(/^CUST-(\d+)$/i);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `CUST-${nextNum.toString().padStart(3, '0')}`;
    }

    const total = await this.customerRepo.count();
    return `CUST-${(total + 1).toString().padStart(3, '0')}`;
  }
}

export const customerService = new CustomerService();
