'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Plus, Package } from 'lucide-react';

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  purchasePrice: string;
  sellingPrice: string;
  currentStock: number;
  status: string;
}

const mockProducts: ProductItem[] = [
  { id: '1', name: 'Wireless Bluetooth Mouse', sku: 'PROD-001', category: 'Electronics', purchasePrice: '$12.00', sellingPrice: '$25.00', currentStock: 45, status: 'ACTIVE' },
  { id: '2', name: 'Mechanical RGB Keyboard', sku: 'PROD-002', category: 'Electronics', purchasePrice: '$45.00', sellingPrice: '$89.99', currentStock: 18, status: 'ACTIVE' },
  { id: '3', name: '27" 4K Gaming Monitor', sku: 'PROD-003', category: 'Monitors', purchasePrice: '$210.00', sellingPrice: '$349.99', currentStock: 5, status: 'ACTIVE' },
  { id: '4', name: 'Ergonomic Office Chair', sku: 'PROD-004', category: 'Furniture', purchasePrice: '$95.00', sellingPrice: '$179.00', currentStock: 0, status: 'INACTIVE' },
];

export default function ProductsPage() {
  const columns: Column<ProductItem>[] = [
    { header: 'SKU', accessorKey: 'sku', sortable: true },
    { header: 'Product Name', accessorKey: 'name', sortable: true },
    { header: 'Category', accessorKey: 'category', sortable: true },
    { header: 'Buy Price', accessorKey: 'purchasePrice' },
    { header: 'Sell Price', accessorKey: 'sellingPrice' },
    {
      header: 'Stock',
      cell: (row) => (
        <span className={`font-semibold ${row.currentStock <= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
          {row.currentStock} pcs
        </span>
      ),
    },
    { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
      <PageHeader
        title="Products Catalog"
        description="Manage product listings, SKU codes, inventory pricing, and stock levels."
        breadcrumbs={[{ label: 'Products' }]}
        actions={
          <button className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
        }
      />
      <DataTable columns={columns} data={mockProducts} searchKey="name" searchPlaceholder="Search products by name or SKU..." />
    </DashboardLayout>
  );
}
