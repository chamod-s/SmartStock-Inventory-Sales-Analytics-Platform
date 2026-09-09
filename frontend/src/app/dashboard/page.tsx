'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const salesChartData = [
  { day: 'Mon', sales: 4200, profit: 1100 },
  { day: 'Tue', sales: 5800, profit: 1650 },
  { day: 'Wed', sales: 7100, profit: 2100 },
  { day: 'Thu', sales: 6400, profit: 1800 },
  { day: 'Fri', sales: 9200, profit: 2850 },
  { day: 'Sat', sales: 11500, profit: 3400 },
  { day: 'Sun', sales: 8900, profit: 2400 },
];

const recentSales = [
  { id: 'INV-2026-001', customer: 'Acme Corp', amount: '$1,250.00', status: 'COMPLETED', method: 'CARD', time: '10 mins ago' },
  { id: 'INV-2026-002', customer: 'Global Tech', amount: '$430.50', status: 'COMPLETED', method: 'CASH', time: '25 mins ago' },
  { id: 'INV-2026-003', customer: 'Walk-in Customer', amount: '$89.99', status: 'COMPLETED', method: 'CASH', time: '1 hour ago' },
  { id: 'INV-2026-004', customer: 'Metro Retail', amount: '$2,100.00', status: 'PENDING', method: 'BANK_TRANSFER', time: '2 hours ago' },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome back, ${user?.name || 'User'} 👋`}
        description="Here is your real-time inventory performance and sales overview for today."
        actions={
          <div className="flex items-center gap-3">
            <a
              href="/sales"
              className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Sale / POS
            </a>
          </div>
        }
      />

      {/* KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Total Revenue (7d)</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white tracking-tight">$53,100.00</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-400">
            <ArrowUpRight className="w-4 h-4" />
            <span>+14.2% from last week</span>
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Total Products</span>
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white tracking-tight">1,420 Items</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-slate-400">
            <span>30 Categories active</span>
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Low Stock Warning</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 tracking-tight">8 Products</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-amber-400">
            <span>Requires reorder alert</span>
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Total Customers</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white tracking-tight">384 Accounts</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-400">
            <ArrowUpRight className="w-4 h-4" />
            <span>+8 new this week</span>
          </div>
        </div>
      </div>

      {/* Main Analytics Chart & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Sales Performance Chart (Recharts) */}
        <div className="lg:col-span-2 p-6 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-100">Weekly Revenue & Net Profit Trend</h3>
              <p className="text-xs text-slate-400">Comparing gross sales against net operating profit</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-brand-500" />
                <span className="text-slate-300">Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-300">Profit</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Checkout Activity */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-100">Recent Transactions</h3>
              <a href="/sales" className="text-xs text-brand-400 hover:underline font-medium">
                View All
              </a>
            </div>
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-200">{sale.customer}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{sale.id} • {sale.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-400">{sale.amount}</p>
                    <div className="mt-1">
                      <StatusBadge status={sale.method} size="sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
