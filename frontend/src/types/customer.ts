export type CustomerSegment =
  | 'VIP'
  | 'LOYAL'
  | 'NEW'
  | 'AT_RISK'
  | 'OCCASIONAL'
  | 'PROSPECT'
  | 'WALK_IN';

export interface CustomerItem {
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
  lastPurchaseDate: string | null;
  segment: CustomerSegment;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
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

export interface CustomerDetail extends CustomerItem {
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

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  avgLifetimeValue: number;
}
