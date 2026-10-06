'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Boxes,
  ArrowUpRight,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  LineChart as LineIcon,
  Sparkles,
  Clock,
  Archive,
  AlertOctagon,
  Percent,
  ExternalLink,
  Layers,
  ArrowDownLeft,
  ArrowUpRight as ArrowUpRightIcon,
  Activity,
  ShieldCheck,
  Building2,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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
  const [activeTab, setActiveTab] = useState<
    'sales' | 'financials' | 'products' | 'inventory' | 'customers'
  >('sales');
  const [salesGranularity, setSalesGranularity] = useState<
    'daily' | 'weekly' | 'monthly' | 'yearly'
  >('daily');

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
        return sales.weeklySales.map((w) => ({
          date: w.label,
          revenue: w.revenue,
          orders: w.orders,
          aov: w.orders > 0 ? Number((w.revenue / w.orders).toFixed(2)) : 0,
        }));
      case 'monthly':
        return sales.monthlySales.map((m) => ({
          date: m.label,
          revenue: m.revenue,
          orders: m.orders,
          aov: m.orders > 0 ? Number((m.revenue / m.orders).toFixed(2)) : 0,
        }));
      case 'yearly':
        return sales.yearlySales.map((y) => ({
          date: y.label,
          revenue: y.revenue,
          orders: y.orders,
          aov: y.orders > 0 ? Number((y.revenue / y.orders).toFixed(2)) : 0,
        }));
      case 'daily':
      default:
        return sales.dailySales.map((d) => ({
          date: d.label,
          revenue: d.revenue,
          orders: d.orders,
          aov: d.aov,
        }));
    }
  }, [sales, salesGranularity]);

  // Product trend line colors for top 5 products
  const productTrendColors = ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#f43f5e'];

  const trendProductNames = useMemo(() => {
    if (products?.topProductTrendNames && products.topProductTrendNames.length > 0) {
      return products.topProductTrendNames;
    }
    if (products?.bestSellers) {
      return products.bestSellers.slice(0, 5).map((p) => p.name);
    }
    return [];
  }, [products]);

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      {/* Page Header */}
      <PageHeader
        title="Dedicated Business Analytics"
        description="Dynamic real-time business telemetry across sales velocity, gross profitability, inventory turnover, and customer lifetime value."
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
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-xs rounded-xl transition-all flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5 text-brand-400" />
              Download Reports
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
          <div className="text-[11px] text-slate-400 font-mono hidden md:block">
            Range: {new Date(analyticsData.dateRange.startDate).toLocaleDateString()} –{' '}
            {new Date(analyticsData.dateRange.endDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Top Level Key Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Revenue
          </span>
          <p className="text-lg font-bold text-emerald-400 mt-1 font-mono">
            {financials?.formatted.revenue || '$0.00'}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px]">
            {sales && sales.salesGrowth >= 0 ? (
              <span className="text-emerald-400 font-semibold flex items-center">
                <ArrowUpRight className="w-3 h-3" />+{sales.salesGrowth}%
              </span>
            ) : (
              <span className="text-rose-400 font-semibold flex items-center">
                <TrendingDown className="w-3 h-3" />
                {sales?.salesGrowth}%
              </span>
            )}
            <span className="text-slate-500 text-[10px]">vs prev</span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Gross Profit
          </span>
          <p className="text-lg font-bold text-indigo-400 mt-1 font-mono">
            {financials?.formatted.grossProfit || '$0.00'}
          </p>
          <p className="text-[10px] text-indigo-300 font-medium mt-1">
            Margin: {financials?.formatted.profitMargin || '0%'}
          </p>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Net Profit
          </span>
          <p className="text-lg font-bold text-cyan-400 mt-1 font-mono">
            {financials?.formatted.netProfit || '$0.00'}
          </p>
          <p className="text-[10px] text-cyan-300 font-medium mt-1">
            Net Margin: {financials?.formatted.netMargin || '0%'}
          </p>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Orders
          </span>
          <p className="text-lg font-bold text-slate-100 mt-1 font-mono">
            {sales?.orders.toLocaleString() || '0'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            AOV: ${sales?.averageOrderValue.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Inventory Value
          </span>
          <p className="text-lg font-bold text-amber-400 mt-1 font-mono">
            ${inventory?.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Turnover: {inventory?.inventoryTurnoverRatio.toFixed(2) || '0'}x
          </p>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Active Customers
          </span>
          <p className="text-lg font-bold text-purple-400 mt-1 font-mono">
            {customers?.totalCustomers || 0}
          </p>
          <p className="text-[10px] text-purple-300 font-medium mt-1">
            Repeat: {customers?.repeatCustomerRate || 0}%
          </p>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'sales'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <LineIcon className="w-4 h-4" />
          Sales Analytics
        </button>

        <button
          onClick={() => setActiveTab('financials')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'financials'
              ? 'bg-brand-600/10 text-brand-400 border border-brand-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Financial Analytics
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'products'
              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Package className="w-4 h-4" />
          Product Analytics
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'inventory'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Inventory Analytics
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'customers'
              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Users className="w-4 h-4" />
          Customer Analytics
        </button>
      </div>

      {isLoading && !analyticsData ? (
        <div className="p-16">
          <LoadingState message="Calculating real-time database analytics..." />
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* TAB 1: SALES ANALYTICS                                   */}
          {/* ======================================================== */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              {/* Sales Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">
                      {financials?.formatted.revenue || '$0.00'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Completed orders</p>
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Completed Orders</p>
                    <p className="text-2xl font-bold text-slate-100 font-mono mt-0.5">
                      {sales?.orders.toLocaleString() || '0'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Order Growth: {sales?.orderGrowth ? (sales.orderGrowth > 0 ? `+${sales.orderGrowth}%` : `${sales.orderGrowth}%`) : '0%'}
                    </p>
                  </div>
                  <div className="p-2.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-xl">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Average Order Value (AOV)</p>
                    <p className="text-2xl font-bold text-indigo-400 font-mono mt-0.5">
                      ${sales?.averageOrderValue.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Revenue / Orders</p>
                  </div>
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
                    <Percent className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Sales Growth (vs Prev)</p>
                    <p className="text-2xl font-bold text-cyan-400 font-mono mt-0.5">
                      {sales?.salesGrowth ? (sales.salesGrowth > 0 ? `+${sales.salesGrowth}%` : `${sales.salesGrowth}%`) : '0%'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Compared to equal prior period</p>
                  </div>
                  <div className="p-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Sales Chart with Granularity Switcher */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <LineIcon className="w-4 h-4 text-emerald-400" />
                      Sales Trajectory ({salesGranularity.toUpperCase()})
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Dynamic sales revenue and volume across {salesGranularity} aggregated intervals
                    </p>
                  </div>

                  {/* Granularity Switcher: Daily, Weekly, Monthly, Yearly */}
                  <div className="flex items-center gap-1 bg-slate-950/60 border border-slate-800 p-1 rounded-xl text-xs">
                    {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setSalesGranularity(g)}
                        className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
                          salesGranularity === g
                            ? 'bg-brand-600 text-white shadow-sm font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {g} sales
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-80 w-full">
                  {isMounted && salesChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="salesTrajGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                          formatter={(v: any, name: string) => [name === 'orders' ? v : `$${Number(v).toFixed(2)}`, name === 'orders' ? 'Orders Placed' : 'Revenue']}
                        />
                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#salesTrajGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      No sales data recorded in this period
                    </div>
                  )}
                </div>
              </div>

              {/* Time Series Breakdown Table */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand-400" />
                  {salesGranularity.charAt(0).toUpperCase() + salesGranularity.slice(1)} Sales Breakdown Table
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Aggregated telemetry breakdown showing orders, revenue, and average basket size per {salesGranularity} interval
                </p>

                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-900">
                      <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                        <th className="p-3 pl-4">Time Interval</th>
                        <th className="p-3 text-right">Orders</th>
                        <th className="p-3 text-right">Revenue</th>
                        <th className="p-3 text-right">Average Order Value</th>
                        <th className="p-3 pr-4 text-right">Share of Period</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {salesChartData.length > 0 ? (
                        salesChartData.map((row, idx) => {
                          const totalRev = financials?.revenue || 1;
                          const share = totalRev > 0 ? ((row.revenue / totalRev) * 100).toFixed(1) : '0';
                          return (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="p-3 pl-4 font-semibold text-slate-200">{row.date}</td>
                              <td className="p-3 text-right font-mono text-slate-300">{row.orders}</td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                ${row.revenue.toFixed(2)}
                              </td>
                              <td className="p-3 text-right font-mono text-indigo-300">
                                ${row.aov.toFixed(2)}
                              </td>
                              <td className="p-3 pr-4 text-right font-mono text-slate-400">
                                {share}%
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500">
                            No sales data recorded in this period
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
          {/* TAB 2: FINANCIAL ANALYTICS                               */}
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
                  <p className="text-[10px] text-slate-500 mt-1">Total completed sales</p>
                </div>

                {/* COGS */}
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    COGS (Wholesale Cost)
                  </span>
                  <p className="text-xl font-bold text-amber-400 mt-1 font-mono">
                    {financials?.formatted.cogs || '$0.00'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">sum(quantity × unitCost)</p>
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
                  <p className="text-[10px] text-slate-500 mt-1">Logged active expenses</p>
                </div>

                {/* Net Profit */}
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Net Profit
                  </span>
                  <p className="text-xl font-bold text-cyan-400 mt-1 font-mono">
                    {financials?.formatted.netProfit || '$0.00'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Gross Profit − Expenses</p>
                </div>

                {/* Profit Margin */}
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Gross Profit Margin
                  </span>
                  <p className="text-xl font-bold text-purple-400 mt-1 font-mono">
                    {financials?.formatted.profitMargin || '0%'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Net Margin: {financials?.formatted.netMargin || '0%'}
                  </p>
                </div>
              </div>

              {/* Chart: Financial Composition Waterfall */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand-400" />
                  Financial Composition (Revenue vs COGS vs Gross Profit vs Expenses vs Net Profit)
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Comparative capital distribution and bottom-line margin retention
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

              {/* Profit & Loss (P&L) Statement Ledger Table */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      Executive Profit & Loss Statement (P&L)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Standardized income statement calculated directly from transactional records
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800/60 px-3 py-1 rounded-lg">
                    Safe Zero Revenue Handled
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                        <th className="p-3 pl-4">Accounting Line Item</th>
                        <th className="p-3">Formula / Logic</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 pr-4 text-right">% of Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      <tr className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 pl-4 font-semibold text-emerald-400 flex items-center gap-2">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          Sales Revenue
                        </td>
                        <td className="p-3 text-slate-400">Total gross receipts from completed sales</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          {financials?.formatted.revenue || '$0.00'}
                        </td>
                        <td className="p-3 pr-4 text-right font-mono text-slate-300">100.0%</td>
                      </tr>

                      <tr className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 pl-4 font-semibold text-amber-400 flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-amber-400" />
                          Cost of Goods Sold (COGS)
                        </td>
                        <td className="p-3 text-slate-400">sum(quantity sold × unit cost)</td>
                        <td className="p-3 text-right font-mono font-bold text-amber-400">
                          -{financials?.formatted.cogs || '$0.00'}
                        </td>
                        <td className="p-3 pr-4 text-right font-mono text-slate-300">
                          {financials && financials.revenue > 0
                            ? ((financials.cogs / financials.revenue) * 100).toFixed(1)
                            : '0.0'}%
                        </td>
                      </tr>

                      <tr className="bg-slate-950/40 font-semibold border-t-2 border-slate-800">
                        <td className="p-3 pl-4 text-indigo-400">Gross Profit</td>
                        <td className="p-3 text-slate-400">Revenue − COGS</td>
                        <td className="p-3 text-right font-mono font-bold text-indigo-400">
                          {financials?.formatted.grossProfit || '$0.00'}
                        </td>
                        <td className="p-3 pr-4 text-right font-mono font-bold text-indigo-400">
                          {financials?.formatted.profitMargin || '0.0%'}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 pl-4 font-semibold text-rose-400 flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-rose-400" />
                          Operating Overhead (Expenses)
                        </td>
                        <td className="p-3 text-slate-400">Sum of all active operating expenses logged</td>
                        <td className="p-3 text-right font-mono font-bold text-rose-400">
                          -{financials?.formatted.expenses || '$0.00'}
                        </td>
                        <td className="p-3 pr-4 text-right font-mono text-slate-300">
                          {financials && financials.revenue > 0
                            ? ((financials.expenses / financials.revenue) * 100).toFixed(1)
                            : '0.0'}%
                        </td>
                      </tr>

                      <tr className="bg-cyan-950/20 font-bold border-t-2 border-slate-700">
                        <td className="p-3 pl-4 text-cyan-400 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-cyan-400" />
                          Net Operating Profit
                        </td>
                        <td className="p-3 text-slate-300">Gross Profit − Operating Expenses</td>
                        <td className="p-3 text-right font-mono text-lg text-cyan-400">
                          {financials?.formatted.netProfit || '$0.00'}
                        </td>
                        <td className="p-3 pr-4 text-right font-mono text-lg text-cyan-400">
                          {financials?.formatted.netMargin || '0.0%'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: PRODUCT ANALYTICS                                 */}
          {/* ======================================================== */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Product Trends Chart: Daily Units Sold for Top 5 Products */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-400" />
                      Product Velocity Trends (Top 5 Best Sellers)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Multi-product daily sales trend tracking units sold over the selected period
                    </p>
                  </div>
                </div>

                <div className="h-72 w-full">
                  {isMounted && products?.productTrends && products.productTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={products.productTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        {trendProductNames.map((prodName, idx) => (
                          <Line
                            key={prodName}
                            type="monotone"
                            dataKey={prodName}
                            name={prodName}
                            stroke={productTrendColors[idx % productTrendColors.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      No daily trend sales recorded for products in this period
                    </div>
                  )}
                </div>
              </div>

              {/* Best Sellers Leaderboard Table */}
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
                  <Link
                    href="/products"
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                  >
                    All Products <ExternalLink className="w-3 h-3" />
                  </Link>
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
                        <th className="p-3 text-right">COGS</th>
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
                            <td className="p-3 text-right font-mono text-amber-400">${item.cogs.toFixed(2)}</td>
                            <td className="p-3 text-right font-mono text-indigo-400">${item.profit.toFixed(2)}</td>
                            <td className="p-3 pr-4 text-right font-mono text-cyan-400">{item.profitMargin}%</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-500">
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
                {/* Most Profitable Products */}
                <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                  <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Most Profitable Products
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-4">
                    Products contributing the highest cumulative gross profit dollars
                  </p>

                  <div className="space-y-2.5">
                    {products?.mostProfitable && products.mostProfitable.length > 0 ? (
                      products.mostProfitable.slice(0, 5).map((p, idx) => (
                        <div
                          key={p.id}
                          className="p-3 bg-slate-950/40 border border-slate-800/70 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-200">
                              <span className="text-slate-500 mr-1.5 font-mono">#{idx + 1}</span>
                              {p.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {p.sku} · {p.unitsSold} units sold
                            </p>
                          </div>
                          <div className="text-right font-mono">
                            <p className="font-bold text-emerald-400">+${p.profit.toFixed(2)}</p>
                            <p className="text-[10px] text-slate-400">{p.profitMargin}% margin</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6">No profit data available</p>
                    )}
                  </div>
                </div>

                {/* Least Profitable Products */}
                <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                  <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                    Least Profitable Products
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-4">
                    Products with the lowest or zero margin contribution (review pricing or markdowns)
                  </p>

                  <div className="space-y-2.5">
                    {products?.leastProfitable && products.leastProfitable.length > 0 ? (
                      products.leastProfitable.slice(0, 5).map((p, idx) => (
                        <div
                          key={p.id}
                          className="p-3 bg-slate-950/40 border border-slate-800/70 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-200">
                              <span className="text-slate-500 mr-1.5 font-mono">#{idx + 1}</span>
                              {p.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {p.sku} · {p.unitsSold} units sold
                            </p>
                          </div>
                          <div className="text-right font-mono">
                            <p className="font-bold text-rose-400">${p.profit.toFixed(2)}</p>
                            <p className="text-[10px] text-slate-400">{p.profitMargin}% margin</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6">No data available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Slow-Moving Products Table */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Slow-Moving Products
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Items with on-hand inventory but low sales volume (≤ 2 units sold in period)
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                        <th className="p-3 pl-4">Product</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Units Sold</th>
                        <th className="p-3 text-right">Current Stock</th>
                        <th className="p-3 pr-4 text-right">Reorder Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {products?.slowMoving && products.slowMoving.length > 0 ? (
                        products.slowMoving.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 pl-4 font-semibold text-slate-200">{p.name}</td>
                            <td className="p-3 font-mono text-slate-400">{p.sku}</td>
                            <td className="p-3 text-slate-300">{p.category}</td>
                            <td className="p-3 text-right font-mono font-bold text-amber-400">{p.unitsSold}</td>
                            <td className="p-3 text-right font-mono text-slate-100">{p.currentStock}</td>
                            <td className="p-3 pr-4 text-right font-mono text-slate-400">{p.reorderLevel}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-500">
                            No slow moving products identified. Inventory turnover is active.
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
          {/* TAB 4: INVENTORY ANALYTICS                               */}
          {/* ======================================================== */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Inventory Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Stock Value (Cost)
                  </span>
                  <p className="text-xl font-bold text-slate-100 mt-1 font-mono">
                    ${inventory?.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Wholesale capital</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Retail Valuation
                  </span>
                  <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                    ${inventory?.retailValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Potential gross: ${inventory?.potentialProfit.toLocaleString()}</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Turnover Ratio
                  </span>
                  <p className="text-xl font-bold text-indigo-400 mt-1 font-mono">
                    {inventory?.inventoryTurnoverRatio.toFixed(2)}x
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">COGS / Stock Value</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Low Stock Alerts
                  </span>
                  <p className="text-xl font-bold text-rose-400 mt-1 font-mono">
                    {inventory?.lowStockCount || 0}
                  </p>
                  <p className="text-[10px] text-rose-300 mt-1">{inventory?.outOfStockCount || 0} out of stock</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Overstock Items
                  </span>
                  <p className="text-xl font-bold text-amber-400 mt-1 font-mono">
                    {inventory?.overstockCount || 0}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">&gt; 3x reorder level</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Dead Stock Count
                  </span>
                  <p className="text-xl font-bold text-orange-400 mt-1 font-mono">
                    {inventory?.deadStockCount || 0}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">0 sales in period</p>
                </div>
              </div>

              {/* Stock Movement Telemetry Card */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-400" />
                  Stock Movement Telemetry
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Inbound stock replenishments vs outbound customer order deductions within analyzed period
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Inbound Units Received</p>
                      <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                        +{inventory?.stockMovement.unitsIn || 0}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Purchases & Replenishments</p>
                    </div>
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                      <ArrowDownLeft className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Outbound Units Sold</p>
                      <p className="text-2xl font-bold text-rose-400 font-mono mt-1">
                        -{inventory?.stockMovement.unitsOut || 0}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Sales Orders & Deductions</p>
                    </div>
                    <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
                      <ArrowUpRightIcon className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Net Stock Movement</p>
                      <p className={`text-2xl font-bold font-mono mt-1 ${
                        (inventory?.stockMovement.netMovement || 0) >= 0 ? 'text-cyan-400' : 'text-amber-400'
                      }`}>
                        {(inventory?.stockMovement.netMovement || 0) >= 0 ? '+' : ''}
                        {inventory?.stockMovement.netMovement || 0}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Net inventory delta</p>
                    </div>
                    <div className="p-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
                      <Boxes className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Low Stock & Out-of-Stock Table */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      Low Stock & Out-of-Stock Action Items
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Products that have reached or fallen below safety replenishment thresholds
                    </p>
                  </div>
                  <Link
                    href="/inventory"
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                  >
                    Inventory Manager <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                        <th className="p-3 pl-4">Product</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Current Stock</th>
                        <th className="p-3 text-right">Reorder Threshold</th>
                        <th className="p-3 text-right">Deficit</th>
                        <th className="p-3 pr-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {inventory?.lowStockItems && inventory.lowStockItems.length > 0 ? (
                        inventory.lowStockItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 pl-4 font-semibold text-slate-200">{item.name}</td>
                            <td className="p-3 font-mono text-slate-400">{item.sku}</td>
                            <td className="p-3 text-slate-300">{item.category}</td>
                            <td className="p-3 text-right font-mono font-bold text-rose-400">{item.currentStock}</td>
                            <td className="p-3 text-right font-mono text-slate-400">{item.reorderLevel}</td>
                            <td className="p-3 text-right font-mono font-bold text-amber-400">{item.deficit}</td>
                            <td className="p-3 pr-4 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase ${
                                  item.status === 'OUT_OF_STOCK'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {item.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-500">
                            All inventory items are safely above minimum reorder thresholds.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dead Stock & Tied Up Capital Table */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-orange-400" />
                  Dead Stock Telemetry (Zero Sales in Period)
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Inventory holding capital that experienced zero purchases or depletion in the selected timeframe
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

              {/* Overstock Candidates Table */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                  <Archive className="w-4 h-4 text-amber-400" />
                  Overstock Candidates
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Products with current inventory quantities far exceeding safety thresholds (&gt; 3x reorder level)
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                        <th className="p-3 pl-4">Product</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3 text-right">Current Stock</th>
                        <th className="p-3 text-right">Reorder Threshold</th>
                        <th className="p-3 text-right">Excess Units</th>
                        <th className="p-3 pr-4 text-right">Tied-Up Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {inventory?.overstockItems && inventory.overstockItems.length > 0 ? (
                        inventory.overstockItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 pl-4 font-semibold text-slate-200">{item.name}</td>
                            <td className="p-3 font-mono text-slate-400">{item.sku}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-100">{item.currentStock}</td>
                            <td className="p-3 text-right font-mono text-slate-400">{item.reorderLevel}</td>
                            <td className="p-3 text-right font-mono font-bold text-amber-400">+{item.excessUnits}</td>
                            <td className="p-3 pr-4 text-right font-mono text-slate-300">${item.costValue.toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-500">
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
          {/* TAB 5: CUSTOMER ANALYTICS                                */}
          {/* ======================================================== */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              {/* Customer Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Total Customers
                  </span>
                  <p className="text-xl font-bold text-slate-100 mt-1 font-mono">
                    {customers?.totalCustomers || 0}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Registered accounts</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    New Customers
                  </span>
                  <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                    {customers?.newCustomers || 0}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Acquired in period</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Repeat Customers
                  </span>
                  <p className="text-xl font-bold text-cyan-400 mt-1 font-mono">
                    {customers?.repeatCustomers || 0}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">&gt; 1 completed orders</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Repeat Buyer Rate
                  </span>
                  <p className="text-xl font-bold text-purple-400 mt-1 font-mono">
                    {customers?.repeatCustomerRate || 0}%
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Loyalty retention %</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Total Customer Spend
                  </span>
                  <p className="text-xl font-bold text-indigo-400 mt-1 font-mono">
                    ${customers?.totalCustomerSpend.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">All-time tracked spend</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Average Customer Value
                  </span>
                  <p className="text-xl font-bold text-amber-400 mt-1 font-mono">
                    ${customers?.averageCustomerValue.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Period revenue / Total</p>
                </div>
              </div>

              {/* Top Customers Leaderboard */}
              <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-400" />
                      Top Customers by Spending & Lifetime Value
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Highest spending enterprise and retail customer accounts
                    </p>
                  </div>
                  <Link
                    href="/customers"
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                  >
                    Customer Directory <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                        <th className="p-3 pl-4">Rank</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Code</th>
                        <th className="p-3">Email</th>
                        <th className="p-3 text-right">Orders Placed</th>
                        <th className="p-3 text-right">Average Order</th>
                        <th className="p-3 pr-4 text-right">Total Lifetime Spent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {customers?.topCustomers && customers.topCustomers.length > 0 ? (
                        customers.topCustomers.map((cust, idx) => (
                          <tr key={cust.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 pl-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                            <td className="p-3 font-semibold text-slate-200">{cust.name}</td>
                            <td className="p-3 font-mono text-slate-400">{cust.code}</td>
                            <td className="p-3 text-slate-400">{cust.email || '—'}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-100">{cust.ordersCount}</td>
                            <td className="p-3 text-right font-mono text-slate-300">${cust.averageOrderValue.toFixed(2)}</td>
                            <td className="p-3 pr-4 text-right font-mono font-bold text-emerald-400">
                              ${cust.totalSpent.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-500">
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
