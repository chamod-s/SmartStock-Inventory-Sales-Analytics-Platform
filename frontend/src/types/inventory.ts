export type TransactionType = 'PURCHASE' | 'SALE' | 'RETURN' | 'DAMAGE' | 'ADJUSTMENT';

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryCategory {
  id: string;
  name: string;
  slug: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  status: string;
  stockValue: number;
  retailValue: number;
  stockStatus: StockStatus;
  category: InventoryCategory;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryTransactionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface InventoryTransactionProduct {
  id: string;
  name: string;
  sku: string;
  unit: string;
  category?: string;
}

export interface InventoryTransactionItem {
  id: string;
  date: string;
  productId: string;
  product: InventoryTransactionProduct;
  type: TransactionType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  user: InventoryTransactionUser | null;
  reference: string | null;
  createdAt: string;
}

export interface InventorySummary {
  totalProducts: number;
  totalStockUnits: number;
  totalValuation: number;
  totalRetailValuation: number;
  potentialProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
}

export interface LowStockAlertItem extends InventoryItem {
  deficit: number;
  severity: 'CRITICAL' | 'WARNING';
}

export interface InventoryAdjustmentPayload {
  productId: string;
  type: TransactionType;
  mode: 'ADD' | 'DEDUCT' | 'SET' | 'DELTA';
  quantity?: number;
  targetStock?: number;
  reason: string;
  reference?: string;
}

export interface InventoryPaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
