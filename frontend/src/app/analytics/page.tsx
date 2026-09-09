'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const categoryData = [
  { name: 'Electronics', value: 45 },
  { name: 'Computers', value: 25 },
  { name: 'Furniture', value: 15 },
  { name: 'Monitors', value: 15 },
];

const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6'];

const monthlyRevenue = [
  { month: 'Jan', revenue: 32000, profit: 12000 },
  { month: 'Feb', revenue: 45000, profit: 18000 },
  { month: 'Mar', revenue: 53100, profit: 21500 },
];

export default function AnalyticsPage() {
  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      <PageHeader
        title="Sales & Business Analytics"
        description="Deep dive into profit margin distributions, top selling categories, and revenue trajectories."
        breadcrumbs={[{ label: 'Analytics' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Revenue Bar Chart */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <h3 className="text-base font-bold text-slate-100 mb-1 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-400" />
            Monthly Revenue & Profit Comparison
          </h3>
          <p className="text-xs text-slate-400 mb-6">Financial performance metrics for Q1 2026</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Bar dataKey="revenue" fill="#0284c7" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share Pie Chart */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <h3 className="text-base font-bold text-slate-100 mb-1 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-emerald-400" />
            Sales Share by Product Category
          </h3>
          <p className="text-xs text-slate-400 mb-6">Percentage breakdown of total inventory volume</p>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
