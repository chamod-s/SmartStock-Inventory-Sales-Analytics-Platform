'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { exportReport } from '@/lib/export';
import {
  Printer,
  Download,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  ShoppingCart,
  Boxes,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  X,
  FileText,
  Truck,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ReportType,
  SalesReportItem,
  SalesReportSummary,
  PurchasesReportItem,
  PurchasesReportSummary,
  InventoryReportItem,
  InventoryReportSummary,
  CustomersReportItem,
  CustomersReportSummary,
  ExpensesReportItem,
  ExpensesReportSummary,
  ProfitReportItem,
  ProfitReportSummary,
  ReportPagination,
} from '@/types/reports';

type DatePreset = 'all' | 'today' | '7d' | '30d' | 'this_month' | 'this_year' | 'custom';

export default function ReportsPage() {
  const { error: showError, success: showSuccess } = useToast();

  const [activeReport, setActiveReport] = useState<ReportType>('sales');

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Report Specific Filter States
  const [saleStatus, setSaleStatus] = useState<string>('ALL');
  const [paymentMethod, setPaymentMethod] = useState<string>('ALL');
  const [purchaseStatus, setPurchaseStatus] = useState<string>('ALL');
  const [inventoryStockStatus, setInventoryStockStatus] = useState<string>('ALL');
  const [customerActivity, setCustomerActivity] = useState<string>('ALL');
  const [expenseCategory, setExpenseCategory] = useState<string>('ALL');
  const [profitGroupBy, setProfitGroupBy] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Data & Loading States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [pagination, setPagination] = useState<ReportPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [summary, setSummary] = useState<any>(null);

  const formatDateYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Helper to calculate date presets
  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    setPage(1);
    const now = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = formatDateYMD(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7d') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(formatDateYMD(past7));
      setEndDate(formatDateYMD(now));
    } else if (preset === '30d') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(formatDateYMD(past30));
      setEndDate(formatDateYMD(now));
    } else if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(formatDateYMD(start));
      setEndDate(formatDateYMD(end));
    } else if (preset === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      setStartDate(formatDateYMD(start));
      setEndDate(formatDateYMD(end));
    }
  };

  // Switch tabs & reset default sorting/filtering
  const handleTabChange = (report: ReportType) => {
    setActiveReport(report);
    setPage(1);
    setSearch('');
    if (report === 'sales') setSortBy('createdAt');
    else if (report === 'purchases') setSortBy('purchaseDate');
    else if (report === 'inventory') setSortBy('stockValue');
    else if (report === 'customers') setSortBy('totalSpent');
    else if (report === 'expenses') setSortBy('expenseDate');
    else if (report === 'profit') setSortBy('date');
    setSortOrder('desc');
  };

  // Build current query params
  const buildQueryParams = useCallback(() => {
    const params: Record<string, any> = {
      page,
      limit,
      sortOrder,
    };

    if (sortBy) params.sortBy = sortBy;
    if (search.trim()) params.search = search.trim();
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    if (activeReport === 'sales') {
      if (saleStatus !== 'ALL') params.status = saleStatus;
      if (paymentMethod !== 'ALL') params.paymentMethod = paymentMethod;
    } else if (activeReport === 'purchases') {
      if (purchaseStatus !== 'ALL') params.status = purchaseStatus;
    } else if (activeReport === 'inventory') {
      if (inventoryStockStatus !== 'ALL') params.stockStatus = inventoryStockStatus;
    } else if (activeReport === 'customers') {
      if (customerActivity !== 'ALL') params.activity = customerActivity;
    } else if (activeReport === 'expenses') {
      if (expenseCategory !== 'ALL') params.category = expenseCategory;
    } else if (activeReport === 'profit') {
      params.groupBy = profitGroupBy;
    }

    return params;
  }, [
    activeReport,
    page,
    limit,
    sortBy,
    sortOrder,
    search,
    startDate,
    endDate,
    saleStatus,
    paymentMethod,
    purchaseStatus,
    inventoryStockStatus,
    customerActivity,
    expenseCategory,
    profitGroupBy,
  ]);

  // Fetch Report Data from database
  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = buildQueryParams();
      const res = await api.get(`/reports/${activeReport}`, { params });
      if (res.data?.data) {
        setReportData(res.data.data.data || []);
        if (res.data.data.pagination) {
          setPagination(res.data.data.pagination);
        }
        setSummary(res.data.data.summary || null);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || `Failed to generate ${activeReport} report`);
    } finally {
      setIsLoading(false);
    }
  }, [activeReport, buildQueryParams, showError]);

  useEffect(() => {
    applyDatePreset('30d');
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle Export CSV
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params = buildQueryParams();
      await exportReport(activeReport, params, 'csv');
      showSuccess(`Exported ${activeReport} report to CSV successfully`);
    } catch (err: any) {
      showError(err.message || 'Failed to export CSV report');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  // Handle Table Header Sorting
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      {/* Printable Cover Sheet Header (Visible Only When Printing) */}
      <div className="hidden print:block p-4 mb-4 border-b-2 border-slate-900 text-slate-900">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider">SmartStock Platform</h1>
            <p className="text-xs text-slate-600">Official Business Intelligence & Ledger Report</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold uppercase text-slate-800">{activeReport.toUpperCase()} REPORT</p>
            <p className="text-slate-500">Date Printed: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="text-xs bg-slate-100 p-2 rounded flex justify-between font-mono">
          <span>Date Scope: {startDate || 'All Time'} to {endDate || 'Present'}</span>
          <span>Records: {pagination.total}</span>
        </div>
      </div>

      {/* Screen Page Header */}
      <div className="print:hidden">
        <PageHeader
          title="Business Intelligence Reports"
          description="Formal audit statements, inventory valuation schedules, and financial reconciliation ledgers dynamically computed from database records."
          breadcrumbs={[{ label: 'Reports' }]}
          actions={
            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchReport}
                disabled={isLoading}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition-all shadow-sm"
                title="Refresh Report Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
              </button>

              <button
                onClick={handlePrint}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-xs rounded-xl transition-all flex items-center gap-2"
                title="Print-friendly view"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                Print Report
              </button>

              <button
                onClick={handleExportCsv}
                disabled={isExporting}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-brand-500/20 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Generating...' : 'Export CSV'}
              </button>
            </div>
          }
        />
      </div>

      {/* Report Module Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto print:hidden">
        <button
          onClick={() => handleTabChange('sales')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeReport === 'sales'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Sales Report
        </button>

        <button
          onClick={() => handleTabChange('purchases')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeReport === 'purchases'
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Truck className="w-4 h-4" />
          Purchases Report
        </button>

        <button
          onClick={() => handleTabChange('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeReport === 'inventory'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Inventory Valuation
        </button>

        <button
          onClick={() => handleTabChange('customers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeReport === 'customers'
              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Users className="w-4 h-4" />
          Customers Ledger
        </button>

        <button
          onClick={() => handleTabChange('expenses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeReport === 'expenses'
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Expenses Audit
        </button>

        <button
          onClick={() => handleTabChange('profit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeReport === 'profit'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Profit & Loss (P&L)
        </button>
      </div>

      {/* Filter and Query Control Bar */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl mb-6 backdrop-blur-sm space-y-3.5 print:hidden">
        {/* Row 1: Date Range Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {(
              [
                { label: 'All Time', val: 'all' },
                { label: 'Today', val: 'today' },
                { label: 'Past 7 Days', val: '7d' },
                { label: 'Past 30 Days', val: '30d' },
                { label: 'This Month', val: 'this_month' },
                { label: 'This Year', val: 'this_year' },
                { label: 'Custom Range', val: 'custom' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.val}
                onClick={() => applyDatePreset(opt.val)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                  datePreset === opt.val
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                    : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-brand-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950/60 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-lg text-xs focus:border-brand-500 focus:outline-none"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950/60 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-lg text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Row 2: Search & Report-Specific Sub-filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeReport} records...`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950/50 border border-slate-800 text-slate-200 pl-8 pr-8 py-1.5 rounded-xl text-xs focus:border-brand-500 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sub-Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sales Filters */}
            {activeReport === 'sales' && (
              <>
                <select
                  value={saleStatus}
                  onChange={(e) => {
                    setSaleStatus(e.target.value);
                    setPage(1);
                  }}
                  className="bg-slate-950/60 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value="ALL">Status: All</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REFUNDED">Refunded</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    setPage(1);
                  }}
                  className="bg-slate-950/60 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value="ALL">Payment: All</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="ONLINE">Online</option>
                </select>
              </>
            )}

            {/* Purchases Filters */}
            {activeReport === 'purchases' && (
              <select
                value={purchaseStatus}
                onChange={(e) => {
                  setPurchaseStatus(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950/60 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl text-xs focus:border-brand-500 focus:outline-none"
              >
                <option value="ALL">Status: All</option>
                <option value="RECEIVED">Received</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            )}

            {/* Inventory Filters */}
            {activeReport === 'inventory' && (
              <select
                value={inventoryStockStatus}
                onChange={(e) => {
                  setInventoryStockStatus(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950/60 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl text-xs focus:border-brand-500 focus:outline-none"
              >
                <option value="ALL">Health: All Products</option>
                <option value="IN_STOCK">Adequate Stock</option>
                <option value="LOW_STOCK">Low Stock (≤ Reorder)</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="OVERSTOCK">Overstock (&gt; 3x Reorder)</option>
              </select>
            )}

            {/* Customers Filters */}
            {activeReport === 'customers' && (
              <select
                value={customerActivity}
                onChange={(e) => {
                  setCustomerActivity(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950/60 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl text-xs focus:border-brand-500 focus:outline-none"
              >
                <option value="ALL">Activity: All Accounts</option>
                <option value="ACTIVE">Active Buyers (&gt; 0 Orders)</option>
                <option value="INACTIVE">Inactive (0 Orders)</option>
              </select>
            )}

            {/* Expenses Filters */}
            {activeReport === 'expenses' && (
              <select
                value={expenseCategory}
                onChange={(e) => {
                  setExpenseCategory(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950/60 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl text-xs focus:border-brand-500 focus:outline-none"
              >
                <option value="ALL">Category: All</option>
                <option value="Rent">Rent</option>
                <option value="Electricity">Electricity</option>
                <option value="Salary">Salary</option>
                <option value="Transport">Transport</option>
                <option value="Marketing">Marketing</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Other">Other</option>
              </select>
            )}

            {/* Profit Filters */}
            {activeReport === 'profit' && (
              <select
                value={profitGroupBy}
                onChange={(e) => {
                  setProfitGroupBy(e.target.value as any);
                  setPage(1);
                }}
                className="bg-slate-950/60 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl text-xs focus:border-brand-500 focus:outline-none font-medium"
              >
                <option value="daily">Group By: Daily Intervals</option>
                <option value="weekly">Group By: Weekly (Monday-Sunday)</option>
                <option value="monthly">Group By: Monthly Aggregates</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Strip Tailored for Each Report */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
          {/* Sales Report Summary */}
          {activeReport === 'sales' && (
            <>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Revenue</span>
                <p className="text-lg font-bold text-emerald-400 font-mono mt-1">${summary.totalRevenue?.toFixed(2)}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Completed Orders</span>
                <p className="text-lg font-bold text-slate-100 font-mono mt-1">{summary.completedOrders}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Average Order</span>
                <p className="text-lg font-bold text-indigo-400 font-mono mt-1">${summary.averageOrderValue?.toFixed(2)}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Sales Tax</span>
                <p className="text-lg font-bold text-slate-300 font-mono mt-1">${summary.totalTax?.toFixed(2)}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Discounts Granted</span>
                <p className="text-lg font-bold text-amber-400 font-mono mt-1">${summary.totalDiscounts?.toFixed(2)}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Logged</span>
                <p className="text-lg font-bold text-slate-400 font-mono mt-1">{summary.totalOrders} invoices</p>
              </div>
            </>
          )}

          {/* Purchases Report Summary */}
          {activeReport === 'purchases' && (
            <>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Spend</span>
                <p className="text-lg font-bold text-blue-400 font-mono mt-1">${summary.totalSpend?.toFixed(2)}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Orders Received</span>
                <p className="text-lg font-bold text-slate-100 font-mono mt-1">{summary.receivedPurchases}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Procured Units</span>
                <p className="text-lg font-bold text-cyan-400 font-mono mt-1">{summary.totalItemsProcured} units</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Total POs</span>
                <p className="text-lg font-bold text-slate-400 font-mono mt-1">{summary.totalPurchases}</p>
              </div>
            </>
          )}

          {/* Inventory Report Summary */}
          {activeReport === 'inventory' && (
            <>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Cost Valuation</span>
                <p className="text-lg font-bold text-amber-400 font-mono mt-1">${summary.totalCostValuation?.toLocaleString()}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Retail Valuation</span>
                <p className="text-lg font-bold text-emerald-400 font-mono mt-1">${summary.totalRetailValuation?.toLocaleString()}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Potential Margin</span>
                <p className="text-lg font-bold text-indigo-400 font-mono mt-1">${summary.potentialGrossProfit?.toLocaleString()}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Stock Units</span>
                <p className="text-lg font-bold text-slate-100 font-mono mt-1">{summary.totalStockUnits}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Low Stock SKUs</span>
                <p className="text-lg font-bold text-rose-400 font-mono mt-1">{summary.lowStockCount}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Overstock SKUs</span>
                <p className="text-lg font-bold text-purple-400 font-mono mt-1">{summary.overstockCount}</p>
              </div>
            </>
          )}

          {/* Customers Report Summary */}
          {activeReport === 'customers' && (
            <>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Customers</span>
                <p className="text-lg font-bold text-slate-100 font-mono mt-1">{summary.totalCustomers}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Active Buyers</span>
                <p className="text-lg font-bold text-emerald-400 font-mono mt-1">{summary.activeBuyersCount}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Lifetime Spend</span>
                <p className="text-lg font-bold text-purple-400 font-mono mt-1">${summary.totalCustomerSpend?.toFixed(2)}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Average Spend</span>
                <p className="text-lg font-bold text-cyan-400 font-mono mt-1">${summary.averageSpendPerCustomer?.toFixed(2)}</p>
              </div>
            </>
          )}

          {/* Expenses Report Summary */}
          {activeReport === 'expenses' && (
            <>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Overhead</span>
                <p className="text-lg font-bold text-rose-400 font-mono mt-1">${summary.totalExpenseAmount?.toFixed(2)}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Transactions</span>
                <p className="text-lg font-bold text-slate-100 font-mono mt-1">{summary.totalExpensesCount}</p>
              </div>
            </>
          )}

          {/* Profit & Loss Report Summary */}
          {activeReport === 'profit' && (
            <>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Revenue</span>
                <p className="text-lg font-bold text-emerald-400 font-mono mt-1">${summary.revenue?.toFixed(2)}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">COGS</span>
                <p className="text-lg font-bold text-amber-400 font-mono mt-1">${summary.cogs?.toFixed(2)}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Gross Profit</span>
                <p className="text-lg font-bold text-indigo-400 font-mono mt-1">${summary.grossProfit?.toFixed(2)}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Expenses</span>
                <p className="text-lg font-bold text-rose-400 font-mono mt-1">${summary.expenses?.toFixed(2)}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Net Profit</span>
                <p className="text-lg font-bold text-cyan-400 font-mono mt-1">${summary.netProfit?.toFixed(2)}</p>
              </div>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Gross Margin %</span>
                <p className="text-lg font-bold text-purple-400 font-mono mt-1">{summary.profitMargin}%</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Tabular Report Container */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm print:bg-white print:border-slate-300 print:text-black">
        {isLoading ? (
          <div className="p-16">
            <LoadingState message={`Generating dynamic database ${activeReport} report...`} />
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-300">No report entries found</p>
            <p className="text-xs text-slate-500 mt-1">Try broadening your date range or adjusting filter keywords.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs print:text-[10px]">
                {/* 1. SALES TABLE HEAD */}
                {activeReport === 'sales' && (
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold bg-slate-950/40 print:bg-slate-100 print:text-slate-800">
                      <th onClick={() => handleSort('invoiceNumber')} className="p-3.5 pl-4 cursor-pointer hover:text-white">
                        <div className="flex items-center gap-1.5">
                          Invoice # {sortBy === 'invoiceNumber' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />)}
                        </div>
                      </th>
                      <th onClick={() => handleSort('createdAt')} className="p-3.5 cursor-pointer hover:text-white">
                        <div className="flex items-center gap-1.5">
                          Date {sortBy === 'createdAt' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />)}
                        </div>
                      </th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Cashier</th>
                      <th className="p-3.5 text-right">Items</th>
                      <th className="p-3.5 text-right">Subtotal</th>
                      <th className="p-3.5 text-right">Tax</th>
                      <th onClick={() => handleSort('totalAmount')} className="p-3.5 text-right cursor-pointer hover:text-white">
                        <div className="flex items-center justify-end gap-1.5">
                          Total {sortBy === 'totalAmount' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />)}
                        </div>
                      </th>
                      <th className="p-3.5 pr-4 text-right">Status</th>
                    </tr>
                  </thead>
                )}

                {/* 2. PURCHASES TABLE HEAD */}
                {activeReport === 'purchases' && (
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold bg-slate-950/40 print:bg-slate-100 print:text-slate-800">
                      <th onClick={() => handleSort('purchaseOrderNumber')} className="p-3.5 pl-4 cursor-pointer hover:text-white">
                        <div className="flex items-center gap-1.5">
                          PO # {sortBy === 'purchaseOrderNumber' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />)}
                        </div>
                      </th>
                      <th onClick={() => handleSort('purchaseDate')} className="p-3.5 cursor-pointer hover:text-white">
                        <div className="flex items-center gap-1.5">
                          Date {sortBy === 'purchaseDate' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />)}
                        </div>
                      </th>
                      <th className="p-3.5">Supplier</th>
                      <th className="p-3.5">Received By</th>
                      <th className="p-3.5 text-right">Total Units</th>
                      <th className="p-3.5 text-right">Subtotal</th>
                      <th onClick={() => handleSort('totalAmount')} className="p-3.5 text-right cursor-pointer hover:text-white">
                        <div className="flex items-center justify-end gap-1.5">
                          Total Amount {sortBy === 'totalAmount' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />)}
                        </div>
                      </th>
                      <th className="p-3.5 pr-4 text-right">Status</th>
                    </tr>
                  </thead>
                )}

                {/* 3. INVENTORY TABLE HEAD */}
                {activeReport === 'inventory' && (
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold bg-slate-950/40 print:bg-slate-100 print:text-slate-800">
                      <th onClick={() => handleSort('name')} className="p-3.5 pl-4 cursor-pointer hover:text-white">
                        <div className="flex items-center gap-1.5">
                          Product Name {sortBy === 'name' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />)}
                        </div>
                      </th>
                      <th className="p-3.5">SKU</th>
                      <th className="p-3.5">Category</th>
                      <th onClick={() => handleSort('currentStock')} className="p-3.5 text-right cursor-pointer hover:text-white">
                        <div className="flex items-center justify-end gap-1.5">
                          Stock {sortBy === 'currentStock' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />)}
                        </div>
                      </th>
                      <th className="p-3.5 text-right">Cost Price</th>
                      <th className="p-3.5 text-right">Retail Price</th>
                      <th onClick={() => handleSort('stockValue')} className="p-3.5 text-right cursor-pointer hover:text-white">
                        <div className="flex items-center justify-end gap-1.5">
                          Stock Value (Cost) {sortBy === 'stockValue' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />)}
                        </div>
                      </th>
                      <th className="p-3.5 pr-4 text-right">Stock Health</th>
                    </tr>
                  </thead>
                )}

                {/* 4. CUSTOMERS TABLE HEAD */}
                {activeReport === 'customers' && (
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold bg-slate-950/40 print:bg-slate-100 print:text-slate-800">
                      <th onClick={() => handleSort('name')} className="p-3.5 pl-4 cursor-pointer hover:text-white">
                        <div className="flex items-center gap-1.5">
                          Customer {sortBy === 'name' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />)}
                        </div>
                      </th>
                      <th className="p-3.5">Code</th>
                      <th className="p-3.5">Contact Info</th>
                      <th onClick={() => handleSort('ordersCount')} className="p-3.5 text-right cursor-pointer hover:text-white">
                        <div className="flex items-center justify-end gap-1.5">
                          Orders {sortBy === 'ordersCount' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />)}
                        </div>
                      </th>
                      <th className="p-3.5 text-right">Average Order</th>
                      <th onClick={() => handleSort('totalSpent')} className="p-3.5 text-right cursor-pointer hover:text-white">
                        <div className="flex items-center justify-end gap-1.5">
                          Total Spent {sortBy === 'totalSpent' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />)}
                        </div>
                      </th>
                      <th className="p-3.5 pr-4 text-right">Last Purchase</th>
                    </tr>
                  </thead>
                )}

                {/* 5. EXPENSES TABLE HEAD */}
                {activeReport === 'expenses' && (
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold bg-slate-950/40 print:bg-slate-100 print:text-slate-800">
                      <th onClick={() => handleSort('expenseDate')} className="p-3.5 pl-4 cursor-pointer hover:text-white">
                        <div className="flex items-center gap-1.5">
                          Date {sortBy === 'expenseDate' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />)}
                        </div>
                      </th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Description</th>
                      <th className="p-3.5">Payment Method</th>
                      <th className="p-3.5">Recorded By</th>
                      <th onClick={() => handleSort('amount')} className="p-3.5 pr-4 text-right cursor-pointer hover:text-white">
                        <div className="flex items-center justify-end gap-1.5">
                          Amount {sortBy === 'amount' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />)}
                        </div>
                      </th>
                    </tr>
                  </thead>
                )}

                {/* 6. PROFIT & LOSS TABLE HEAD */}
                {activeReport === 'profit' && (
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold bg-slate-950/40 print:bg-slate-100 print:text-slate-800">
                      <th onClick={() => handleSort('date')} className="p-3.5 pl-4 cursor-pointer hover:text-white">
                        <div className="flex items-center gap-1.5">
                          Period Interval {sortBy === 'date' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />)}
                        </div>
                      </th>
                      <th className="p-3.5 text-right">Revenue</th>
                      <th className="p-3.5 text-right">COGS</th>
                      <th className="p-3.5 text-right">Gross Profit</th>
                      <th className="p-3.5 text-right">Operating Expenses</th>
                      <th className="p-3.5 text-right">Net Profit</th>
                      <th className="p-3.5 pr-4 text-right">Margin %</th>
                    </tr>
                  </thead>
                )}

                {/* TABLE BODY ROWS */}
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                  {/* SALES ROWS */}
                  {activeReport === 'sales' &&
                    (reportData as SalesReportItem[]).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 pl-4 font-mono font-semibold text-slate-200">{row.invoiceNumber}</td>
                        <td className="p-3.5 text-slate-400">{new Date(row.createdAt).toLocaleDateString()}</td>
                        <td className="p-3.5 text-slate-200">
                          <div>{row.customerName}</div>
                          {row.customerCode && <div className="text-[10px] text-slate-500 font-mono">{row.customerCode}</div>}
                        </td>
                        <td className="p-3.5 text-slate-300">{row.cashierName}</td>
                        <td className="p-3.5 text-right font-mono text-slate-400">{row.itemsCount}</td>
                        <td className="p-3.5 text-right font-mono text-slate-300">${row.subtotal.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono text-slate-400">${row.taxAmount.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-400">${row.totalAmount.toFixed(2)}</td>
                        <td className="p-3.5 pr-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase ${
                              row.status === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : row.status === 'REFUNDED'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}

                  {/* PURCHASES ROWS */}
                  {activeReport === 'purchases' &&
                    (reportData as PurchasesReportItem[]).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 pl-4 font-mono font-semibold text-slate-200">{row.purchaseOrderNumber}</td>
                        <td className="p-3.5 text-slate-400">{new Date(row.purchaseDate).toLocaleDateString()}</td>
                        <td className="p-3.5 text-slate-200">
                          <div>{row.supplierName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{row.supplierCode}</div>
                        </td>
                        <td className="p-3.5 text-slate-300">{row.userName}</td>
                        <td className="p-3.5 text-right font-mono text-slate-400">{row.totalUnits}</td>
                        <td className="p-3.5 text-right font-mono text-slate-300">${row.subtotal.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-blue-400">${row.totalAmount.toFixed(2)}</td>
                        <td className="p-3.5 pr-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase ${
                              row.status === 'RECEIVED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : row.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}

                  {/* INVENTORY ROWS */}
                  {activeReport === 'inventory' &&
                    (reportData as InventoryReportItem[]).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 pl-4 font-semibold text-slate-200">{row.name}</td>
                        <td className="p-3.5 font-mono text-slate-400">{row.sku}</td>
                        <td className="p-3.5 text-slate-300">{row.category}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-100">{row.currentStock}</td>
                        <td className="p-3.5 text-right font-mono text-slate-400">${row.purchasePrice.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono text-slate-300">${row.sellingPrice.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-amber-400">${row.stockValue.toFixed(2)}</td>
                        <td className="p-3.5 pr-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase ${
                              row.statusTag === 'IN_STOCK'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : row.statusTag === 'LOW_STOCK'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : row.statusTag === 'OUT_OF_STOCK'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {row.statusTag.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}

                  {/* CUSTOMERS ROWS */}
                  {activeReport === 'customers' &&
                    (reportData as CustomersReportItem[]).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 pl-4 font-semibold text-slate-200">{row.name}</td>
                        <td className="p-3.5 font-mono text-slate-400">{row.code}</td>
                        <td className="p-3.5 text-slate-400">
                          <div>{row.email || '—'}</div>
                          {row.phone && <div className="text-[10px] text-slate-500">{row.phone}</div>}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-100">{row.ordersCount}</td>
                        <td className="p-3.5 text-right font-mono text-slate-300">${row.averageOrderValue.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-purple-400">${row.totalSpent.toFixed(2)}</td>
                        <td className="p-3.5 pr-4 text-right font-mono text-slate-400">
                          {row.lastPurchaseDate ? new Date(row.lastPurchaseDate).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                    ))}

                  {/* EXPENSES ROWS */}
                  {activeReport === 'expenses' &&
                    (reportData as ExpensesReportItem[]).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 pl-4 text-slate-400">{new Date(row.expenseDate).toLocaleDateString()}</td>
                        <td className="p-3.5 font-semibold text-slate-200">{row.category}</td>
                        <td className="p-3.5 text-slate-300">{row.description}</td>
                        <td className="p-3.5 text-slate-400 font-mono text-[11px]">{row.paymentMethod}</td>
                        <td className="p-3.5 text-slate-300">{row.userName}</td>
                        <td className="p-3.5 pr-4 text-right font-mono font-bold text-rose-400">-${row.amount.toFixed(2)}</td>
                      </tr>
                    ))}

                  {/* PROFIT & LOSS ROWS */}
                  {activeReport === 'profit' &&
                    (reportData as ProfitReportItem[]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 pl-4 font-semibold text-slate-200">{row.label}</td>
                        <td className="p-3.5 text-right font-mono text-emerald-400">${row.revenue.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono text-amber-400">-${row.cogs.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-indigo-400">${row.grossProfit.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono text-rose-400">-${row.expenses.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-cyan-400">${row.netProfit.toFixed(2)}</td>
                        <td className="p-3.5 pr-4 text-right font-mono font-bold text-purple-400">{row.profitMargin}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <div className="p-3.5 bg-slate-950/40 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 print:hidden">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1 rounded-lg text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-slate-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-all"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-slate-300">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-all"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Print Footer Note */}
      <div className="hidden print:block text-center text-[10px] text-slate-500 mt-6 pt-4 border-t border-slate-300">
        SmartStock Business Platform © {new Date().getFullYear()} · Automated System Audit · Confidential Corporate Telemetry
      </div>
    </DashboardLayout>
  );
}
