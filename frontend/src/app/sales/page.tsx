'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Plus, Receipt } from 'lucide-react';

interface SaleTransaction {
  id: string;
  invoiceNumber: string;
  customer: string;
  totalAmount: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

const mockSales: SaleTransaction[] = [
  { id: '1', invoiceNumber: 'INV-2026-1001', customer: 'Acme Corporation', totalAmount: '$1,250.00', paymentMethod: 'CARD', status: 'COMPLETED', createdAt: '2026-03-09' },
  { id: '2', invoiceNumber: 'INV-2026-1002', customer: 'Walk-in Customer', totalAmount: '$89.99', paymentMethod: 'CASH', status: 'COMPLETED', createdAt: '2026-03-09' },
];

export default function SalesPage() {
  const columns: Column<SaleTransaction>[] = [
    { header: 'Invoice #', accessorKey: 'invoiceNumber', sortable: true },
    { header: 'Customer', accessorKey: 'customer', sortable: true },
    { header: 'Total Paid', cell: (r) => <span className="font-semibold text-emerald-400">{r.totalAmount}</span> },
    { header: 'Payment Method', cell: (r) => <StatusBadge status={r.paymentMethod} /> },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { header: 'Date', accessorKey: 'createdAt' },
  ];

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
      <PageHeader
        title="Sales & Point of Sale (POS)"
        description="Process checkout transactions, generate invoices, and inspect order histories."
        breadcrumbs={[{ label: 'Sales' }]}
        actions={
          <button className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Launch POS Register
          </button>
        }
      />
      <DataTable columns={columns} data={mockSales} searchKey="invoiceNumber" searchPlaceholder="Search invoice numbers..." />
    </DashboardLayout>
  );
}
