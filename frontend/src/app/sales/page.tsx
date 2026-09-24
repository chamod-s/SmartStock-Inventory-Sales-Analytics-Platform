'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  RefreshCw,
  DollarSign,
  TrendingUp,
  CreditCard,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
  ShoppingBag,
} from 'lucide-react';
import { SaleListItem, SaleSummary } from '@/types/sale';

export default function SalesPage() {
  const { error: showError } = useToast();

  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [summary, setSummary] = useState<SaleSummary>({
    totalSales: 0,
    totalRevenue: 0,
    completedCount: 0,
    refundedCount: 0,
    cancelledCount: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });

      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (paymentFilter !== 'all') params.append('paymentMethod', paymentFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/sales?${params.toString()}`);
      if (res.data?.data) {
        setSales(res.data.data.items || []);
        if (res.data.data.pagination) {
          setTotalPages(res.data.data.pagination.totalPages || 1);
          setTotalItems(res.data.data.pagination.totalItems || 0);
        }
        if (res.data.data.summary) {
          setSummary(res.data.data.summary);
        }
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to fetch sales transactions');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, paymentFilter, startDate, endDate, sortBy, sortOrder, showError]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
      {/* Header */}
      <PageHeader
        title="Sales & Point of Sale (POS)"
        description="Inspect completed checkout orders, track revenues, inspect customer invoice details, or launch the POS register."
        breadcrumbs={[{ label: 'Sales' }]}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchSales()}
              title="Refresh Sales"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 transition-all flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link
              href="/sales/new"
              className="px-4 py-2.5 bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/25 transition-all flex items-center gap-2 group"
            >
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
              <span>Launch POS Register</span>
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Revenue */}
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
              Total Revenue
            </span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            ${summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
            <span className="text-slate-200 font-medium">{summary.completedCount}</span> completed sales orders
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-brand-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
              Total Orders
            </span>
            <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-xl border border-brand-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {summary.totalSales}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
            <span>Average: </span>
            <span className="text-brand-300 font-bold">
              ${summary.totalSales > 0 ? (summary.totalRevenue / summary.totalSales).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* Completed Status */}
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
              Completed Checkouts
            </span>
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-400 font-mono">
            {summary.completedCount}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Fully paid and stock decremented
          </div>
        </div>

        {/* Refunded / Cancelled */}
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
              Refunds / Cancelled
            </span>
            <div className="p-2.5 bg-slate-700/40 text-slate-400 rounded-xl border border-slate-600">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-300 font-mono">
            {summary.refundedCount + summary.cancelledCount}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {summary.refundedCount} refunded &bull; {summary.cancelledCount} cancelled
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Invoice #, Customer, or Cashier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Payment Method Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 focus:outline-none"
          >
            <option value="all">All Payment Methods</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="ONLINE">Online</option>
          </select>

          {/* Date Filters */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 focus:outline-none"
            title="Start Date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 focus:outline-none"
            title="End Date"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 whitespace-nowrap">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900/60 border border-slate-700/60 rounded-lg text-xs text-slate-200 focus:outline-none"
          >
            <option value="createdAt">Date Created</option>
            <option value="totalAmount">Total Amount</option>
            <option value="invoiceNumber">Invoice Number</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 bg-slate-900/60 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white"
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <LoadingState message="Loading sales transactions..." />
        ) : sales.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-12 h-12 text-slate-500" />}
            title="No sales transactions found"
            description={
              searchTerm || paymentFilter !== 'all' || startDate || endDate
                ? 'No sales match your active search and date filters.'
                : 'No sales have been processed yet. Click Launch POS Register to start checkout.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/60 bg-slate-900/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Cashier</th>
                  <th className="py-3.5 px-4 text-center">Items</th>
                  <th className="py-3.5 px-4 text-right">Total Paid</th>
                  <th className="py-3.5 px-4 text-center">Payment Method</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {sales.map((sale) => {
                  const paymentMethod = sale.payments?.[0]?.paymentMethod || 'CASH';
                  const dateStr = new Date(sale.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={sale.id} className="hover:bg-slate-700/20 transition-colors group">
                      {/* Invoice # */}
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-400 whitespace-nowrap">
                        <Link href={`/sales/${sale.id}`} className="hover:underline flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-slate-500" />
                          <span>{sale.invoiceNumber}</span>
                        </Link>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-300 font-mono">
                        {dateStr}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-100">
                          {sale.customer?.name || 'Walk-in Customer'}
                        </div>
                        {sale.customer?.phone && (
                          <div className="text-xs text-slate-500 font-mono">
                            {sale.customer.phone}
                          </div>
                        )}
                      </td>

                      {/* Cashier */}
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        {sale.user?.name || 'Cashier'}
                      </td>

                      {/* Items Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700/60 text-xs font-mono text-slate-300">
                          {sale.items?.length || 0}
                        </span>
                      </td>

                      {/* Total Paid */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-base text-emerald-400">
                        ${Number(sale.totalAmount).toFixed(2)}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={paymentMethod} />
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={sale.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/sales/${sale.id}`}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-brand-600/30 text-slate-300 hover:text-brand-300 border border-slate-700 hover:border-brand-500/40 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5"
                          title="View Invoice & Receipt"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Invoice</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing {sales.length} of {totalItems} transactions
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
