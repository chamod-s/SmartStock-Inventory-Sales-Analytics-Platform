'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Plus } from 'lucide-react';

interface ExpenseItem {
  id: string;
  category: string;
  amount: string;
  description: string;
  expenseDate: string;
}

const mockExpenses: ExpenseItem[] = [
  { id: '1', category: 'Utilities', amount: '$450.00', description: 'Store Electricity Bill', expenseDate: '2026-03-01' },
  { id: '2', category: 'Logistics', amount: '$120.00', description: 'Supplier Freight Delivery Fee', expenseDate: '2026-03-05' },
];

export default function ExpensesPage() {
  const columns: Column<ExpenseItem>[] = [
    { header: 'Expense Category', accessorKey: 'category', sortable: true },
    { header: 'Description', accessorKey: 'description' },
    { header: 'Amount', cell: (r) => <span className="font-semibold text-rose-400">{r.amount}</span> },
    { header: 'Date', accessorKey: 'expenseDate' },
  ];

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      <PageHeader
        title="Expense Tracker"
        description="Record store overhead, logistics, utilities, and operating expenditures."
        breadcrumbs={[{ label: 'Expenses' }]}
        actions={
          <button className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Record New Expense
          </button>
        }
      />
      <DataTable columns={columns} data={mockExpenses} searchKey="description" searchPlaceholder="Search expense logs..." />
    </DashboardLayout>
  );
}
