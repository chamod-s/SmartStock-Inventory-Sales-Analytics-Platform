'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UserPlus } from 'lucide-react';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

const mockUsers: UserRecord[] = [
  { id: '1', name: 'System Administrator', email: 'admin@smartstock.com', role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-01-01' },
  { id: '2', name: 'Marcus Manager', email: 'manager1@smartstock.com', role: 'MANAGER', status: 'ACTIVE', createdAt: '2026-01-05' },
  { id: '3', name: 'Alex Cashier', email: 'cashier1@smartstock.com', role: 'CASHIER', status: 'ACTIVE', createdAt: '2026-01-10' },
];

export default function UsersPage() {
  const columns: Column<UserRecord>[] = [
    { header: 'Full Name', accessorKey: 'name', sortable: true },
    { header: 'Email Address', accessorKey: 'email', sortable: true },
    { header: 'Assigned Role', cell: (r) => <StatusBadge status={r.role} /> },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { header: 'Created Date', accessorKey: 'createdAt' },
  ];

  return (
    <DashboardLayout allowedRoles={['ADMIN']}>
      <PageHeader
        title="User Management & Role Permissions"
        description="Admin exclusive portal to create accounts, assign roles (Admin, Manager, Cashier), and revoke access."
        breadcrumbs={[{ label: 'Users' }]}
        actions={
          <button className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Create User Account
          </button>
        }
      />
      <DataTable columns={columns} data={mockUsers} searchKey="name" searchPlaceholder="Search users by name or email..." />
    </DashboardLayout>
  );
}
