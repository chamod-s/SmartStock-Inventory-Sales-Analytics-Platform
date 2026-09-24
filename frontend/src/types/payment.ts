import { PaymentMethod, SaleCustomer, SaleUser } from './sale';

export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';

export interface PaymentItem {
  id: string;
  saleId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef: string | null;
  paidAt: string;
  paymentStatus?: PaymentStatus;
  balanceRemaining?: number;
  totalPaid?: number;
  sale?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
    customer: SaleCustomer | null;
    user: SaleUser;
    payments?: Array<{ amount: number }>;
  };
}

export interface PaymentSummary {
  totalPayments: number;
  totalAmount: number;
  cashTotal: number;
  cardTotal: number;
  bankTransferTotal: number;
  onlineTotal: number;
}

export interface CreatePaymentPayload {
  saleId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string | null;
  paidAt?: string;
}

export interface RecordPaymentResponse {
  payment: PaymentItem;
  saleId: string;
  invoiceNumber: string;
  totalAmount: number;
  amountPaid: number;
  totalPaid: number;
  balanceRemaining: number;
  paymentStatus: PaymentStatus;
}
