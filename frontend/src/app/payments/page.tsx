'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { FormField, Input } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import {
  CreditCard,
  Banknote,
  Building,
  Globe,
  Plus,
  Search,
  RefreshCw,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  ArrowUpDown,
  Receipt,
  User,
  Filter,
} from 'lucide-react';
import { PaymentItem, PaymentSummary } from '@/types/payment';
import { PaymentMethod } from '@/types/sale';

export default function PaymentsPage() {
  const { error: showError, success: showSuccess } = useToast();

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    totalPayments: 0,
    totalAmount: 0,
    cashTotal: 0,
    cardTotal: 0,
    bankTransferTotal: 0,
    onlineTotal: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('paidAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // View Payment Modal State
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Record Payment Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [newSaleId, setNewSaleId] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newMethod, setNewMethod] = useState<PaymentMethod>('CASH');
  const [newRef, setNewRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
        paymentMethod: methodFilter !== 'all' ? methodFilter : undefined,
        search: debouncedSearch.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder,
      };

      const res = await api.get('/payments', { params });
      if (res.data?.data) {
        setPayments(res.data.data.items || res.data.data);
        if (res.data.data.pagination) {
          setTotalPages(res.data.data.pagination.totalPages);
          setTotalItems(res.data.data.pagination.totalItems);
        }
        if (res.data.data.summary) {
          setSummary(res.data.data.summary);
        }
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to fetch payments data');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, methodFilter, debouncedSearch, startDate, endDate, sortBy, sortOrder, showError]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleOpenViewModal = (payment: PaymentItem) => {
    setSelectedPayment(payment);
    setIsViewModalOpen(true);
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newAmount);
    if (!newSaleId.trim()) {
      showError('Sale ID is required');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      showError('Payment amount must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/payments', {
        saleId: newSaleId.trim(),
        amount: amt,
        paymentMethod: newMethod,
        transactionRef: newRef.trim() || undefined,
      });

      showSuccess(`Payment of $${amt.toFixed(2)} recorded successfully`);
      setIsRecordModalOpen(false);
      setNewSaleId('');
      setNewAmount('');
      setNewMethod('CASH');
      setNewRef('');
      await fetchPayments();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodIcon = (method: PaymentMethod) => {
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

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
      {/* Header */}
      <PageHeader
        title="Payments & Collections"
        description="Audit payment history, manage multi-channel collections, and record customer payments"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchPayments()}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
              title="Refresh Payments"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsRecordModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          </div>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Total Collected */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Collected</span>
            <div className="text-lg font-black font-mono text-white mt-0.5">
              ${summary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
              {summary.totalPayments} transactions
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Cash Total */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-medium">Cash Collections</span>
            <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
              ${summary.cashTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
              Physical Tender
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        {/* Card Total */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-medium">Card Payments</span>
            <div className="text-lg font-black font-mono text-blue-400 mt-0.5">
              ${summary.cardTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
              Credit / Debit POS
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Bank Transfer Total */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-medium">Bank Transfers</span>
            <div className="text-lg font-black font-mono text-teal-400 mt-0.5">
              ${summary.bankTransferTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
              Direct Wire / ACH
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400">
            <Building className="w-5 h-5" />
          </div>
        </div>

        {/* Online Total */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-medium">Online & Digital</span>
            <div className="text-lg font-black font-mono text-cyan-400 mt-0.5">
              ${summary.onlineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
              Web & Wallet Pay
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Globe className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 mb-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice, customer, ref..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Payment Method Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-900/60 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="all">All Payment Methods</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>

            {/* Date Range */}
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

      {/* Payments Data Table */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
        {isLoading ? (
          <div className="py-20">
            <LoadingState message="Fetching payment history..." />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<CreditCard className="w-12 h-12 text-slate-500" />}
              title="No Payment Records Found"
              description="Try adjusting your search criteria, dates, or method filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700/80 bg-slate-900/40 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('paidAt')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date & Time</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Reference</th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Amount Paid</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payments.map((p) => {
                  const saleTotal = Number(p.sale?.totalAmount || 0);
                  const paymentAmt = Number(p.amount);
                  const isPaid = (p.totalPaid || paymentAmt) >= saleTotal - 0.001;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-700/20 transition-colors text-slate-200"
                    >
                      <td className="py-3 px-4 font-mono text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {new Date(p.paidAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Link
                          href={`/sales/${p.saleId}`}
                          className="font-mono font-bold text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1.5"
                        >
                          <Receipt className="w-3.5 h-3.5 text-brand-400" />
                          <span>{p.sale?.invoiceNumber || 'INV-SALE'}</span>
                        </Link>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-white">
                          {p.sale?.customer?.name || 'Walk-in Customer'}
                        </div>
                        {p.sale?.customer?.code && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {p.sale.customer.code}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{p.sale?.user?.name || 'Cashier'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-200">
                          {getMethodIcon(p.paymentMethod)}
                          <span>{p.paymentMethod.replace('_', ' ')}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400">
                        {p.transactionRef || '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-400 text-sm">
                        ${paymentAmt.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <StatusBadge
                          status={p.paymentStatus || (isPaid ? 'PAID' : 'PARTIALLY_PAID')}
                          size="sm"
                        />
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenViewModal(p)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                            title="View Payment Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/sales/${p.saleId}`}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-brand-400 hover:text-brand-300 rounded-lg transition-colors"
                            title="View Sale Invoice"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing page <span className="font-bold text-white">{page}</span> of{' '}
              <span className="font-bold text-white">{totalPages}</span> ({totalItems} records)
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

      {/* View Payment Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Payment Transaction Details"
      >
        {selectedPayment && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                  Amount Tendered
                </span>
                <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                  ${Number(selectedPayment.amount).toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 uppercase font-semibold block mb-1">
                  Method
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-white">
                  {getMethodIcon(selectedPayment.paymentMethod)}
                  <span>{selectedPayment.paymentMethod.replace('_', ' ')}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                  Payment Reference
                </span>
                <div className="font-mono text-white text-xs">
                  {selectedPayment.transactionRef || 'N/A'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                  Timestamp
                </span>
                <div className="font-mono text-slate-200 text-xs">
                  {new Date(selectedPayment.paidAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Associated Sale
              </span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Invoice:</span>
                <Link
                  href={`/sales/${selectedPayment.saleId}`}
                  className="font-mono font-bold text-brand-400 hover:underline"
                >
                  {selectedPayment.sale?.invoiceNumber || selectedPayment.saleId}
                </Link>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-white">
                  {selectedPayment.sale?.customer?.name || 'Walk-in Customer'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Sale Total:</span>
                <span className="font-mono font-bold text-white">
                  ${Number(selectedPayment.sale?.totalAmount || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Payment Status:</span>
                <StatusBadge
                  status={selectedPayment.paymentStatus || 'PAID'}
                  size="sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Link
                href={`/sales/${selectedPayment.saleId}`}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>View Full Invoice</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record New Customer Payment"
      >
        <form onSubmit={handleRecordSubmit} className="space-y-4">
          <FormField label="Sale ID or UUID" required>
            <Input
              type="text"
              value={newSaleId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSaleId(e.target.value)}
              placeholder="Enter Sale ID from invoice"
            />
          </FormField>

          <FormField label="Payment Amount ($)" required>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={newAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAmount(e.target.value)}
              placeholder="0.00"
            />
          </FormField>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Payment Method *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE'] as PaymentMethod[]).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setNewMethod(method)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                    newMethod === method
                      ? 'bg-brand-600/20 border-brand-500 text-white'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {getMethodIcon(method)}
                  <span>{method.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          </div>

          <FormField label="Transaction Reference / Note (Optional)">
            <Input
              type="text"
              value={newRef}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRef(e.target.value)}
              placeholder="e.g. CARD-AUTH-10928, Wire-Ref-441"
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
