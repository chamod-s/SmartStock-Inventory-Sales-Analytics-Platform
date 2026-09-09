'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Plus } from 'lucide-react';

interface CustomerItem {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  creditLimit: string;
  totalSpent: string;
}

const mockCustomers: CustomerItem[] = [
  { id: '1', code: 'CUST-001', name: 'Acme Corporation', phone: '+1 555-8821', email: 'purchasing@acme.com', creditLimit: '$5,000.00', totalSpent: '$14,250.00' },
  { id: '2', code: 'CUST-002', name: 'Global Tech Solutions', phone: '+1 555-9932', email: 'contact@globaltech.io', creditLimit: '$10,000.00', totalSpent: '$22,890.00' },
];

export default function CustomersPage() {
  const columns: Column<CustomerItem>[] = [
    { header: 'Customer Code', accessorKey: 'code', sortable: true },
    { header: 'Customer Name', accessorKey: 'name', sortable: true },
    { header: 'Phone', accessorKey: 'phone' },
    { header: 'Email', accessorKey: 'email' },
    { header: 'Credit Limit', accessorKey: 'creditLimit' },
    { header: 'Total Spent', cell: (r) => <span className="font-semibold text-emerald-400">{r.totalSpent}</span> },
  ];

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
      <PageHeader
        title="Customer Directory"
        description="View customer profiles, credit limits, and total purchasing history."
        breadcrumbs={[{ label: 'Customers' }]}
        actions={
          <button className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        }
      />
      <DataTable columns={columns} data={mockCustomers} searchKey="name" searchPlaceholder="Search customers..." />
    </DashboardLayout>
  );
}
