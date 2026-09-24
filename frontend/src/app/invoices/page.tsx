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
  FileText,
  Receipt,
  Search,
  Filter,
  RefreshCw,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
  Download,
  CheckCircle,
  Clock,
  ArrowUpDown,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { InvoiceSummaryItem } from '@/types/invoice';

export default function InvoicesPage() {
  const { error: showError } = useToast();

  const [invoices, setInvoices] = useState<InvoiceSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Computed summary metrics
  const [totalInvoicedAmount, setTotalInvoicedAmount] = useState<number>(0);
  const [totalPaidAmount, setTotalPaidAmount] = useState<number>(0);
  const [totalOutstanding, setTotalOutstanding] = useState<number>(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder,
      };

      const res = await api.get('/invoices', { params });
      if (res.data?.data) {
        let items: InvoiceSummaryItem[] = res.data.data.items || [];
        if (paymentStatusFilter !== 'all') {
          items = items.filter((inv) => inv.paymentStatus === paymentStatusFilter);
        }
        setInvoices(items);

        if (res.data.data.pagination) {
          setTotalPages(res.data.data.pagination.totalPages);
          setTotalItems(res.data.data.pagination.totalItems);
        }

        // Aggregate current page metrics
        let invoiced = 0;
        let paid = 0;
        let balance = 0;
        for (const item of items) {
          invoiced += item.totalAmount;
          paid += item.totalPaid;
          balance += item.balanceRemaining;
        }
        setTotalInvoicedAmount(invoiced);
        setTotalPaidAmount(paid);
        setTotalOutstanding(balance);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to fetch invoices');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, paymentStatusFilter, startDate, endDate, sortBy, sortOrder, showError]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const res = await api.get(`/invoices/${invoiceId}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNumber}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      showError('Failed to download invoice document');
    }
  };

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
      {/* Header */}
      <PageHeader
        title="Commercial Invoices"
        description="Audit, view, print, and export official commercial invoices generated from completed sales"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchInvoices()}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
              title="Refresh Invoices"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              href="/sales/new"
              className="px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New POS Checkout</span>
            </Link>
          </div>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Invoiced</span>
            <div className="text-xl font-black font-mono text-white mt-0.5">
              ${totalInvoicedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
              {totalItems} total invoice records
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-medium">Collections Received</span>
            <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">
              ${totalPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
              Tendered & cleared funds
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-medium">Outstanding Balance</span>
            <div
              className={`text-xl font-black font-mono mt-0.5 ${
                totalOutstanding > 0 ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
              Receivables due
            </span>
          </div>
          <div
            className={`p-2.5 rounded-xl ${
              totalOutstanding > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700/40 text-slate-400'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 mb-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice number, customer..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="bg-slate-900/60 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="all">All Payment Statuses</option>
                <option value="PAID">Paid in Full</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-900/60 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-900/60 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
        {isLoading ? (
          <div className="py-20">
            <LoadingState message="Loading sales invoices..." />
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<FileText className="w-12 h-12 text-slate-500" />}
              title="No Invoices Found"
              description="Completed POS sales will automatically generate invoice records here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700/80 bg-slate-900/40 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4">Method</th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('totalAmount')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Total</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-700/20 transition-colors text-slate-200"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-mono font-bold text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-brand-400" />
                        <span>{inv.invoiceNumber}</span>
                      </Link>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {new Date(inv.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-medium text-white">
                      {inv.customerName}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {inv.cashierName}
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-400">
                      {inv.itemCount}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-slate-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {inv.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      ${inv.totalAmount.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                      ${inv.totalPaid.toFixed(2)}
                    </td>

                    <td
                      className={`py-3 px-4 text-right font-mono font-bold ${
                        inv.balanceRemaining > 0 ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    >
                      ${inv.balanceRemaining.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={inv.paymentStatus || 'PAID'} size="sm" />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                          title="View Official Invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => handleDownloadInvoice(inv.id, inv.invoiceNumber)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-brand-400 hover:text-brand-300 rounded-lg transition-colors"
                          title="Download Printable HTML Invoice"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page <span className="font-bold text-white">{page}</span> of{' '}
              <span className="font-bold text-white">{totalPages}</span> ({totalItems} invoices)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-slate-700 text-slate-200 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-slate-700 text-slate-200 transition-colors flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
