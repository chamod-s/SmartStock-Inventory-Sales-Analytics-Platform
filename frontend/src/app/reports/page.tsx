'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { FileSpreadsheet, Download, Calendar } from 'lucide-react';

const reportTypes = [
  { id: 'inventory-valuation', title: 'Inventory Valuation Report', desc: 'Total asset cost, selling price potential, and stock health breakdown.', format: 'PDF / Excel' },
  { id: 'sales-summary', title: 'Sales Performance Summary', desc: 'Detailed invoice breakdown, tax calculations, and cashier audit logs.', format: 'PDF / CSV' },
  { id: 'profit-loss', title: 'Profit & Loss Statement', desc: 'Revenue minus cost of goods sold (COGS) and store operational expenses.', format: 'PDF / Excel' },
  { id: 'supplier-ledger', title: 'Supplier Accounts Ledger', desc: 'Outstanding balances, purchase order history, and payment tracking.', format: 'PDF / CSV' },
];

export default function ReportsPage() {
  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      <PageHeader
        title="Business Reports & Exports"
        description="Generate and download compliance reports, inventory valuation statements, and financial summaries."
        breadcrumbs={[{ label: 'Reports' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((r) => (
          <div key={r.id} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">{r.title}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">Format: {r.format}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-6">{r.desc}</p>
            </div>
            <button className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2">
              <Download className="w-4 h-4 text-brand-400" />
              Generate & Download
            </button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
