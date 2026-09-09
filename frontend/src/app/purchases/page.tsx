'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Plus } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  totalAmount: string;
  status: string;
  createdAt: string;
}

const mockPurchases: PurchaseOrder[] = [
  { id: '1', poNumber: 'PO-2026-089', supplier: 'TechLogix Wholesalers', totalAmount: '$4,250.00', status: 'RECEIVED', createdAt: '2026-03-01' },
  { id: '2', poNumber: 'PO-2026-090', supplier: 'Global Office Supplies', totalAmount: '$1,800.00', status: 'PENDING', createdAt: '2026-03-04' },
];

export default function PurchasesPage() {
  const columns: Column<PurchaseOrder>[] = [
    { header: 'PO Number', accessorKey: 'poNumber', sortable: true },
    { header: 'Supplier Name', accessorKey: 'supplier', sortable: true },
    { header: 'Total Cost', cell: (r) => <span className="font-semibold text-slate-100">{r.totalAmount}</span> },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { header: 'Order Date', accessorKey: 'createdAt' },
  ];

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      <PageHeader
        title="Purchase Orders"
        description="Track inventory stock replenishment orders and supplier invoicing."
        breadcrumbs={[{ label: 'Purchases' }]}
        actions={
          <button className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Purchase Order
          </button>
        }
      />
      <DataTable columns={columns} data={mockPurchases} searchKey="poNumber" searchPlaceholder="Search purchase orders..." />
    </DashboardLayout>
  );
}
