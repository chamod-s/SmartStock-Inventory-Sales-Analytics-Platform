export interface SupplierItem {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalPurchases: number;
  totalPurchaseAmount: number;
}

export interface PurchaseHistoryItem {
  id: string;
  purchaseOrderNumber: string;
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

export interface SupplierDetail extends SupplierItem {
  purchaseHistory: PurchaseHistoryItem[];
}

export interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  totalPurchases: number;
  totalSpend: number;
}
