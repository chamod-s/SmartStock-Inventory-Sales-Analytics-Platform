import { Category, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export type CategoryWithProductCount = Category & {
  _count: {
    products: number;
  };
};

export interface FindCategoriesOptions {
  where?: Prisma.CategoryWhereInput;
  orderBy?: Prisma.CategoryOrderByWithRelationInput | Prisma.CategoryOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

export class CategoryRepository {
  public async findById(id: string): Promise<CategoryWithProductCount | null> {
    return prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  public async findBySlug(slug: string): Promise<Category | null> {
    return prisma.category.findUnique({
      where: { slug },
    });
  }

  public async findByName(name: string): Promise<Category | null> {
    return prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
  }

  public async findMany(options: FindCategoriesOptions = {}): Promise<CategoryWithProductCount[]> {
    const { where, orderBy, skip, take } = options;
    return prisma.category.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  public async count(where?: Prisma.CategoryWhereInput): Promise<number> {
    return prisma.category.count({ where });
  }

  public async create(data: Prisma.CategoryCreateInput): Promise<CategoryWithProductCount> {
    return prisma.category.create({
      data,
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  public async update(
    id: string,
    data: Prisma.CategoryUpdateInput
  ): Promise<CategoryWithProductCount> {
    return prisma.category.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  public async delete(id: string): Promise<Category> {
    return prisma.category.delete({
      where: { id },
    });
  }
}

export const categoryRepository = new CategoryRepository();
