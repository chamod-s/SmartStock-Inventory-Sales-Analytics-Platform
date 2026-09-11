'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { PurchaseListItem, PurchaseSummary } from '@/types/purchase';
import {
  Plus,
  Search,
  ShoppingCart,
  DollarSign,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowUpDown,
  Filter,
  PackageCheck,
  Building2,
  Calendar,
} from 'lucide-react';

interface SupplierOption {
  id: string;
  code: string;
  name: string;
}

export default function PurchasesPage() {
  const { hasRole } = useAuth();
  const { success, error: showError } = useToast();
  const canManage = hasRole('ADMIN', 'MANAGER');

  // Purchases & Summary Data
  const [purchases, setPurchases] = useState<PurchaseListItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [summary, setSummary] = useState<PurchaseSummary>({
    totalPurchases: 0,
    totalSpend: 0,
    receivedCount: 0,
    pendingCount: 0,
    cancelledCount: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Receive Confirm Dialog State
  const [receivingPurchase, setReceivingPurchase] = useState<PurchaseListItem | null>(null);
  const [isReceiving, setIsReceiving] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load active suppliers for filter
  useEffect(() => {
    async function loadSuppliers() {
      try {
        const res = await api.get('/suppliers?limit=100');
        if (res.data.success) {
          setSuppliers(res.data.data.items || []);
        }
      } catch (err) {
        console.error('Failed to load suppliers for filter:', err);
      }
    }
    loadSuppliers();
  }, []);

  // Fetch Purchases
  const fetchPurchases = useCallback(
    async (isManualRefresh: boolean = false) => {
      try {
        if (isManualRefresh) setIsRefreshing(true);
        else setIsLoading(true);

        const params: Record<string, any> = {
          page: pagination.page,
          limit: pagination.limit,
          sortBy,
          sortOrder,
        };

        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (statusFilter !== 'all') params.status = statusFilter;
        if (supplierFilter !== 'all') params.supplierId = supplierFilter;

        const res = await api.get('/purchases', { params });
        if (res.data.success) {
          setPurchases(res.data.data.items || []);
          if (res.data.data.pagination) {
            setPagination((prev) => ({
              ...prev,
              totalItems: res.data.data.pagination.totalItems,
              totalPages: res.data.data.pagination.totalPages,
            }));
          }
          if (res.data.data.summary) {
            setSummary(res.data.data.summary);
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch purchases:', err);
        showError(err.response?.data?.message || 'Failed to fetch purchase orders');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [pagination.page, pagination.limit, debouncedSearch, statusFilter, supplierFilter, sortBy, sortOrder, showError]
  );

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // Handle Quick Receive Purchase
  const handleConfirmReceive = async () => {
    if (!receivingPurchase) return;
    try {
      setIsReceiving(true);
      const res = await api.put(`/purchases/${receivingPurchase.id}`, {
        status: 'RECEIVED',
      });
      if (res.data.success) {
        success(`Purchase order ${receivingPurchase.purchaseOrderNumber} received successfully! Stock replenished.`);
        setReceivingPurchase(null);
        fetchPurchases();
      }
    } catch (err: any) {
      console.error('Failed to receive purchase:', err);
      showError(err.response?.data?.message || 'Failed to receive purchase order');
    } finally {
      setIsReceiving(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setSupplierFilter('all');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const isFiltered = useMemo(() => {
    return debouncedSearch !== '' || statusFilter !== 'all' || supplierFilter !== 'all';
  }, [debouncedSearch, statusFilter, supplierFilter]);

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      <PageHeader
        title="Purchase Management"
        description="Monitor stock replenishment, supplier purchase orders, and inventory receipt workflows."
        breadcrumbs={[{ label: 'Purchases' }]}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchPurchases(true)}
              disabled={isLoading || isRefreshing}
              className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-all shadow-sm"
              title="Refresh Purchases"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-400' : ''}`} />
            </button>
            {canManage && (
              <Link
                href="/purchases/new"
                className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Purchase Order
              </Link>
            )}
          </div>
        }
      />

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Purchases</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-bold text-slate-100 font-mono">{summary.totalPurchases}</h4>
            <p className="text-xs text-slate-500 mt-1">Stock replenishment orders</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Spend</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-bold text-emerald-400 font-mono">
              ${summary.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <p className="text-xs text-slate-500 mt-1">Cumulative supplier expenditure</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Received Orders</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-bold text-slate-100 font-mono">{summary.receivedCount}</h4>
            <p className="text-xs text-emerald-500/80 mt-1">Stock credited & verified</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Orders</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-bold text-amber-400 font-mono">{summary.pendingCount}</h4>
            <p className="text-xs text-amber-500/80 mt-1">Awaiting delivery & receipt</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by PO number, supplier, or notes..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="RECEIVED">Received</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Supplier Filter */}
          <div className="md:col-span-3">
            <select
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="md:col-span-1 flex items-center">
            {isFiltered && (
              <button
                onClick={resetFilters}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                title="Reset All Filters"
              >
                <Filter className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        {isLoading ? (
          <div className="py-20">
            <LoadingState message="Loading purchase orders..." />
          </div>
        ) : purchases.length === 0 ? (
          <div className="py-16">
            <EmptyState
              title={isFiltered ? 'No matching purchase orders found' : 'No purchase orders yet'}
              description={
                isFiltered
                  ? 'Try adjusting your search terms or filter criteria to find purchase orders.'
                  : 'Start replenishing inventory by creating your first purchase order with an active supplier.'
              }
              action={
                canManage && !isFiltered ? (
                  <Link
                    href="/purchases/new"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Purchase Order
                  </Link>
                ) : isFiltered ? (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
                  >
                    Clear Filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-200 transition-colors"
                    onClick={() => handleSort('purchaseOrderNumber')}
                  >
                    <div className="flex items-center gap-1.5">
                      PO Number
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-200 transition-colors"
                    onClick={() => handleSort('purchaseDate')}
                  >
                    <div className="flex items-center gap-1.5">
                      Date
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Items</th>
                  <th className="py-3.5 px-4 text-right">Subtotal</th>
                  <th
                    className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-200 transition-colors"
                    onClick={() => handleSort('totalAmount')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Total
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {purchases.map((purchase) => {
                  const itemsCount = purchase._count?.items ?? purchase.items?.length ?? 0;
                  const formattedDate = new Date(purchase.purchaseDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr
                      key={purchase.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* PO Number */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-100">
                        <Link
                          href={`/purchases/${purchase.id}`}
                          className="text-brand-400 hover:text-brand-300 hover:underline flex items-center gap-1.5"
                        >
                          {purchase.purchaseOrderNumber}
                        </Link>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {formattedDate}
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200">
                            {purchase.supplier?.name || 'Unknown Supplier'}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            {purchase.supplier?.code}
                          </span>
                        </div>
                      </td>

                      {/* Items Count */}
                      <td className="py-3 px-4 text-slate-300">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">
                          {itemsCount} {itemsCount === 1 ? 'line item' : 'line items'}
                        </span>
                      </td>

                      {/* Subtotal */}
                      <td className="py-3 px-4 text-right font-mono text-slate-400 text-xs">
                        ${Number(purchase.subtotal).toFixed(2)}
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                        ${Number(purchase.totalAmount).toFixed(2)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={purchase.status} size="sm" />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && purchase.status === 'PENDING' && (
                            <button
                              onClick={() => setReceivingPurchase(purchase)}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
                              title="Receive Purchase Order and replenish stock"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              Receive
                            </button>
                          )}
                          <Link
                            href={`/purchases/${purchase.id}`}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                            title="View Purchase Order Details"
                          >
                            <Eye className="w-4 h-4" />
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

        {/* Pagination Footer */}
        {!isLoading && purchases.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-200">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-200">
                {Math.min(pagination.page * pagination.limit, pagination.totalItems)}
              </span>{' '}
              of <span className="font-semibold text-slate-200">{pagination.totalItems}</span> purchases
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl text-slate-300">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Receive Purchase Confirmation Modal */}
      {receivingPurchase && (
        <ConfirmDialog
          isOpen={!!receivingPurchase}
          onClose={() => setReceivingPurchase(null)}
          onConfirm={handleConfirmReceive}
          title="Receive Purchase Order"
          message={`Are you sure you want to mark ${receivingPurchase.purchaseOrderNumber} as RECEIVED? This will atomically increase product stock levels and record inventory audit transactions.`}
          confirmText="Confirm & Receive Stock"
          type="info"
          isLoading={isReceiving}
        />
      )}
    </DashboardLayout>
  );
}
