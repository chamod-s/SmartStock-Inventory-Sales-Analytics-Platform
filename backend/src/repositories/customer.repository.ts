import { Customer, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export const WALK_IN_CUSTOMER_CODE = 'CUST-WALKIN';

export type CustomerWithSalesCount = Customer & {
  _count: {
    sales: number;
  };
};

export type CustomerWithSalesDetails = Customer & {
  _count: {
    sales: number;
  };
  sales: Array<{
    id: string;
    invoiceNumber: string;
    subtotal: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
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
      unitPrice: Prisma.Decimal;
      subtotal: Prisma.Decimal;
      product: {
        id: string;
        name: string;
        sku: string;
        unit: string;
      };
    }>;
    payments: Array<{
      id: string;
      amount: Prisma.Decimal;
      paymentMethod: string;
      transactionRef: string | null;
    }>;
  }>;
};

export interface FindCustomersOptions {
  where?: Prisma.CustomerWhereInput;
  orderBy?: Prisma.CustomerOrderByWithRelationInput | Prisma.CustomerOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

export interface CustomerSalesSummary {
  totalOrders: number;
  totalSpent: number;
  lastPurchaseDate: Date | null;
}

export class CustomerRepository {
  public async findById(
    id: string,
    includeSales: boolean = false
  ): Promise<CustomerWithSalesDetails | CustomerWithSalesCount | null> {
    if (includeSales) {
      return prisma.customer.findUnique({
        where: { id },
        include: {
          _count: {
            select: { sales: true },
          },
          sales: {
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      sku: true,
                      unit: true,
                    },
                  },
                },
              },
              payments: {
                select: {
                  id: true,
                  amount: true,
                  paymentMethod: true,
                  transactionRef: true,
                },
              },
            },
          },
        },
      }) as unknown as Promise<CustomerWithSalesDetails | null>;
    }

    return prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });
  }

  public async findByCode(code: string): Promise<Customer | null> {
    return prisma.customer.findUnique({
      where: { code },
    });
  }

  public async findByName(name: string): Promise<Customer | null> {
    return prisma.customer.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
  }

  public async findByPhone(phone: string): Promise<Customer | null> {
    return prisma.customer.findFirst({
      where: { phone },
    });
  }

  public async findMany(options: FindCustomersOptions = {}): Promise<CustomerWithSalesCount[]> {
    const { where, orderBy, skip, take } = options;
    return prisma.customer.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });
  }

  public async count(where?: Prisma.CustomerWhereInput): Promise<number> {
    return prisma.customer.count({ where });
  }

  public async create(data: Prisma.CustomerCreateInput): Promise<CustomerWithSalesCount> {
    return prisma.customer.create({
      data,
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });
  }

  public async update(
    id: string,
    data: Prisma.CustomerUpdateInput
  ): Promise<CustomerWithSalesCount> {
    return prisma.customer.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });
  }

  public async delete(id: string): Promise<Customer> {
    return prisma.customer.delete({
      where: { id },
    });
  }

  public async hasSales(id: string): Promise<number> {
    return prisma.sale.count({
      where: { customerId: id },
    });
  }

  public async getSalesAggregates(customerIds: string[]): Promise<Record<string, CustomerSalesSummary>> {
    const result: Record<string, CustomerSalesSummary> = {};
    if (customerIds.length === 0) return result;

    const sales = await prisma.sale.findMany({
      where: {
        customerId: { in: customerIds },
        status: { not: 'CANCELLED' },
      },
      select: {
        customerId: true,
        totalAmount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    for (const cid of customerIds) {
      result[cid] = {
        totalOrders: 0,
        totalSpent: 0,
        lastPurchaseDate: null,
      };
    }

    for (const sale of sales) {
      if (!sale.customerId) continue;
      const current = result[sale.customerId];
      if (current) {
        current.totalOrders += 1;
        current.totalSpent += Number(sale.totalAmount);
        if (!current.lastPurchaseDate) {
          current.lastPurchaseDate = sale.createdAt;
        }
      }
    }

    return result;
  }

  public async getGlobalStats(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    totalRevenue: number;
    avgLifetimeValue: number;
  }> {
    const [totalCustomers, saleAgg, activeCustomerCount] = await Promise.all([
      prisma.customer.count(),
      prisma.sale.aggregate({
        where: {
          status: { not: 'CANCELLED' },
          customerId: { not: null },
        },
        _sum: { totalAmount: true },
      }),
      prisma.customer.count({
        where: {
          sales: {
            some: {
              status: { not: 'CANCELLED' },
            },
          },
        },
      }),
    ]);

    const totalRevenue = saleAgg._sum.totalAmount ? Number(saleAgg._sum.totalAmount) : 0;
    const avgLifetimeValue =
      activeCustomerCount > 0 ? Math.round((totalRevenue / activeCustomerCount) * 100) / 100 : 0;

    return {
      totalCustomers,
      activeCustomers: activeCustomerCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgLifetimeValue,
    };
  }

  public async getOrCreateWalkInCustomer(): Promise<Customer> {
    let walkIn = await prisma.customer.findUnique({
      where: { code: WALK_IN_CUSTOMER_CODE },
    });

    if (!walkIn) {
      walkIn = await prisma.customer.create({
        data: {
          code: WALK_IN_CUSTOMER_CODE,
          name: 'Walk-in Customer',
          email: null,
          phone: null,
          address: 'In-Store POS Counter',
          creditLimit: new Prisma.Decimal(0.0),
          totalSpent: new Prisma.Decimal(0.0),
        },
      });
    }

    return walkIn;
  }

  public async getLatestCode(): Promise<string | null> {
    const latest = await prisma.customer.findFirst({
      where: {
        code: { startsWith: 'CUST-' },
        NOT: { code: WALK_IN_CUSTOMER_CODE },
      },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    return latest?.code || null;
  }
}

export const customerRepository = new CustomerRepository();
