export type SaleStatus = 'COMPLETED' | 'REFUNDED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'ONLINE';

export interface SaleCustomer {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface SaleUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface SaleProductInfo {
  id: string;
  name: string;
  sku: string;
  unit: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface SaleItemDetail {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
  product: SaleProductInfo;
}

export interface SalePayment {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef: string | null;
  paidAt: string;
}

export interface SaleListItem {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  userId: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: SaleStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: SaleCustomer | null;
  user: SaleUser;
  items: SaleItemDetail[];
  payments: SalePayment[];
  totalPaid?: number;
  balanceRemaining?: number;
  paymentStatus?: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  _count?: {
    items: number;
  };
}

export interface SaleDetail extends SaleListItem {
  items: SaleItemDetail[];
  payments: SalePayment[];
}

export interface SaleSummary {
  totalSales: number;
  totalRevenue: number;
  completedCount: number;
  refundedCount: number;
  cancelledCount: number;
}

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  subtotal: number;
}

export interface CreateSalePayload {
  customerId?: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice?: number;
  }>;
  discountAmount?: number;
  taxAmount?: number;
  paymentMethod: PaymentMethod;
  amountPaid?: number;
  transactionRef?: string | null;
  notes?: string | null;
}
