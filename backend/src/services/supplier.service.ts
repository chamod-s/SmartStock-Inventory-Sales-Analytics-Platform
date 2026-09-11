import { Prisma } from '@prisma/client';
import {
  SupplierRepository,
  supplierRepository as defaultSupplierRepo,
  SupplierWithDetails,
} from '../repositories/supplier.repository';
import {
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierQueryInput,
  createSupplierSchema,
  updateSupplierSchema,
} from '../validators/supplier.validator';
import { ApiError } from '../utils/apiError';
import { IPaginatedData } from '../types';

export interface SupplierItemResponse {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  totalPurchases: number;
  totalPurchaseAmount: number;
}

export interface PurchaseHistoryItem {
  id: string;
  purchaseOrderNumber: string;
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
    unitCost: number;
    subtotal: number;
    product: {
      id: string;
      name: string;
      sku: string;
      unit: string;
    };
  }>;
}

export interface SupplierDetailResponse extends SupplierItemResponse {
  purchaseHistory: PurchaseHistoryItem[];
}

export interface SupplierListResult extends IPaginatedData<SupplierItemResponse> {
  stats?: {
    totalSuppliers: number;
    activeSuppliers: number;
    totalPurchases: number;
    totalSpend: number;
  };
}

export class SupplierService {
  constructor(private supplierRepo: SupplierRepository = defaultSupplierRepo) {}

  public async listSuppliers(query: SupplierQueryInput): Promise<SupplierListResult> {
    const {
      page = 1,
      limit = 10,
      search,
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.SupplierWhereInput = {};

    // 1. Multi-field search
    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
        { contactPerson: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    // 2. Status filter
    if (status === 'ACTIVE') {
      where.isActive = true;
    } else if (status === 'INACTIVE') {
      where.isActive = false;
    }

    // 3. Sorting & Pagination
    const isCustomSort = sortBy === 'totalPurchases' || sortBy === 'totalPurchaseAmount';
    const orderBy: Prisma.SupplierOrderByWithRelationInput = !isCustomSort
      ? { [sortBy]: sortOrder }
      : { createdAt: 'desc' };

    const skip = (page - 1) * limit;
    const take = limit;

    const [rawSuppliers, totalItems, globalStats] = await Promise.all([
      this.supplierRepo.findMany({
        where,
        orderBy,
        skip: isCustomSort ? undefined : skip,
        take: isCustomSort ? undefined : take,
      }),
      this.supplierRepo.count(where),
      this.supplierRepo.getGlobalStats(),
    ]);

    const supplierIds = rawSuppliers.map((s) => s.id);
    const purchaseSums = await this.supplierRepo.getPurchasesSumsBySupplierIds(supplierIds);

    let items: SupplierItemResponse[] = rawSuppliers.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      contactPerson: s.contactPerson,
      email: s.email,
      phone: s.phone,
      address: s.address,
      taxId: s.taxId,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      totalPurchases: s._count?.purchases ?? 0,
      totalPurchaseAmount: purchaseSums[s.id] ?? 0,
    }));

