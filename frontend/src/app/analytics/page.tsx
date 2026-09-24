'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Boxes,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart3,
  LineChart as LineIcon,
  Layers,
  Sparkles,
  Zap,
  Clock,
  Archive,
  AlertOctagon,
  Percent,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  AnalyticsPeriod,
  ComprehensiveAnalyticsResponse,
} from '@/types/analytics';

export default function AnalyticsPage() {
  const { error: showError } = useToast();

  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'financials' | 'products' | 'inventory' | 'customers'>(
    'financials'
  );
  const [salesGranularity, setSalesGranularity] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [analyticsData, setAnalyticsData] = useState<ComprehensiveAnalyticsResponse | null>(null);

  // Client hydration flag for Recharts
  const [isMounted, setIsMounted] = useState<boolean>(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchAnalytics = useCallback(async () => {
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

      const res = await api.get('/analytics', { params });
      if (res.data?.data) {
        setAnalyticsData(res.data.data);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to fetch business analytics');
    } finally {
      setIsLoading(false);
    }
  }, [period, startDate, endDate, showError]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handlePeriodChange = (newPeriod: AnalyticsPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  const periodOptions: Array<{ label: string; value: AnalyticsPeriod }> = [
    { label: 'Today', value: 'today' },
    { label: 'Past 7 Days', value: '7d' },
    { label: 'Past 30 Days', value: '30d' },
    { label: 'Past 90 Days', value: '90d' },
    { label: 'This Month', value: 'this_month' },
    { label: 'This Year', value: 'this_year' },
    { label: 'All Time', value: 'all_time' },
    { label: 'Custom Range', value: 'custom' },
  ];

  const financials = analyticsData?.financials;
  const sales = analyticsData?.sales;
  const products = analyticsData?.products;
  const inventory = analyticsData?.inventory;
  const customers = analyticsData?.customers;

  // Selected Sales Time-series Dataset
  const salesChartData = useMemo(() => {
    if (!sales) return [];
    switch (salesGranularity) {
      case 'weekly':
        return sales.weeklySales.map((w) => ({ date: w.label, revenue: w.revenue, orders: w.orders }));
      case 'monthly':
        return sales.monthlySales.map((m) => ({ date: m.label, revenue: m.revenue, orders: m.orders }));
      case 'yearly':
        return sales.yearlySales.map((y) => ({ date: y.label, revenue: y.revenue, orders: y.orders }));
      case 'daily':
      default:
        return sales.dailySales.map((d) => ({ date: d.label, revenue: d.revenue, orders: d.orders, aov: d.aov }));
    }
  }, [sales, salesGranularity]);

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      {/* Page Header */}
      <PageHeader
        title="Business Analytics & Financial Telemetry"
        description="Deep-dive performance telemetry across gross profitability, sales velocity, inventory turnover, and customer lifetime value."
        breadcrumbs={[{ label: 'Analytics' }]}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAnalytics()}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition-all shadow-sm"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
            </button>
            <Link
              href="/reports"
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-xs rounded-xl transition-all"
            >
              Export Reports
            </Link>
          </div>
        }
      />

      {/* Date Filter & Preset Controls */}
      <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl mb-6 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3">
        {/* Preset Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {periodOptions.map((opt) => {
            const active = period === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handlePeriodChange(opt.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                    : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {opt.label}
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
              onClick={fetchAnalytics}
              disabled={!startDate || !endDate}
              className="px-3 py-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white rounded-lg font-medium text-xs shadow-sm transition-all"
            >
              Apply
            </button>
          </div>
        )}

        {analyticsData?.dateRange && (
          <div className="text-[11px] text-slate-500 font-mono hidden md:block">
            Range: {new Date(analyticsData.dateRange.startDate).toLocaleDateString()} –{' '}
            {new Date(analyticsData.dateRange.endDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('financials')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'financials'
              ? 'bg-brand-600/10 text-brand-400 border border-brand-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Financial & Sales Analytics
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'products'
              ? 'bg-brand-600/10 text-brand-400 border border-brand-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Package className="w-4 h-4" />
          Product Performance
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'inventory'
              ? 'bg-brand-600/10 text-brand-400 border border-brand-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Inventory Health & Turnover
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'customers'
              ? 'bg-brand-600/10 text-brand-400 border border-brand-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Users className="w-4 h-4" />
          Customer Value & Retention
        </button>
      </div>

      {isLoading && !analyticsData ? (
        <div className="p-16">
          <LoadingState message="Calculating real-time database financial algorithms..." />
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* TAB 1: FINANCIAL & SALES ANALYTICS                       */}
          {/* ======================================================== */}
          {activeTab === 'financials' && (
            <div className="space-y-6">
              {/* 6 Key Financial Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Revenue */}
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Sales Revenue
                  </span>
                  <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                    {financials?.formatted.revenue || '$0.00'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Completed orders</p>
                </div>

                {/* COGS */}
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    COGS (Cost)
                  </span>
                  <p className="text-xl font-bold text-amber-400 mt-1 font-mono">
                    {financials?.formatted.cogs || '$0.00'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Item wholesale cost</p>
                </div>

                {/* Gross Profit */}
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Gross Profit
                  </span>
                  <p className="text-xl font-bold text-indigo-400 mt-1 font-mono">
                    {financials?.formatted.grossProfit || '$0.00'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Revenue − COGS</p>
                </div>

                {/* Expenses */}
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Operating Overhead
                  </span>
                  <p className="text-xl font-bold text-rose-400 mt-1 font-mono">
                    {financials?.formatted.expenses || '$0.00'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Logged expenses</p>
                </div>

                {/* Net Profit */}
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Net Profit
                  </span>
                  <p className="text-xl font-bold text-cyan-400 mt-1 font-mono">
                    {financials?.formatted.netProfit || '$0.00'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Gross − Expenses</p>
                </div>

                {/* Profit Margin */}
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Gross Margin
                  </span>
                  <p className="text-xl font-bold text-purple-400 mt-1 font-mono">
                    {financials?.formatted.profitMargin || '0%'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Net Margin: {financials?.formatted.netMargin}
                  </p>
                </div>
              </div>

              {/* Sales Growth & Order Averages Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Total Orders Placed</p>
                    <p className="text-2xl font-bold text-slate-100 font-mono mt-0.5">
                      {sales?.orders.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div className="p-2.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-xl">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Average Order Value (AOV)</p>
                    <p className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">
                      ${sales?.averageOrderValue.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                    <Percent className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Sales Growth (vs Prev)</p>
                    <p className="text-2xl font-bold text-cyan-400 font-mono mt-0.5">
                      {sales?.salesGrowth ? (sales.salesGrowth > 0 ? `+${sales.salesGrowth}%` : `${sales.salesGrowth}%`) : '0%'}
                    </p>
                  </div>
                  <div className="p-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Chart 1: Sales Velocity Chart with Granularity Switcher */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <LineIcon className="w-4 h-4 text-emerald-400" />
                      Sales Volume & Revenue Velocity
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Aggregated revenue trajectory across selected time horizon
                    </p>
                  </div>

                  {/* Granularity Switcher */}
                  <div className="flex items-center gap-1 bg-slate-950/60 border border-slate-800 p-1 rounded-xl text-xs">
                    {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setSalesGranularity(g)}
                        className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-all ${
                          salesGranularity === g
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-72 w-full">
                  {isMounted && salesChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="analyticsSalesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                          formatter={(v: any, name: string) => [name === 'orders' ? v : `$${Number(v).toFixed(2)}`, name === 'orders' ? 'Orders' : 'Revenue']}
                        />
                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fill="url(#analyticsSalesGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      No sales data available for this time slice
                    </div>
                  )}
                </div>
              </div>

              {/* Chart 2: Cost Structure & Profitability Waterfall */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand-400" />
                  Financial Composition (Revenue vs COGS vs Expenses vs Net Profit)
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Comparative capital distribution & bottom-line retention
                </p>

                <div className="h-72 w-full">
                  {isMounted && financials ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Revenue', amount: financials.revenue, fill: '#10b981' },
                          { name: 'COGS', amount: financials.cogs, fill: '#f59e0b' },
                          { name: 'Gross Profit', amount: financials.grossProfit, fill: '#6366f1' },
                          { name: 'Expenses', amount: financials.expenses, fill: '#f43f5e' },
                          { name: 'Net Profit', amount: financials.netProfit, fill: '#06b6d4' },
                        ]}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                          formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Amount']}
                        />
                        <Bar dataKey="amount" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      No financial data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: PRODUCT PERFORMANCE                               */}
          {/* ======================================================== */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Best Sellers Leaderboard */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Top 10 Best-Selling Products
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Ranked by sold unit volume and monetary contribution
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                        <th className="p-3 pl-4">Rank</th>
                        <th className="p-3">Product</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Units Sold</th>
                        <th className="p-3 text-right">Revenue</th>
                        <th className="p-3 text-right">Gross Profit</th>
                        <th className="p-3 pr-4 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {products?.bestSellers && products.bestSellers.length > 0 ? (
                        products.bestSellers.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 pl-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                            <td className="p-3 font-semibold text-slate-200">{item.name}</td>
                            <td className="p-3 font-mono text-slate-400">{item.sku}</td>
                            <td className="p-3 text-slate-300">
                              <span className="px-2 py-0.5 rounded-lg border border-slate-700 bg-slate-800/50 text-[11px]">
                                {item.category}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-100">{item.unitsSold}</td>
                            <td className="p-3 text-right font-mono text-emerald-400">${item.revenue.toFixed(2)}</td>
                            <td className="p-3 text-right font-mono text-indigo-400">${item.profit.toFixed(2)}</td>
                            <td className="p-3 pr-4 text-right font-mono text-cyan-400">{item.profitMargin}%</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500">
                            No product sales recorded in this period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Most Profitable vs Least Profitable Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Most Profitable */}
                <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                  <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand-400" />
                    Most Profitable Products
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-4">Highest total gross margin contribution</p>

                  <div className="space-y-2.5">
                    {products?.mostProfitable && products.mostProfitable.length > 0 ? (
                      products.mostProfitable.slice(0, 5).map((p) => (
                        <div
                          key={p.id}
                          className="p-3 bg-slate-950/40 border border-slate-800/70 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-200">{p.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{p.sku} · {p.unitsSold} sold</p>
                          </div>
                          <div className="text-right font-mono">
                            <p className="font-bold text-indigo-400">+${p.profit.toFixed(2)}</p>
                            <p className="text-[10px] text-slate-400">{p.profitMargin}% margin</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6">No profit data available</p>
                    )}
                  </div>
                </div>

                {/* Slow Moving Products */}
                <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                  <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Slow-Moving Products
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-4">Items with on-hand inventory but low sales volume (≤ 2)</p>

                  <div className="space-y-2.5">
                    {products?.slowMoving && products.slowMoving.length > 0 ? (
                      products.slowMoving.slice(0, 5).map((p) => (
                        <div
                          key={p.id}
                          className="p-3 bg-slate-950/40 border border-slate-800/70 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-200">{p.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              Stock: {p.currentStock} units · Reorder: {p.reorderLevel}
                            </p>
                          </div>
                          <div className="text-right font-mono">
                            <p className="font-bold text-amber-400">{p.unitsSold} sold</p>
                            <p className="text-[10px] text-slate-500">Low sales velocity</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6">No slow moving products identified</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: INVENTORY HEALTH & TURNOVER                       */}
          {/* ======================================================== */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Inventory Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Inventory Value (Cost)
                  </span>
                  <p className="text-2xl font-bold text-slate-100 mt-2 font-mono">
                    ${inventory?.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Retail Valuation: ${inventory?.retailValue.toLocaleString()}</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Inventory Turnover Ratio
                  </span>
                  <p className="text-2xl font-bold text-indigo-400 mt-2 font-mono">
                    {inventory?.inventoryTurnoverRatio.toFixed(2)}x
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">COGS / Average Stock Value</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Overstock Risk Items
                  </span>
                  <p className="text-2xl font-bold text-amber-400 mt-2 font-mono">
                    {inventory?.overstockCount || 0}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Stock exceeds 3x reorder level</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Dead Stock Count
                  </span>
                  <p className="text-2xl font-bold text-rose-400 mt-2 font-mono">
                    {inventory?.deadStockCount || 0}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Zero units sold in period</p>
                </div>
              </div>

              {/* Dead Stock & Tied Up Capital Table */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-400" />
                  Dead Stock Telemetry (Zero Sales in Period)
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Inventory with capital tied up that experienced zero purchases or depletion
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                        <th className="p-3 pl-4">Product</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Units in Stock</th>
                        <th className="p-3 pr-4 text-right">Capital Tied Up (Cost)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {inventory?.deadStockItems && inventory.deadStockItems.length > 0 ? (
                        inventory.deadStockItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 pl-4 font-semibold text-slate-200">{item.name}</td>
                            <td className="p-3 font-mono text-slate-400">{item.sku}</td>
                            <td className="p-3 text-slate-300">{item.category}</td>
                            <td className="p-3 text-right font-mono font-bold text-amber-400">{item.currentStock}</td>
                            <td className="p-3 pr-4 text-right font-mono font-bold text-rose-400">
                              ${item.costValue.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500">
                            No dead stock identified. Inventory is actively rotating.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Overstock Items Table */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                  <Archive className="w-4 h-4 text-amber-400" />
                  Overstock Candidates
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Products with current inventory quantities far exceeding safety thresholds
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                        <th className="p-3 pl-4">Product</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Current Stock</th>
                        <th className="p-3">Reorder Threshold</th>
                        <th className="p-3 pr-4 text-right">Excess Units</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {inventory?.overstockItems && inventory.overstockItems.length > 0 ? (
                        inventory.overstockItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 pl-4 font-semibold text-slate-200">{item.name}</td>
                            <td className="p-3 font-mono text-slate-400">{item.sku}</td>
                            <td className="p-3 font-mono font-bold text-slate-100">{item.currentStock}</td>
                            <td className="p-3 font-mono text-slate-400">{item.reorderLevel}</td>
                            <td className="p-3 pr-4 text-right font-mono font-bold text-amber-400">
                              +{item.excessUnits}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500">
                            No overstocked inventory found. Stock holding is balanced.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: CUSTOMER VALUE & RETENTION                        */}
          {/* ======================================================== */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              {/* Customer Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Registered Customers
                  </span>
                  <p className="text-2xl font-bold text-slate-100 mt-2 font-mono">
                    {customers?.totalCustomers || 0}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Active database accounts</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    New Customers Acquired
                  </span>
                  <p className="text-2xl font-bold text-emerald-400 mt-2 font-mono">
                    {customers?.newCustomers || 0}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Enrolled in analyzed period</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Repeat Customer Rate
                  </span>
                  <p className="text-2xl font-bold text-cyan-400 mt-2 font-mono">
                    {customers?.repeatCustomerRate || 0}%
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">{customers?.repeatCustomers} multi-order buyers</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Average Customer Value (ACV)
                  </span>
                  <p className="text-2xl font-bold text-indigo-400 mt-2 font-mono">
                    ${customers?.averageCustomerValue.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Period revenue / Total accounts</p>
                </div>
              </div>

              {/* Top Customers Leaderboard */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-400" />
                      Top Customers by Lifetime Spend
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Highest spending enterprise and retail customer accounts
                    </p>
                  </div>
                  <Link
                    href="/customers"
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                  >
                    All Customers <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                        <th className="p-3 pl-4">Rank</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Code</th>
                        <th className="p-3 text-right">Orders</th>
                        <th className="p-3 text-right">Average Order</th>
                        <th className="p-3 pr-4 text-right">Total Spent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {customers?.topCustomers && customers.topCustomers.length > 0 ? (
                        customers.topCustomers.map((cust, idx) => (
                          <tr key={cust.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 pl-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                            <td className="p-3 font-semibold text-slate-200">{cust.name}</td>
                            <td className="p-3 font-mono text-slate-400">{cust.code}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-100">{cust.ordersCount}</td>
                            <td className="p-3 text-right font-mono text-slate-300">${cust.averageOrderValue.toFixed(2)}</td>
                            <td className="p-3 pr-4 text-right font-mono font-bold text-emerald-400">
                              ${cust.totalSpent.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-500">
                            No customer transactions recorded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
