'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  ShoppingCart,
  Users,
  Package,
  Boxes,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  Calendar,
  Layers,
  CheckCircle2,
  Lock,
  ChevronRight,
  PieChart as PieIcon,
  BarChart3,
  LineChart as LineIcon,
  Clock,
  Sparkles,
  CreditCard,
  Building,
  Globe,
  Banknote,
  Search,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  DashboardPeriod,
  DashboardResponseData,
  KPICardData,
} from '@/types/dashboard';

const CATEGORY_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#64748b', // Slate
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { error: showError } = useToast();

  const [period, setPeriod] = useState<DashboardPeriod>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<DashboardResponseData | null>(null);

  // Client-side hydration flag for Recharts
  const [isMounted, setIsMounted] = useState<boolean>(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch Dashboard Stats from Backend
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { period };
      if (period === 'custom') {
        if (!startDate || !endDate) {
          setIsLoading(false);
          return;
        }
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const res = await api.get('/dashboard', { params });
      if (res.data?.data) {
        setDashboardData(res.data.data);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to load dashboard analytics');
    } finally {
      setIsLoading(false);
    }
  }, [period, startDate, endDate, showError]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Quick Date Change
  const handlePeriodChange = (newPeriod: DashboardPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Helper: Format Growth Badge
  const renderTrend = (kpi: KPICardData | undefined, isCost = false) => {
    if (!kpi) return null;
    const change = kpi.percentageChange;
    const isPositive = change > 0;
    const isNeutral = change === 0;

    // For cost/expenses, an increase is often caution (red), decrease is good (green)
    const isGood = isCost ? !isPositive : isPositive;

    const textColor = isNeutral
      ? 'text-slate-400'
      : isGood
      ? 'text-emerald-400'
      : 'text-rose-400';
    const bgColor = isNeutral
      ? 'bg-slate-800/40 border-slate-700/50'
      : isGood
      ? 'bg-emerald-500/10 border-emerald-500/20'
      : 'bg-rose-500/10 border-rose-500/20';

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-semibold font-mono ${textColor} ${bgColor}`}>
        {isNeutral ? (
          <span>0.0%</span>
        ) : isPositive ? (
          <>
            <ArrowUpRight className="w-3 h-3" />
            <span>+{change}%</span>
          </>
        ) : (
          <>
            <ArrowDownRight className="w-3 h-3" />
            <span>{change}%</span>
          </>
        )}
        <span className="text-[10px] text-slate-500 font-normal ml-0.5">vs prev</span>
      </div>
    );
  };

  // Payment Method Icon Helper
  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH':
        return <Banknote className="w-3.5 h-3.5 text-emerald-400" />;
      case 'CARD':
        return <CreditCard className="w-3.5 h-3.5 text-blue-400" />;
      case 'BANK_TRANSFER':
        return <Building className="w-3.5 h-3.5 text-teal-400" />;
      case 'ONLINE':
        return <Globe className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <DollarSign className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const kpis = dashboardData?.kpis;
  const charts = dashboardData?.charts;
  const canViewFinancials = dashboardData?.permissions?.canViewFinancials ?? true;

  const dateFilterTabs: Array<{ label: string; value: DashboardPeriod }> = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'this_week' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'This Year', value: 'this_year' },
    { label: 'Custom Range', value: 'custom' },
  ];

  return (
    <DashboardLayout>
      {/* Page Header */}
      <PageHeader
        title={`Welcome back, ${user?.name || 'Staff'} 👋`}
        description="Real-time operational business metrics, sales velocity, inventory health, and cash flow."
        breadcrumbs={[{ label: 'Dashboard' }]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchDashboardData()}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition-all shadow-sm"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
            </button>
            <Link
              href="/sales"
              className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Sale / POS
            </Link>
          </div>
        }
      />

      {/* Date Filter Bar */}
      <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl mb-6 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3">
        {/* Preset Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {dateFilterTabs.map((tab) => {
            const active = period === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handlePeriodChange(tab.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                    : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Custom Range Picker */}
        {period === 'custom' && (
          <div className="flex items-center gap-2 text-xs text-slate-400 animate-fadeIn">
            <Calendar className="w-3.5 h-3.5 text-brand-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-lg text-xs focus:border-brand-500 focus:outline-none"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-lg text-xs focus:border-brand-500 focus:outline-none"
            />
            <button
              onClick={fetchDashboardData}
              disabled={!startDate || !endDate}
              className="px-3 py-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white rounded-lg font-medium text-xs shadow-sm transition-all"
            >
              Apply
            </button>
          </div>
        )}

        {/* Date Display */}
        {dashboardData?.dateRange && (
          <div className="text-[11px] text-slate-500 font-mono hidden md:block">
            Period: {new Date(dashboardData.dateRange.startDate).toLocaleDateString()} –{' '}
            {new Date(dashboardData.dateRange.endDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {isLoading && !dashboardData ? (
        <div className="p-16">
          <LoadingState message="Synthesizing store metrics & calculating financial analytics..." />
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* KPI CARDS (8 TOTAL)                                      */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* 1. Total Revenue */}
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-slate-700/60 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Revenue
                </span>
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-100 mt-2 font-mono tracking-tight">
                {kpis?.totalRevenue?.formattedValue || '$0.00'}
              </p>
              <div className="mt-2.5 flex items-center justify-between">
                {renderTrend(kpis?.totalRevenue)}
                <span className="text-[11px] text-slate-500">Completed sales</span>
              </div>
            </div>

            {/* 2. Gross Profit */}
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-slate-700/60 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Gross Profit
                </span>
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              {canViewFinancials ? (
                <>
                  <p className="text-2xl font-bold text-slate-100 mt-2 font-mono tracking-tight">
                    {kpis?.grossProfit?.formattedValue || '$0.00'}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between">
                    {renderTrend(kpis?.grossProfit)}
                    <span className="text-[11px] text-slate-500">Revenue − COGS</span>
                  </div>
                </>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-slate-500 text-xs">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Manager & Admin Only</span>
                </div>
              )}
            </div>

            {/* 3. Net Profit */}
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-slate-700/60 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-colors" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Net Profit
                </span>
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              {canViewFinancials ? (
                <>
                  <p className="text-2xl font-bold text-slate-100 mt-2 font-mono tracking-tight">
                    {kpis?.netProfit?.formattedValue || '$0.00'}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between">
                    {renderTrend(kpis?.netProfit)}
                    <span className="text-[11px] text-slate-500">Gross − Overhead</span>
                  </div>
                </>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-slate-500 text-xs">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Manager & Admin Only</span>
                </div>
              )}
            </div>

            {/* 4. Total Expenses */}
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-slate-700/60 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/10 transition-colors" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Expenses
                </span>
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              {canViewFinancials ? (
                <>
                  <p className="text-2xl font-bold text-slate-100 mt-2 font-mono tracking-tight">
                    {kpis?.totalExpenses?.formattedValue || '$0.00'}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between">
                    {renderTrend(kpis?.totalExpenses, true)}
                    <span className="text-[11px] text-slate-500">Operating overhead</span>
                  </div>
                </>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-slate-500 text-xs">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Manager & Admin Only</span>
                </div>
              )}
            </div>

            {/* 5. Total Orders */}
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-slate-700/60 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Orders
                </span>
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-100 mt-2 font-mono tracking-tight">
                {kpis?.totalOrders?.formattedValue || '0'}
              </p>
              <div className="mt-2.5 flex items-center justify-between">
                {renderTrend(kpis?.totalOrders)}
                <span className="text-[11px] text-slate-500">Completed invoices</span>
              </div>
            </div>

            {/* 6. Total Customers */}
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-slate-700/60 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Customers
                </span>
                <div className="p-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-100 mt-2 font-mono tracking-tight">
                {kpis?.totalCustomers?.formattedValue || '0'}
              </p>
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                <span>Active directory</span>
                <Link href="/customers" className="text-brand-400 hover:underline">
                  View profiles →
                </Link>
              </div>
            </div>

            {/* 7. Total Products */}
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-slate-700/60 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Products
                </span>
                <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-100 mt-2 font-mono tracking-tight">
                {kpis?.totalProducts?.formattedValue || '0'}
              </p>
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                <span>Active catalog</span>
                <Link href="/products" className="text-brand-400 hover:underline">
                  Catalog →
                </Link>
              </div>
            </div>

            {/* 8. Inventory Value */}
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-slate-700/60 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Inventory Value
                </span>
                <div className="p-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              {canViewFinancials ? (
                <>
                  <p className="text-2xl font-bold text-slate-100 mt-2 font-mono tracking-tight">
                    {kpis?.inventoryValue?.formattedValue || '$0.00'}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Stock @ cost</span>
                    <Link href="/inventory" className="text-brand-400 hover:underline">
                      Stock log →
                    </Link>
                  </div>
                </>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-slate-500 text-xs">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Manager & Admin Only</span>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* PRIMARY CHARTS (CHART 1 & CHART 2)                       */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Chart 1: Sales Trend */}
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    <LineIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Sales Trend</h3>
                    <p className="text-[11px] text-slate-400">
                      Revenue performance & transaction volume trajectory
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {kpis?.totalRevenue?.formattedValue}
                </span>
              </div>

              <div className="h-64 w-full">
                {isMounted && charts?.salesTrend && charts.salesTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={charts.salesTrend}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                        }}
                        formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Revenue']}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#revenueGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No sales data recorded in this period
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Revenue vs Profit */}
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Revenue vs Profit</h3>
                    <p className="text-[11px] text-slate-400">
                      Revenue, Gross Profit & Net Profit comparison
                    </p>
                  </div>
                </div>
                {canViewFinancials ? (
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    Net: {kpis?.netProfit?.formattedValue}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" /> Restricted
                  </span>
                )}
              </div>

              <div className="h-64 w-full">
                {isMounted && charts?.revenueVsProfit && charts.revenueVsProfit.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={charts.revenueVsProfit}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                        }}
                        formatter={(val: any, name: string) => {
                          const label =
                            name === 'revenue'
                              ? 'Revenue'
                              : name === 'grossProfit'
                              ? 'Gross Profit'
                              : 'Net Profit';
                          return [`$${Number(val).toFixed(2)}`, label];
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                      />
                      <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                      {canViewFinancials && (
                        <>
                          <Bar
                            dataKey="grossProfit"
                            name="Gross Profit"
                            fill="#6366f1"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="netProfit"
                            name="Net Profit"
                            fill="#06b6d4"
                            radius={[4, 4, 0, 0]}
                          />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No financial data recorded in this period
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* MIDDLE SECTION: CHART 3 & CHART 4                        */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Chart 3: Sales by Category */}
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <PieIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Sales by Category</h3>
                    <p className="text-[11px] text-slate-400">
                      Product taxonomy share of total dollar revenue
                    </p>
                  </div>
                </div>
              </div>

              {charts?.salesByCategory && charts.salesByCategory.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                  {/* Donut Chart */}
                  <div className="h-56 w-full">
                    {isMounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={charts.salesByCategory}
                            dataKey="revenue"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {charts.salesByCategory.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderRadius: '0.75rem',
                              fontSize: '12px',
                            }}
                            formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Revenue']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Category Legend & Breakdown List */}
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {charts.salesByCategory.map((cat, idx) => (
                      <div key={cat.category} className="text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                              }}
                            />
                            <span className="font-medium text-slate-300 truncate">
                              {cat.category}
                            </span>
                          </div>
                          <span className="font-mono text-slate-200 font-semibold shrink-0">
                            ${cat.revenue.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pl-4.5">
                          <span>{cat.unitsSold} units</span>
                          <span>{cat.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-xs text-slate-500">
                  No categorized product sales recorded
                </div>
              )}
            </div>

            {/* Chart 4: Top Selling Products */}
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Top Selling Products</h3>
                    <p className="text-[11px] text-slate-400">
                      Highest revenue generating catalog items
                    </p>
                  </div>
                </div>
                <Link
                  href="/products"
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                >
                  Products <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {charts?.topSellingProducts && charts.topSellingProducts.length > 0 ? (
                <div className="space-y-3">
                  {charts.topSellingProducts.map((prod, idx) => (
                    <div
                      key={prod.productId}
                      className="p-3 bg-slate-950/40 border border-slate-800/70 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700/80 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center font-mono shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">
                            {prod.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {prod.sku} · {prod.category}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-xs text-emerald-400">
                          ${prod.revenue.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {prod.unitsSold} sold
                          {canViewFinancials && (
                            <span className="text-slate-500 ml-1">
                              (+${prod.profit.toFixed(0)} margin)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-xs text-slate-500">
                  No sales recorded for any catalog products
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* LOWER SECTION: CHART 5 (LOW-STOCK) & CHART 6 (RECENT SALES) */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 5: Low-Stock Products Alert */}
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Low-Stock Alerts</h3>
                    <p className="text-[11px] text-slate-400">
                      Inventory items at or below reorder replenishment levels
                    </p>
                  </div>
                </div>
                <Link
                  href="/inventory"
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                >
                  Manage Stock <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {charts?.lowStockProducts && charts.lowStockProducts.length > 0 ? (
                <div className="space-y-2.5">
                  {charts.lowStockProducts.map((item) => {
                    const isOut = item.status === 'OUT_OF_STOCK';
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                          isOut
                            ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/30'
                            : 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/30'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                isOut
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {isOut ? 'OUT OF STOCK' : 'LOW STOCK'}
                            </span>
                            <p className="text-xs font-semibold text-slate-200 truncate">
                              {item.name}
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            SKU: {item.sku} · Category: {item.category}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-mono font-bold text-xs text-slate-200">
                            {item.currentStock} / {item.reorderLevel}{' '}
                            <span className="text-[10px] text-slate-500 font-normal">
                              {item.unit}
                            </span>
                          </p>
                          <p className="text-[10px] text-rose-400 font-mono">
                            Deficit: -{item.deficit} {item.unit}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-slate-300">All inventory levels healthy</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    No products currently breached their reorder alert threshold.
                  </p>
                </div>
              )}
            </div>

            {/* Chart 6: Recent Sales Stream */}
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Recent Completed Sales</h3>
                    <p className="text-[11px] text-slate-400">
                      Live store checkout feed & customer disbursements
                    </p>
                  </div>
                </div>
                <Link
                  href="/sales"
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                >
                  All Sales <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {charts?.recentSales && charts.recentSales.length > 0 ? (
                <div className="space-y-2.5">
                  {charts.recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3 bg-slate-950/40 border border-slate-800/70 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700/80 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/invoices`}
                            className="font-mono text-xs font-bold text-brand-400 hover:underline"
                          >
                            {sale.invoiceNumber}
                          </Link>
                          <span className="text-slate-400 text-xs truncate">
                            · {sale.customerName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span>
                            {new Date(sale.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            {getMethodIcon(sale.paymentMethod)}
                            {sale.paymentMethod.replace('_', ' ')}
                          </span>
                          <span>·</span>
                          <span>by {sale.cashierName}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-xs text-slate-100">
                          ${sale.totalAmount.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {sale.itemCount} items
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-300">No recent sales</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Completed sales will appear in this live operational stream.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
