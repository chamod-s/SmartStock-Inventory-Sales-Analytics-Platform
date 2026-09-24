export interface BusinessInfo {
  name: string;
  legalName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  currency: string;
  terms: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  paymentMethod: string;
  transactionRef: string | null;
  paidAt: string;
}

export interface InvoiceDetails {
  business: BusinessInfo;
  id: string;
  invoiceNumber: string;
  date: string;
  formattedDate: string;
  status: string;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  customer: {
    id: string | null;
    code: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  cashier: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  totalPaid: number;
  balanceRemaining: number;
  payments: InvoicePayment[];
  paymentMethod: string;
  notes: string | null;
}

export interface InvoiceSummaryItem {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  cashierName: string;
  totalAmount: number;
  totalPaid: number;
  balanceRemaining: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  itemCount: number;
}

export interface InvoiceListResponse {
  items: InvoiceSummaryItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  business: BusinessInfo;
}
