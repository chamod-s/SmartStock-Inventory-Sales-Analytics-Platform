'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { FormField, Input, Select, Textarea } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  Boxes,
  Package,
  SlidersHorizontal,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  History,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Layers,
  Calendar,
  User,
  FileText,
  AlertCircle,
  Plus,
  Minus,
  CheckCircle2,
} from 'lucide-react';
import {
  InventoryItem,
  InventoryTransactionItem,
  InventorySummary,
  LowStockAlertItem,
  TransactionType,
  StockStatus,
  InventoryAdjustmentPayload,
  InventoryPaginationMeta,
} from '@/types/inventory';

type ActiveTab = 'stock' | 'history' | 'alerts';

export default function InventoryPage() {
  const { hasRole, user } = useAuth();
  const { success, error: showError, info } = useToast();
  const canAdjust = hasRole('ADMIN', 'MANAGER');

  // Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('stock');

  // Inventory Stock Data State
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [stockPagination, setStockPagination] = useState<InventoryPaginationMeta>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // History Data State
  const [historyItems, setHistoryItems] = useState<InventoryTransactionItem[]>([]);
  const [historyPagination, setHistoryPagination] = useState<InventoryPaginationMeta>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Low-Stock Alerts State
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlertItem[]>([]);

  // Summary State
  const [summary, setSummary] = useState<InventorySummary>({
    totalProducts: 0,
    totalStockUnits: 0,
    totalValuation: 0,
    totalRetailValuation: 0,
    potentialProfit: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockCount: 0,
  });

  // Categories for Filter
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Loading States
  const [isLoadingStock, setIsLoadingStock] = useState<boolean>(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filters - Stock Tab
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filters - History Tab
  const [historySearch, setHistorySearch] = useState<string>('');
  const [debouncedHistorySearch, setDebouncedHistorySearch] = useState<string>('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('all');
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');

  // SKU Copy Feedback
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [adjustProductId, setAdjustProductId] = useState<string>('');
  const [adjustType, setAdjustType] = useState<TransactionType>('ADJUSTMENT');
  const [adjustMode, setAdjustMode] = useState<'ADD' | 'DEDUCT' | 'SET'>('ADD');
  const [adjustQuantity, setAdjustQuantity] = useState<string>('1');
  const [adjustTargetStock, setAdjustTargetStock] = useState<string>('0');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustReference, setAdjustReference] = useState<string>('');

  // Debounce search terms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedHistorySearch(historySearch);
    }, 350);
    return () => clearTimeout(handler);
  }, [historySearch]);

  // Load Categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.get('/categories?limit=100&status=active');
        if (res.data?.data?.items) {
          setCategories(res.data.data.items);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    fetchCategories();
  }, []);

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/inventory/summary');
      if (res.data?.data) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch inventory summary', err);
    }
  }, []);

  // Fetch Inventory Stock Items
  const fetchInventoryItems = useCallback(
    async (page = stockPagination.page) => {
      setIsLoadingStock(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(stockPagination.limit),
          sortBy,
          sortOrder,
        });

        if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
        if (categoryFilter !== 'all') params.append('categoryId', categoryFilter);
        if (stockStatusFilter !== 'all') params.append('stockStatus', stockStatusFilter);

        const res = await api.get(`/inventory?${params.toString()}`);
        if (res.data?.data) {
          setInventoryItems(res.data.data.items || []);
          if (res.data.data.pagination) {
            setStockPagination(res.data.data.pagination);
          }
          if (res.data.data.summary) {
            setSummary(res.data.data.summary);
          }
        }
      } catch (err: any) {
        showError(err.response?.data?.message || 'Failed to load inventory items');
      } finally {
        setIsLoadingStock(false);
      }
    },
    [
      stockPagination.page,
      stockPagination.limit,
      debouncedSearch,
      categoryFilter,
      stockStatusFilter,
      sortBy,
      sortOrder,
      showError,
    ]
  );

  // Fetch History Items
  const fetchHistoryItems = useCallback(
    async (page = historyPagination.page) => {
      setIsLoadingHistory(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(historyPagination.limit),
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        if (debouncedHistorySearch.trim()) params.append('search', debouncedHistorySearch.trim());
        if (historyTypeFilter !== 'all') params.append('type', historyTypeFilter);
        if (historyStartDate) params.append('startDate', historyStartDate);
        if (historyEndDate) params.append('endDate', historyEndDate);

        const res = await api.get(`/inventory/history?${params.toString()}`);
        if (res.data?.data) {
          setHistoryItems(res.data.data.items || []);
          if (res.data.data.pagination) {
            setHistoryPagination(res.data.data.pagination);
          }
        }
      } catch (err: any) {
        showError(err.response?.data?.message || 'Failed to load inventory history');
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [
      historyPagination.page,
      historyPagination.limit,
      debouncedHistorySearch,
      historyTypeFilter,
      historyStartDate,
      historyEndDate,
      showError,
    ]
  );

  // Fetch Low-Stock Alerts
  const fetchLowStockAlerts = useCallback(async () => {
    setIsLoadingAlerts(true);
    try {
      const res = await api.get('/inventory/low-stock?limit=100');
      if (res.data?.data) {
        setLowStockAlerts(res.data.data || []);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to load low-stock alerts');
    } finally {
      setIsLoadingAlerts(false);
    }
  }, [showError]);

  // Initial & Tab-switch triggers
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab === 'stock') {
      fetchInventoryItems(1);
    } else if (activeTab === 'history') {
      fetchHistoryItems(1);
    } else if (activeTab === 'alerts') {
      fetchLowStockAlerts();
    }
  }, [activeTab, debouncedSearch, categoryFilter, stockStatusFilter, sortBy, sortOrder, debouncedHistorySearch, historyTypeFilter, historyStartDate, historyEndDate]);

  // Selected Product for Adjustment
  const selectedProduct = useMemo(() => {
    return inventoryItems.find((p) => p.id === adjustProductId) || null;
  }, [inventoryItems, adjustProductId]);

  // Stock Projection Calculation
  const stockCalculation = useMemo(() => {
    if (!selectedProduct) return { before: 0, delta: 0, after: 0, isNegative: false };

    const before = selectedProduct.currentStock;
    let delta = 0;
    const qty = parseInt(adjustQuantity, 10) || 0;
    const target = parseInt(adjustTargetStock, 10) || 0;

    if (adjustMode === 'ADD') {
      delta = Math.abs(qty);
    } else if (adjustMode === 'DEDUCT') {
      delta = -Math.abs(qty);
    } else if (adjustMode === 'SET') {
      delta = target - before;
    }

    const after = before + delta;
    return {
      before,
      delta,
      after,
      isNegative: after < 0,
    };
  }, [selectedProduct, adjustMode, adjustQuantity, adjustTargetStock]);

  // Copy SKU helper
  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    info(`Copied SKU: ${sku}`);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  // Open Adjustment Modal
  const openAdjustmentModal = (product?: InventoryItem) => {
    if (!canAdjust) {
      showError('Only Admins and Managers have permission to adjust inventory stock.');
      return;
    }

    if (product) {
      setAdjustProductId(product.id);
      setAdjustTargetStock(String(product.currentStock));
    } else if (inventoryItems.length > 0 && !adjustProductId) {
      setAdjustProductId(inventoryItems[0].id);
      setAdjustTargetStock(String(inventoryItems[0].currentStock));
    }

    setAdjustType('ADJUSTMENT');
    setAdjustMode('ADD');
    setAdjustQuantity('1');
    setAdjustReason('');
    setAdjustReference('');
    setIsAdjustModalOpen(true);
  };

  // Submit Adjustment
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adjustProductId) {
      showError('Please select a product to adjust');
      return;
    }

    if (!adjustReason.trim() || adjustReason.trim().length < 3) {
      showError('Please provide a descriptive reason for this adjustment (at least 3 characters)');
      return;
    }

    if (stockCalculation.isNegative) {
      showError('Cannot execute adjustment: Operation would result in negative inventory.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: InventoryAdjustmentPayload = {
        productId: adjustProductId,
        type: adjustType,
        mode: adjustMode,
        reason: adjustReason.trim(),
        reference: adjustReference.trim() || undefined,
      };

      if (adjustMode === 'SET') {
        payload.targetStock = parseInt(adjustTargetStock, 10);
      } else {
        payload.quantity = parseInt(adjustQuantity, 10);
      }

      const res = await api.post('/inventory/adjust', payload);

      if (res.data?.success) {
        const deltaStr =
          stockCalculation.delta > 0
            ? `+${stockCalculation.delta}`
            : `${stockCalculation.delta}`;
        success(
          `Stock updated for ${selectedProduct?.name || 'Product'} (${deltaStr} units). New stock: ${stockCalculation.after}`
        );
        setIsAdjustModalOpen(false);

        // Refresh active views
        fetchSummary();
        fetchInventoryItems(stockPagination.page);
        if (activeTab === 'history') fetchHistoryItems(1);
        if (activeTab === 'alerts') fetchLowStockAlerts();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to adjust inventory stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
      {/* Header */}
      <PageHeader
        title="Inventory Management"
        description="Real-time stock valuation, inventory transaction audit log, stock adjustments, and reorder alerts."
        breadcrumbs={[{ label: 'Inventory' }]}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchSummary();
                if (activeTab === 'stock') fetchInventoryItems();
                if (activeTab === 'history') fetchHistoryItems();
                if (activeTab === 'alerts') fetchLowStockAlerts();
              }}
              title="Refresh Inventory"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 transition-all flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {canAdjust ? (
              <button
                onClick={() => openAdjustmentModal()}
                className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 group"
              >
                <SlidersHorizontal className="w-4 h-4 transition-transform group-hover:rotate-45" />
                <span>Stock Adjustment</span>
              </button>
            ) : (
              <span
                title="Only Administrators and Managers can execute stock adjustments"
                className="px-3 py-2 bg-slate-800/60 text-slate-400 text-xs rounded-xl border border-slate-700/60 flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Read-Only Access
              </span>
            )}
          </div>
        }
      />

      {/* KPI Cards Summary Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Stock Units */}
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-brand-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
              Total Stock Units
            </span>
            <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-xl border border-brand-500/20">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {summary.totalStockUnits.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-300 font-semibold">{summary.totalProducts}</span> unique catalog SKUs
          </div>
        </div>

        {/* Total Stock Valuation */}
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
              Inventory Valuation
            </span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            ${summary.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span>Retail value: </span>
            <span className="text-slate-300 font-medium">
              ${summary.totalRetailValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => setActiveTab('alerts')}
          className="cursor-pointer bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-amber-500/50 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
              Low Stock Items
            </span>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono">
            {summary.lowStockCount}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">At or below reorder level</span>
            <span className="text-brand-400 font-semibold group-hover:underline flex items-center gap-0.5">
              View alerts &rarr;
            </span>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-red-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
              Out of Stock
            </span>
            <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-red-400 font-mono">
            {summary.outOfStockCount}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span className="text-emerald-400 font-medium">{summary.inStockCount}</span> items healthy & in stock
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center border-b border-slate-800 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3.5 px-4 text-sm font-semibold flex items-center gap-2.5 transition-all relative ${
            activeTab === 'stock'
              ? 'text-brand-400 border-b-2 border-brand-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Current Stock & Valuation</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 font-mono">
            {summary.totalProducts}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3.5 px-4 text-sm font-semibold flex items-center gap-2.5 transition-all relative ${
            activeTab === 'history'
              ? 'text-brand-400 border-b-2 border-brand-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Inventory Audit Log & History</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`pb-3.5 px-4 text-sm font-semibold flex items-center gap-2.5 transition-all relative ${
            activeTab === 'alerts'
              ? 'text-amber-400 border-b-2 border-amber-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Low-Stock Alerts</span>
          {(summary.lowStockCount > 0 || summary.outOfStockCount > 0) && (
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
              {summary.lowStockCount + summary.outOfStockCount}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: CURRENT STOCK & VALUATION */}
      {/* ============================================================== */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by Product Name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Stock Status Filter */}
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="all">All Stock Statuses</option>
                <option value="IN_STOCK">In Stock (Healthy)</option>
                <option value="LOW_STOCK">Low Stock (≤ Reorder Level)</option>
                <option value="OUT_OF_STOCK">Out of Stock (Zero Units)</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900/60 border border-slate-700/60 rounded-lg text-xs text-slate-200 focus:outline-none"
              >
                <option value="name">Product Name</option>
                <option value="sku">SKU</option>
                <option value="currentStock">Current Stock</option>
                <option value="reorderLevel">Reorder Level</option>
                <option value="stockValue">Stock Value ($)</option>
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

          {/* Stock Table */}
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
            {isLoadingStock ? (
              <LoadingState message="Loading inventory stock and valuations..." />
            ) : inventoryItems.length === 0 ? (
              <EmptyState
                icon={<Boxes className="w-12 h-12 text-slate-500" />}
                title="No inventory items found"
                description={
                  searchTerm || categoryFilter !== 'all' || stockStatusFilter !== 'all'
                    ? 'No products match your active search filters.'
                    : 'Your catalog has no inventory items recorded yet.'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/60 bg-slate-900/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Product</th>
                      <th className="py-3.5 px-4">SKU</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4 text-right">Current Stock</th>
                      <th className="py-3.5 px-4 text-right">Reorder Level</th>
                      <th className="py-3.5 px-4 text-right">Stock Value</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {inventoryItems.map((item) => {
                      const isLow = item.currentStock <= item.reorderLevel && item.currentStock > 0;
                      const isOut = item.currentStock <= 0;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-700/20 transition-colors group"
                        >
                          {/* Product */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-center text-slate-400 group-hover:text-brand-400 group-hover:border-brand-500/30 transition-colors">
                                <Package className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-semibold text-slate-100 group-hover:text-white">
                                  {item.name}
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2">
                                  <span>Unit: {item.unit}</span>
                                  <span>&bull;</span>
                                  <span>Cost: ${item.purchasePrice.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* SKU */}
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleCopySku(item.sku)}
                              className="font-mono text-xs font-medium text-slate-300 hover:text-brand-400 bg-slate-900/60 px-2 py-1 rounded-md border border-slate-700/60 inline-flex items-center gap-1.5 transition-colors"
                              title="Click to copy SKU"
                            >
                              <span>{item.sku}</span>
                              {copiedSku === item.sku ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                              )}
                            </button>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-1 text-xs rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 font-medium">
                              {item.category?.name || 'Uncategorized'}
                            </span>
                          </td>

                          {/* Current Stock */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-baseline gap-1 font-mono font-bold text-base">
                              <span
                                className={
                                  isOut
                                    ? 'text-red-400'
                                    : isLow
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }
                              >
                                {item.currentStock}
                              </span>
                              <span className="text-xs text-slate-500 font-normal">
                                {item.unit}
                              </span>
                            </div>
                          </td>

                          {/* Reorder Level */}
                          <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                            {item.reorderLevel} {item.unit}
                          </td>

                          {/* Stock Value */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="font-mono font-bold text-slate-100">
                              ${item.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              (${item.purchasePrice.toFixed(2)} / unit)
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <StatusBadge status={item.stockStatus} />
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            {canAdjust && (
                              <button
                                onClick={() => openAdjustmentModal(item)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-brand-600/30 text-slate-300 hover:text-brand-300 border border-slate-700 hover:border-brand-500/40 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5"
                                title="Adjust product stock"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>Adjust</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {stockPagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div>
                  Showing {inventoryItems.length} of {stockPagination.totalItems} items
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={!stockPagination.hasPrevPage}
                    onClick={() => fetchInventoryItems(stockPagination.page - 1)}
                    className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2">
                    Page {stockPagination.page} of {stockPagination.totalPages}
                  </span>
                  <button
                    disabled={!stockPagination.hasNextPage}
                    onClick={() => fetchInventoryItems(stockPagination.page + 1)}
                    className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: INVENTORY AUDIT LOG & HISTORY */}
      {/* ============================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* History Filters */}
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by Product, SKU, reason, or reference ID..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Transaction Type Filter */}
              <select
                value={historyTypeFilter}
                onChange={(e) => setHistoryTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 focus:outline-none"
              >
                <option value="all">All Movement Types</option>
                <option value="PURCHASE">PURCHASE (PO Inflow)</option>
                <option value="SALE">SALE (POS Outflow)</option>
                <option value="RETURN">RETURN (Restock)</option>
                <option value="DAMAGE">DAMAGE (Write-off)</option>
                <option value="ADJUSTMENT">ADJUSTMENT (Audit count)</option>
              </select>

              {/* Date Filters */}
              <input
                type="date"
                value={historyStartDate}
                onChange={(e) => setHistoryStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 focus:outline-none"
                title="Start Date"
              />
              <input
                type="date"
                value={historyEndDate}
                onChange={(e) => setHistoryEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 focus:outline-none"
                title="End Date"
              />
            </div>
          </div>

          {/* History Table */}
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
            {isLoadingHistory ? (
              <LoadingState message="Loading inventory transaction history..." />
            ) : historyItems.length === 0 ? (
              <EmptyState
                icon={<History className="w-12 h-12 text-slate-500" />}
                title="No inventory movements found"
                description={
                  historySearch || historyTypeFilter !== 'all' || historyStartDate || historyEndDate
                    ? 'No transactions match the selected filters.'
                    : 'No inventory audit transactions have been recorded yet.'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/60 bg-slate-900/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4">Product</th>
                      <th className="py-3.5 px-4">Transaction Type</th>
                      <th className="py-3.5 px-4 text-right">Quantity</th>
                      <th className="py-3.5 px-4 text-right">Stock Before</th>
                      <th className="py-3.5 px-4 text-right">Stock After</th>
                      <th className="py-3.5 px-4">Reason / Notes</th>
                      <th className="py-3.5 px-4">Authorized User</th>
                      <th className="py-3.5 px-4">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {historyItems.map((tx) => {
                      const isPositive = tx.quantity > 0;
                      const formattedDate = new Date(tx.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr key={tx.id} className="hover:bg-slate-700/20 transition-colors">
                          {/* Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-300 font-mono">
                            {formattedDate}
                          </td>

                          {/* Product */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-100">{tx.product?.name}</div>
                            <div className="text-xs font-mono text-slate-400">{tx.product?.sku}</div>
                          </td>

                          {/* Transaction Type */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <StatusBadge status={tx.type} />
                          </td>

                          {/* Quantity */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md ${
                                isPositive
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}
                            >
                              {isPositive ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3" />
                              )}
                              {isPositive ? `+${tx.quantity}` : tx.quantity}
                            </span>
                          </td>

                          {/* Stock Before */}
                          <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                            {tx.stockBefore}
                          </td>

                          {/* Stock After */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                            {tx.stockAfter}
                          </td>

                          {/* Reason */}
                          <td className="py-3.5 px-4 max-w-xs truncate text-xs text-slate-300" title={tx.reason}>
                            {tx.reason}
                          </td>

                          {/* User */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {tx.user ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-6 h-6 rounded-full bg-slate-800 text-brand-400 flex items-center justify-center text-xs font-bold border border-slate-700">
                                  {tx.user.name.charAt(0)}
                                </span>
                                <span className="text-xs text-slate-300">{tx.user.name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500 italic">System Automation</span>
                            )}
                          </td>

                          {/* Reference */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-400">
                            {tx.reference ? (
                              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-brand-400">
                                {tx.reference}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {historyPagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div>
                  Showing {historyItems.length} of {historyPagination.totalItems} records
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={!historyPagination.hasPrevPage}
                    onClick={() => fetchHistoryItems(historyPagination.page - 1)}
                    className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2">
                    Page {historyPagination.page} of {historyPagination.totalPages}
                  </span>
                  <button
                    disabled={!historyPagination.hasNextPage}
                    onClick={() => fetchHistoryItems(historyPagination.page + 1)}
                    className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: LOW-STOCK ALERTS */}
      {/* ============================================================== */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Banner notification */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-300">
                Automated Replenishment Alert Rule: currentStock &le; reorderLevel
              </h4>
              <p className="text-xs text-amber-200/80 mt-1">
                The items below have reached critical stock thresholds. Immediate purchase orders or inventory adjustments are recommended to prevent stockouts.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
            {isLoadingAlerts ? (
              <LoadingState message="Scanning catalog for low-stock products..." />
            ) : lowStockAlerts.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-12 h-12 text-emerald-400" />}
                title="All stock levels are healthy!"
                description="Zero items are currently at or below their reorder threshold."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/60 bg-slate-900/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Severity</th>
                      <th className="py-3.5 px-4">Product Name</th>
                      <th className="py-3.5 px-4">SKU</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4 text-right">Current Stock</th>
                      <th className="py-3.5 px-4 text-right">Reorder Level</th>
                      <th className="py-3.5 px-4 text-right">Replenishment Deficit</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {lowStockAlerts.map((item) => {
                      const isCritical = item.severity === 'CRITICAL';

                      return (
                        <tr key={item.id} className="hover:bg-slate-700/20 transition-colors">
                          {/* Severity */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide ${
                                isCritical
                                  ? 'bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse'
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {item.severity === 'CRITICAL' ? 'OUT OF STOCK' : 'LOW STOCK'}
                            </span>
                          </td>

                          {/* Product */}
                          <td className="py-3.5 px-4 font-semibold text-slate-100">
                            {item.name}
                          </td>

                          {/* SKU */}
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                            {item.sku}
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-300">
                              {item.category?.name}
                            </span>
                          </td>

                          {/* Current Stock */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold">
                            <span className={isCritical ? 'text-red-400' : 'text-amber-400'}>
                              {item.currentStock} {item.unit}
                            </span>
                          </td>

                          {/* Reorder Level */}
                          <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                            {item.reorderLevel} {item.unit}
                          </td>

                          {/* Deficit */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-red-400">
                            +{item.deficit} {item.unit} needed
                          </td>

                          {/* Quick Adjust */}
                          <td className="py-3.5 px-4 text-right">
                            {canAdjust && (
                              <button
                                onClick={() => openAdjustmentModal(item)}
                                className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-xs font-semibold shadow-md transition-all inline-flex items-center gap-1.5"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>Replenish / Adjust</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* INVENTORY ADJUSTMENT MODAL */}
      {/* ============================================================== */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => !isSubmitting && setIsAdjustModalOpen(false)}
        title="Inventory Stock Adjustment"
        maxWidth="lg"
      >
        <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
          <p className="text-xs text-slate-400 -mt-2">
            Record physical audits, damage write-offs, or stock returns. Every adjustment creates an immutable audit trail and validates that stock remains non-negative.
          </p>

          {/* Product Select */}
          <FormField label="Product" required>
            <Select
              value={adjustProductId}
              onChange={(e) => setAdjustProductId(e.target.value)}
              disabled={isSubmitting}
            >
              {inventoryItems.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) &bull; Current Stock: {p.currentStock} {p.unit}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Transaction Type & Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Transaction Type" required>
              <Select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as TransactionType)}
                disabled={isSubmitting}
              >
                <option value="ADJUSTMENT">ADJUSTMENT (Audit Recount)</option>
                <option value="DAMAGE">DAMAGE (Write-off / Broken)</option>
                <option value="RETURN">RETURN (Customer / Supplier)</option>
                <option value="PURCHASE">PURCHASE (Direct Inflow)</option>
                <option value="SALE">SALE (Direct Deduction)</option>
              </Select>
            </FormField>

            <FormField label="Adjustment Mode" required>
              <div className="grid grid-cols-3 gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setAdjustMode('ADD')}
                  className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                    adjustMode === 'ADD'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('DEDUCT')}
                  className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                    adjustMode === 'DEDUCT'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Deduct</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('SET')}
                  className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                    adjustMode === 'SET'
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Set Total</span>
                </button>
              </div>
            </FormField>
          </div>

          {/* Quantity or Target Count */}
          {adjustMode === 'SET' ? (
            <FormField
              label="Target Physical Stock Count"
              required
              helperText={`Current stock is ${selectedProduct?.currentStock ?? 0} ${selectedProduct?.unit ?? 'pcs'}. Enter the exact physical count counted.`}
            >
              <Input
                type="number"
                min="0"
                value={adjustTargetStock}
                onChange={(e) => setAdjustTargetStock(e.target.value)}
                placeholder="Target count e.g. 50"
                disabled={isSubmitting}
                required
              />
            </FormField>
          ) : (
            <FormField
              label={adjustMode === 'ADD' ? 'Quantity to Add (+)' : 'Quantity to Deduct (-)'}
              required
              helperText="Must be a positive integer."
            >
              <Input
                type="number"
                min="1"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                placeholder="Quantity e.g. 10"
                disabled={isSubmitting}
                required
              />
            </FormField>
          )}

          {/* Real-Time Stock Impact Visualizer */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              stockCalculation.isNegative
                ? 'bg-red-500/10 border-red-500/40 text-red-300'
                : 'bg-slate-900/60 border-slate-700/60'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-400">Current: </span>
                <span className="font-bold text-white">{stockCalculation.before}</span>
              </div>
              <div className="text-slate-500">&rarr;</div>
              <div>
                <span className="text-slate-400">Delta: </span>
                <span
                  className={
                    stockCalculation.delta >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'
                  }
                >
                  {stockCalculation.delta >= 0
                    ? `+${stockCalculation.delta}`
                    : stockCalculation.delta}
                </span>
              </div>
              <div className="text-slate-500">&rarr;</div>
              <div>
                <span className="text-slate-400">Resulting Stock: </span>
                <span
                  className={`font-black text-sm ${
                    stockCalculation.isNegative ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {stockCalculation.after} {selectedProduct?.unit || 'pcs'}
                </span>
              </div>
            </div>

            {stockCalculation.isNegative && (
              <div className="mt-2 text-xs text-red-400 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Negative stock constraint violated! Available stock is insufficient for this reduction.</span>
              </div>
            )}
          </div>

          {/* Reason / Notes */}
          <FormField
            label="Audit Reason / Note"
            required
            helperText="Provide a clear justification for compliance and audit logs (minimum 3 characters)."
          >
            <Textarea
              rows={2}
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Broken packaging discovered in storage, shelf audit count discrepancy..."
              disabled={isSubmitting}
              required
            />
          </FormField>

          {/* Reference Identifier */}
          <FormField label="Reference Identifier (Optional)" helperText="Document reference code, PO number, or ticket ID.">
            <Input
              type="text"
              value={adjustReference}
              onChange={(e) => setAdjustReference(e.target.value)}
              placeholder="e.g. AUDIT-2026-Q3, DAM-009"
              disabled={isSubmitting}
            />
          </FormField>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700/60">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || stockCalculation.isNegative}
              className="px-5 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording Adjustment...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Adjustment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
