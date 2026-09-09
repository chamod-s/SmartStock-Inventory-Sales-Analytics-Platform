'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Plus } from 'lucide-react';

interface SupplierItem {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: string;
}

const mockSuppliers: SupplierItem[] = [
  { id: '1', code: 'SUP-001', name: 'TechLogix Wholesalers', contactPerson: 'David Miller', email: 'sales@techlogix.com', phone: '+1 555-0192', status: 'ACTIVE' },
  { id: '2', code: 'SUP-002', name: 'Global Office Supplies', contactPerson: 'Sarah Jenkins', email: 'info@globalsupplies.com', phone: '+1 555-0143', status: 'ACTIVE' },
];

export default function SuppliersPage() {
  const columns: Column<SupplierItem>[] = [
    { header: 'Supplier Code', accessorKey: 'code', sortable: true },
    { header: 'Company Name', accessorKey: 'name', sortable: true },
    { header: 'Contact Person', accessorKey: 'contactPerson' },
    { header: 'Email Address', accessorKey: 'email' },
    { header: 'Phone Number', accessorKey: 'phone' },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      <PageHeader
        title="Suppliers Directory"
        description="Manage vendor details, purchasing contacts, and supply partners."
        breadcrumbs={[{ label: 'Suppliers' }]}
        actions={
          <button className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        }
      />
      <DataTable columns={columns} data={mockSuppliers} searchKey="name" searchPlaceholder="Search suppliers..." />
    </DashboardLayout>
  );
}
