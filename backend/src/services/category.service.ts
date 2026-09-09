import { Prisma } from '@prisma/client';
import {
  CategoryRepository,
  categoryRepository as defaultCategoryRepo,
  CategoryWithProductCount,
} from '../repositories/category.repository';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryQueryInput,
} from '../validators/category.validator';
import { ApiError } from '../utils/apiError';
import { IPaginatedData } from '../types';

export class CategoryService {
  constructor(private categoryRepo: CategoryRepository = defaultCategoryRepo) {}

  public slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  public async listCategories(
    query: CategoryQueryInput
  ): Promise<IPaginatedData<CategoryWithProductCount>> {
    const { page = 1, limit = 10, search, status = 'all', sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: Prisma.CategoryWhereInput = {};

    // Search filter across name, slug, and description
    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    // Active status filter
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Sorting
    let orderBy: Prisma.CategoryOrderByWithRelationInput | Prisma.CategoryOrderByWithRelationInput[];
    if (sortBy === 'name') {
      orderBy = { name: sortOrder };
    } else if (sortBy === 'productCount') {
      orderBy = { products: { _count: sortOrder } };
    } else {
      orderBy = { createdAt: sortOrder };
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const [items, totalItems] = await Promise.all([
      this.categoryRepo.findMany({ where, orderBy, skip, take }),
      this.categoryRepo.count(where),
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
    };
  }

  public async getCategoryById(id: string): Promise<CategoryWithProductCount> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw ApiError.notFound(`Category with ID '${id}' was not found`);
    }
    return category;
  }

  public async createCategory(
    input: CreateCategoryInput
  ): Promise<CategoryWithProductCount> {
    const name = input.name.trim();
    const slug = (input.slug && input.slug.trim()) || this.slugify(name);

    if (!slug) {
      throw ApiError.badRequest('Unable to generate valid slug from category name');
    }

    // Check unique name
    const existingName = await this.categoryRepo.findByName(name);
    if (existingName) {
      throw ApiError.conflict(`Category with name '${name}' already exists`);
    }

    // Check unique slug
    const existingSlug = await this.categoryRepo.findBySlug(slug);
    if (existingSlug) {
      throw ApiError.conflict(`Category with slug '${slug}' already exists`);
    }

    return this.categoryRepo.create({
      name,
      slug,
      description: input.description,
      isActive: input.isActive ?? true,
    });
  }

  public async updateCategory(
    id: string,
    input: UpdateCategoryInput
  ): Promise<CategoryWithProductCount> {
    const existing = await this.categoryRepo.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Category with ID '${id}' was not found`);
    }

    const updateData: Prisma.CategoryUpdateInput = {};

    // Validate Name if provided
    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicateName = await this.categoryRepo.findByName(trimmedName);
        if (duplicateName && duplicateName.id !== id) {
          throw ApiError.conflict(`Category with name '${trimmedName}' already exists`);
        }
      }
      updateData.name = trimmedName;
    }

    // Validate Slug if provided
    if (input.slug !== undefined) {
      const trimmedSlug = input.slug.trim();
      if (trimmedSlug !== existing.slug) {
        const duplicateSlug = await this.categoryRepo.findBySlug(trimmedSlug);
        if (duplicateSlug && duplicateSlug.id !== id) {
          throw ApiError.conflict(`Category with slug '${trimmedSlug}' already exists`);
        }
      }
      updateData.slug = trimmedSlug;
    }

    // Update description if provided
    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    // Update isActive if provided
    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }

    return this.categoryRepo.update(id, updateData);
  }

  public async deleteCategory(id: string): Promise<{ id: string; name: string }> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw ApiError.notFound(`Category with ID '${id}' was not found`);
    }

    // Prevent unsafe deletion of categories with attached products
    if (category._count.products > 0) {
      throw ApiError.badRequest(
        `Cannot delete category '${category.name}' because it contains ${category._count.products} associated product(s). Please reassign or delete the products first, or deactivate the category instead.`
      );
    }

    await this.categoryRepo.delete(id);
    return { id: category.id, name: category.name };
  }
}

export const categoryService = new CategoryService();