    if (isCustomSort) {
      items.sort((a, b) => {
        const valA = sortBy === 'totalPurchases' ? a.totalPurchases : a.totalPurchaseAmount;
        const valB = sortBy === 'totalPurchases' ? b.totalPurchases : b.totalPurchaseAmount;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
      items = items.slice(skip, skip + take);
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
      stats: globalStats,
    };
  }

  public async getSupplierById(id: string): Promise<SupplierDetailResponse> {
    const supplier = (await this.supplierRepo.findById(id, true)) as SupplierWithDetails | null;
    if (!supplier) {
      throw ApiError.notFound(`Supplier with ID '${id}' was not found`);
    }

    const purchaseHistory: PurchaseHistoryItem[] = (supplier.purchases || []).map((p) => ({
      id: p.id,
      purchaseOrderNumber: p.purchaseOrderNumber,
      totalAmount: Number(p.totalAmount),
      status: p.status,
      notes: p.notes,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      user: p.user,
      items: (p.items || []).map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unitCost: Number(item.unitCost),
        subtotal: Number(item.subtotal),
        product: item.product,
      })),
    }));

    const totalPurchaseAmount = purchaseHistory.reduce((sum, p) => sum + p.totalAmount, 0);

    return {
      id: supplier.id,
      code: supplier.code,
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      taxId: supplier.taxId,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
      totalPurchases: purchaseHistory.length,
      totalPurchaseAmount: Math.round(totalPurchaseAmount * 100) / 100,
      purchaseHistory,
    };
  }

  public async createSupplier(input: CreateSupplierInput): Promise<SupplierItemResponse> {
    const validated = createSupplierSchema.parse(input);

    // 1. Generate or Validate Supplier Code
    let finalCode = validated.code?.trim().toUpperCase();
    if (!finalCode) {
      finalCode = await this.generateNextSupplierCode();
    } else {
      const existingWithCode = await this.supplierRepo.findByCode(finalCode);
      if (existingWithCode) {
        throw ApiError.conflict(`Supplier with code '${finalCode}' already exists`);
      }
    }

    // 2. Validate Supplier Name Uniqueness (case-insensitive)
    const existingWithName = await this.supplierRepo.findByName(validated.name.trim());
    if (existingWithName) {
      throw ApiError.conflict(`Supplier with name '${validated.name.trim()}' already exists`);
    }

    // 3. Create Supplier
    const created = await this.supplierRepo.create({
      code: finalCode,
      name: validated.name.trim(),
      contactPerson: validated.contactPerson ?? null,
      email: validated.email ?? null,
      phone: validated.phone ?? null,
      address: validated.address ?? null,
      taxId: validated.taxId ?? null,
      isActive: validated.isActive ?? true,
    });

    return {
      id: created.id,
      code: created.code,
      name: created.name,
      contactPerson: created.contactPerson,
      email: created.email,
      phone: created.phone,
      address: created.address,
      taxId: created.taxId,
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      totalPurchases: 0,
      totalPurchaseAmount: 0,
    };
  }

  public async updateSupplier(id: string, input: UpdateSupplierInput): Promise<SupplierItemResponse> {
    const validated = updateSupplierSchema.parse(input);

    const existing = await this.supplierRepo.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Supplier with ID '${id}' was not found`);
    }

    // 1. Validate Code Uniqueness if updating code
    if (validated.code !== undefined && validated.code !== null) {
      const normalizedCode = validated.code.trim().toUpperCase();
      if (normalizedCode !== existing.code) {
        const duplicateCode = await this.supplierRepo.findByCode(normalizedCode);
        if (duplicateCode && duplicateCode.id !== id) {
          throw ApiError.conflict(`Supplier with code '${normalizedCode}' already exists`);
        }
      }
    }

    // 2. Validate Name Uniqueness if updating name
    if (validated.name !== undefined && validated.name !== null) {
      const trimmedName = validated.name.trim();
      if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicateName = await this.supplierRepo.findByName(trimmedName);
        if (duplicateName && duplicateName.id !== id) {
          throw ApiError.conflict(`Supplier with name '${trimmedName}' already exists`);
        }
      }
    }

    // 3. Prepare Update Payload
    const updateData: Prisma.SupplierUpdateInput = {};
    if (validated.code !== undefined) updateData.code = validated.code.trim().toUpperCase();
    if (validated.name !== undefined) updateData.name = validated.name.trim();
    if (validated.contactPerson !== undefined) updateData.contactPerson = validated.contactPerson;
    if (validated.email !== undefined) updateData.email = validated.email;
    if (validated.phone !== undefined) updateData.phone = validated.phone;
    if (validated.address !== undefined) updateData.address = validated.address;
    if (validated.taxId !== undefined) updateData.taxId = validated.taxId;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

    const updated = await this.supplierRepo.update(id, updateData);
    const purchaseSum = await this.supplierRepo.getSupplierPurchasesSum(id);

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      contactPerson: updated.contactPerson,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      taxId: updated.taxId,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      totalPurchases: updated._count?.purchases ?? 0,
      totalPurchaseAmount: purchaseSum,
    };
  }

  public async deleteSupplier(id: string): Promise<{ id: string; name: string; code: string }> {
    const existing = await this.supplierRepo.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Supplier with ID '${id}' was not found`);
    }

    // Safe Deletion Integrity: Check for attached purchase orders
    const purchaseCount = await this.supplierRepo.hasPurchases(id);
    if (purchaseCount > 0) {
      throw ApiError.badRequest(
        `Cannot delete supplier '${existing.name}' (Code: ${existing.code}) because it has ${purchaseCount} associated purchase order(s). Please deactivate the supplier by setting its status to INACTIVE instead.`
      );
    }

    await this.supplierRepo.delete(id);
    return { id: existing.id, name: existing.name, code: existing.code };
  }

  public async generateNextSupplierCode(): Promise<string> {
    const latestCode = await this.supplierRepo.getLatestCode();
    if (!latestCode) {
      return 'SUP-001';
    }

    const match = latestCode.match(/^SUP-(\d+)$/i);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `SUP-${nextNum.toString().padStart(3, '0')}`;
    }

    // If latest code does not follow standard pattern, find count + 1
    const total = await this.supplierRepo.count();
    return `SUP-${(total + 1).toString().padStart(3, '0')}`;
  }
}

export const supplierService = new SupplierService();
