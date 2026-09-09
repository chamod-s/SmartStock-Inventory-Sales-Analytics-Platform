'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SlidersHorizontal } from 'lucide-react';

interface InventoryTx {
  id: string;
  product: string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  createdAt: string;
}

const mockTx: InventoryTx[] = [
  { id: '1', product: 'Wireless Bluetooth Mouse', type: 'PURCHASE', quantity: +50, stockBefore: 0, stockAfter: 50, createdAt: '2026-03-01' },
  { id: '2', product: 'Wireless Bluetooth Mouse', type: 'SALE', quantity: -5, stockBefore: 50, stockAfter: 45, createdAt: '2026-03-09' },
];

export default function InventoryPage() {
  const columns: Column<InventoryTx>[] = [
    { header: 'Product Name', accessorKey: 'product', sortable: true },
    { header: 'Transaction Type', cell: (r) => <StatusBadge status={r.type} /> },
    { header: 'Quantity Change', cell: (r) => <span className={r.quantity > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{r.quantity > 0 ? `+${r.quantity}` : r.quantity}</span> },
    { header: 'Stock Before', accessorKey: 'stockBefore' },
    { header: 'Stock After', accessorKey: 'stockAfter' },
    { header: 'Timestamp', accessorKey: 'createdAt' },
  ];

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      <PageHeader
        title="Inventory Audit Log & Adjustments"
        description="Inspect stock movement history, damage write-offs, and physical count adjustments."
        breadcrumbs={[{ label: 'Inventory' }]}
        actions={
          <button className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-brand-400" />
            Stock Adjustment
          </button>
        }
      />
      <DataTable columns={columns} data={mockTx} searchKey="product" searchPlaceholder="Search inventory movements..." />
    </DashboardLayout>
  );
}
