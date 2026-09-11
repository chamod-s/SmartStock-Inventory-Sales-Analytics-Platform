export type PurchaseStatus = 'PENDING' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseItemProduct {
  id: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  purchasePrice: number;
  sellingPrice: number;
}

export interface PurchaseItemDetail {
  id: string;
  purchaseId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  product: PurchaseItemProduct;
}

export interface InventoryTransactionDetail {
  id: string;
  productId: string;
  userId: string | null;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PurchaseSupplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address?: string | null;
}

export interface PurchaseUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface PurchaseListItem {
  id: string;
  purchaseOrderNumber: string;
  supplierId: string;
  userId: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: PurchaseStatus;
  notes: string | null;
  purchaseDate: string;
  createdAt: string;
  updatedAt: string;
  supplier: PurchaseSupplier;
  user: PurchaseUser;
  items?: PurchaseItemDetail[];
  _count?: {
    items: number;
  };
}

export interface PurchaseDetail extends PurchaseListItem {
  items: PurchaseItemDetail[];
  inventoryTransactions?: InventoryTransactionDetail[];
}

export interface PurchaseSummary {
  totalPurchases: number;
  totalSpend: number;
  receivedCount: number;
  pendingCount: number;
  cancelledCount: number;
}

export interface CreatePurchaseItemPayload {
  productId: string;
  quantity: number;
  unitCost: number;
  subtotal?: number;
}

export interface CreatePurchasePayload {
  supplierId: string;
  purchaseOrderNumber?: string;
  purchaseDate?: string;
  status?: PurchaseStatus;
  items: CreatePurchaseItemPayload[];
  discount?: number;
  tax?: number;
  notes?: string;
}
