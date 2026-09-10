'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { FormField, Input, Select, Textarea } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  Plus,
  Search,
  Package,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Power,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  DollarSign,
  TrendingUp,
  Copy,
  Check,
  Info,
} from 'lucide-react';

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductItem {
  id: string;
  categoryId: string;
  name: string;
  sku: string;
  description: string | null;
  purchasePrice: string | number;
  sellingPrice: string | number;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function ProductsPage() {
  const { hasRole } = useAuth();
  const { success, error: showError, info } = useToast();
  const canManage = hasRole('ADMIN', 'MANAGER');

  // Data State
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Copy SKU state
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Add/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    description: '',
    purchasePrice: '',
    sellingPrice: '',
    reorderLevel: '10',
    unit: 'pcs',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete & Safety State
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isUnsafeAlertOpen, setIsUnsafeAlertOpen] = useState<boolean>(false);
  const [unsafeErrorMessage, setUnsafeErrorMessage] = useState<string>('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load Active Categories for Dropdowns
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories?limit=100&status=active');
      if (res.data?.success && res.data?.data?.items) {
        setCategories(
          res.data.data.items.map((c: any) => ({
            id: c.id,
            name: c.name,
          }))
        );
      }
    } catch {
      // Fallback if categories fail to load
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Load Products from API
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
      });

      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (selectedCategory !== 'all') params.append('categoryId', selectedCategory);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (stockStatusFilter !== 'all') params.append('stockStatus', stockStatusFilter);

      const res = await api.get(`/products?${params.toString()}`);
      if (res.data?.success && res.data?.data) {
        setProducts(res.data.data.items || []);
        setPagination(res.data.data.pagination);
      }
    } catch (err: any) {
      showError(
        'Failed to load products',
        err.response?.data?.message || 'Check your network connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    debouncedSearch,
    selectedCategory,
    statusFilter,
    stockStatusFilter,
    sortBy,
    sortOrder,
    showError,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Metrics overview calculations
  const metrics = useMemo(() => {
    const total = pagination.totalItems;
    const inStock = products.filter((p) => p.stockStatus === 'IN_STOCK').length;
    const lowStock = products.filter((p) => p.stockStatus === 'LOW_STOCK').length;
    const outOfStock = products.filter((p) => p.stockStatus === 'OUT_OF_STOCK').length;
    return { total, inStock, lowStock, outOfStock };
  }, [pagination.totalItems, products]);

  // Auto-generate SKU helper
  const handleAutoGenerateSku = () => {
    const cat = categories.find((c) => c.id === formData.categoryId);
    const prefix = cat ? cat.name.substring(0, 3).toUpperCase() : 'PRD';
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const generated = `SKU-${prefix}-${randomHex}`;
    setFormData((prev) => ({ ...prev, sku: generated }));
    if (formErrors.sku) {
      setFormErrors((prev) => ({ ...prev, sku: '' }));
    }
  };

  // Copy SKU to clipboard
  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 1500);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      categoryId: categories.length > 0 ? categories[0].id : '',
      description: '',
      purchasePrice: '',
      sellingPrice: '',
      reorderLevel: '10',
      unit: 'pcs',
      status: 'ACTIVE',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (product: ProductItem) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId,
      description: product.description || '',
      purchasePrice: Number(product.purchasePrice).toFixed(2),
      sellingPrice: Number(product.sellingPrice).toFixed(2),
      reorderLevel: product.reorderLevel.toString(),
      unit: product.unit || 'pcs',
      status: product.status,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Validate form client-side
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Product name must be at least 2 characters.';
    }
    if (!formData.sku.trim() || formData.sku.trim().length < 2) {
      errors.sku = 'SKU is required (minimum 2 characters).';
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.sku.trim())) {
      errors.sku = 'SKU may only contain letters, numbers, hyphens, and underscores.';
    }
    if (!formData.categoryId) {
      errors.categoryId = 'Please select a category.';
    }

    const buyPrice = parseFloat(formData.purchasePrice);
    if (isNaN(buyPrice) || buyPrice < 0) {
      errors.purchasePrice = 'Purchase price must be a non-negative number.';
    }

    const sellPrice = parseFloat(formData.sellingPrice);
    if (isNaN(sellPrice) || sellPrice < 0) {
      errors.sellingPrice = 'Selling price must be a non-negative number.';
    }

    const reorder = parseInt(formData.reorderLevel, 10);
    if (isNaN(reorder) || reorder < 0) {
      errors.reorderLevel = 'Reorder level must be a non-negative integer.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Create or Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim().toUpperCase(),
        categoryId: formData.categoryId,
        description: formData.description.trim() || null,
        purchasePrice: parseFloat(formData.purchasePrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        reorderLevel: parseInt(formData.reorderLevel, 10),
        unit: formData.unit.trim() || 'pcs',
        status: formData.status,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        success('Product Updated', `"${payload.name}" was updated successfully.`);
      } else {
        await api.post('/products', payload);
        success('Product Created', `"${payload.name}" was added to catalog.`);
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Unable to save product. Please check inputs.';
      showError('Action Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Toggle
  const handleToggleStatus = async (product: ProductItem) => {
    const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/products/${product.id}`, { status: newStatus });
      success(
        'Status Updated',
        `Product "${product.name}" marked as ${newStatus.toLowerCase()}.`
      );
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
      );
    } catch (err: any) {
      showError('Failed to change status', err.response?.data?.message || 'Server error.');
    }
  };

  // Trigger Delete Confirmation
  const handleDeleteClick = (product: ProductItem) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/products/${productToDelete.id}`);
      success('Product Deleted', `"${productToDelete.name}" was removed from the catalog.`);
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err: any) {
      setIsDeleteDialogOpen(false);
      const errMsg = err.response?.data?.message || 'Unable to delete product.';
      if (err.response?.status === 400 && errMsg.includes('associated transaction records')) {
        setUnsafeErrorMessage(errMsg);
        setIsUnsafeAlertOpen(true);
      } else {
        showError('Delete Failed', errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Archive / Mark as Discontinued if Delete Blocked
  const handleArchiveInstead = async () => {
    if (!productToDelete) return;
    try {
      await api.put(`/products/${productToDelete.id}`, { status: 'DISCONTINUED' });
      success('Product Discontinued', `"${productToDelete.name}" status updated to DISCONTINUED.`);
      setIsUnsafeAlertOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err: any) {
      showError('Archive Failed', err.response?.data?.message || 'Server error.');
    }
  };

  // Margin calculation helper
  const calculateMargin = (buy: string | number, sell: string | number) => {
    const b = Number(buy);
    const s = Number(sell);
    if (!s || s <= 0) return null;
    const profit = s - b;
    const margin = (profit / s) * 100;
    return { profit, margin };
  };

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
      {/* Page Header */}
      <PageHeader
        title="Product Catalog & Inventory"
        description="Monitor product definitions, SKU tracking, reorder alert thresholds, and pricing structures."
        breadcrumbs={[{ label: 'Catalog' }, { label: 'Products' }]}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={fetchProducts}
              disabled={isLoading}
              className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-2 text-xs font-semibold"
              title="Refresh product list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
              Refresh
            </button>
            {canManage && (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 group"
              >
                <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                Add New Product
              </button>
            )}
          </div>
        }
      />

      {/* Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Products */}
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 shadow-lg flex items-center gap-4">
          <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Products</p>
            <h4 className="text-2xl font-black text-slate-100">{pagination.totalItems}</h4>
          </div>
        </div>

        {/* In Stock */}
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 shadow-lg flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">In Stock</p>
            <h4 className="text-2xl font-black text-emerald-400">{metrics.inStock}</h4>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-amber-500/20 shadow-lg shadow-amber-500/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-amber-400/90 uppercase tracking-wider">Low Stock Alerts</p>
            <h4 className="text-2xl font-black text-amber-400">{metrics.lowStock}</h4>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-red-500/20 shadow-lg shadow-red-500/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-red-400/90 uppercase tracking-wider">Out of Stock</p>
            <h4 className="text-2xl font-black text-red-400">{metrics.outOfStock}</h4>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-md mb-6 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product name, SKU, or description..."
            className="w-full bg-slate-950/80 text-slate-200 placeholder-slate-500 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="bg-slate-950/80 text-slate-300 text-xs px-3 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:outline-none transition-all"
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
            onChange={(e) => {
              setStockStatusFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="bg-slate-950/80 text-slate-300 text-xs px-3 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:outline-none transition-all font-medium"
          >
            <option value="all">All Stock Statuses</option>
            <option value="IN_STOCK">🟢 In Stock</option>
            <option value="LOW_STOCK">🟡 Low Stock (≤ Reorder)</option>
            <option value="OUT_OF_STOCK">🔴 Out of Stock</option>
          </select>

          {/* Lifecycle Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="bg-slate-950/80 text-slate-300 text-xs px-3 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:outline-none transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DISCONTINUED">Discontinued</option>
          </select>

          {/* Sort By Field */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="bg-slate-950/80 text-slate-300 text-xs px-3 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:outline-none transition-all"
          >
            <option value="createdAt">Date Created</option>
            <option value="name">Product Name</option>
            <option value="sku">SKU Code</option>
            <option value="sellingPrice">Sell Price</option>
            <option value="currentStock">Current Stock</option>
            <option value="reorderLevel">Reorder Level</option>
          </select>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="p-2.5 bg-slate-950/80 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center text-xs font-semibold"
            title={`Sort Order: ${sortOrder.toUpperCase()}`}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="ml-1 uppercase text-[10px]">{sortOrder}</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex items-center justify-center">
            <LoadingState message="Loading products catalog..." />
          </div>
        ) : products.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No products found"
              description="No catalog items matched your current filter criteria or search query."
              action={
                canManage ? (
                  <button
                    onClick={handleOpenCreate}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Product
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  <th className="py-3.5 px-4">SKU / Code</th>
                  <th className="py-3.5 px-4">Product Name & Category</th>
                  <th className="py-3.5 px-4">Cost / Selling Price</th>
                  <th className="py-3.5 px-4">Current Stock</th>
                  <th className="py-3.5 px-4">Stock Condition</th>
                  <th className="py-3.5 px-4">Reorder Alert</th>
                  <th className="py-3.5 px-4">Status</th>
                  {canManage && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs">
                {products.map((p) => {
                  const marginInfo = calculateMargin(p.purchasePrice, p.sellingPrice);
                  const isLow = p.stockStatus === 'LOW_STOCK';
                  const isOut = p.stockStatus === 'OUT_OF_STOCK';

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* SKU with Copy Pill */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleCopySku(p.sku)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] font-semibold text-brand-300 hover:border-brand-500/50 transition-all group/sku"
                          title="Click to copy SKU"
                        >
                          <span>{p.sku}</span>
                          {copiedSku === p.sku ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500 opacity-0 group-hover/sku:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </td>

                      {/* Product Name & Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-100 text-sm">{p.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-medium text-brand-400/90">
                              {p.category?.name || 'Uncategorized'}
                            </span>
                            {p.description && (
                              <span className="text-[11px] text-slate-500 truncate max-w-[200px]" title={p.description}>
                                • {p.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Pricing with Margin Preview */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">
                              ${Number(p.sellingPrice).toFixed(2)}
                            </span>
                            {marginInfo && (
                              <span
                                className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                                  marginInfo.profit >= 0
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-rose-500/10 text-rose-400'
                                }`}
                                title={`Profit: $${marginInfo.profit.toFixed(2)} per unit`}
                              >
                                {marginInfo.profit >= 0 ? '+' : ''}
                                {marginInfo.margin.toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Cost: ${Number(p.purchasePrice).toFixed(2)}
                          </span>
                        </div>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono text-sm font-bold ${
                              isOut
                                ? 'text-red-400'
                                : isLow
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {p.currentStock}
                          </span>
                          <span className="text-slate-400 font-medium text-xs">{p.unit}</span>
                        </div>
                      </td>

                      {/* Stock Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {p.stockStatus === 'IN_STOCK' ? (
                          <StatusBadge status="IN STOCK" size="sm" />
                        ) : p.stockStatus === 'LOW_STOCK' ? (
                          <div className="inline-flex flex-col items-start">
                            <StatusBadge status="LOW STOCK" size="sm" />
                            <span className="text-[10px] text-amber-400/80 font-mono mt-0.5">
                              ≤ {p.reorderLevel} {p.unit} threshold
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-start">
                            <StatusBadge status="OUT OF STOCK" size="sm" />
                            <span className="text-[10px] text-red-400/80 font-mono mt-0.5">
                              0 {p.unit} available
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Reorder Level Threshold */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-slate-300 font-medium">
                          {p.reorderLevel} {p.unit}
                        </span>
                      </td>

                      {/* Lifecycle Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={p.status} size="sm" />
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-slate-800 rounded-lg transition-all"
                              title="Edit product catalog information"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Quick Status Toggle */}
                            <button
                              onClick={() => handleToggleStatus(p)}
                              className={`p-1.5 rounded-lg transition-all ${
                                p.status === 'ACTIVE'
                                  ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                                  : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                              }`}
                              title={p.status === 'ACTIVE' ? 'Deactivate product' : 'Activate product'}
                            >
                              <Power className="w-4 h-4" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteClick(p)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                              title="Delete product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer */}
        {products.length > 0 && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing{' '}
              <span className="font-semibold text-slate-200">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-slate-200">
                {Math.min(pagination.page * pagination.limit, pagination.totalItems)}
              </span>{' '}
              of <span className="font-semibold text-slate-200">{pagination.totalItems}</span> products
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={!pagination.hasPrevPage}
                className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <span className="px-3 py-1 font-mono font-medium text-slate-300">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={!pagination.hasNextPage}
                className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
        description={
          editingProduct
            ? 'Update product catalog specifications, pricing, and reorder levels.'
            : 'Register a new product in the SmartStock catalog.'
        }
        maxWidth="2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : editingProduct ? (
                'Save Changes'
              ) : (
                'Create Product'
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stock Inviolability Notice */}
          <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-brand-300">Inventory Stock Protection Notice</p>
              <p className="text-slate-300 text-[11px] mt-0.5">
                Current stock is controlled strictly by inventory transactions and purchases. Initial stock starts at 0 and cannot be altered through normal product editing.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product Name */}
            <FormField label="Product Name" required error={formErrors.name}>
              <Input
                value={formData.name}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, name: e.target.value }));
                  if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="e.g. Mechanical Gaming Keyboard"
                error={!!formErrors.name}
              />
            </FormField>

            {/* SKU with Auto-generate Button */}
            <FormField label="SKU Code" required error={formErrors.sku}>
              <div className="flex gap-2">
                <Input
                  value={formData.sku}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, sku: e.target.value.toUpperCase() }));
                    if (formErrors.sku) setFormErrors((prev) => ({ ...prev, sku: '' }));
                  }}
                  placeholder="e.g. SKU-ELE-001"
                  className="font-mono uppercase"
                  error={!!formErrors.sku}
                />
                <button
                  type="button"
                  onClick={handleAutoGenerateSku}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-brand-400 border border-slate-700 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5"
                  title="Generate random unique SKU"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto
                </button>
              </div>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Dropdown */}
            <FormField label="Category" required error={formErrors.categoryId}>
              <Select
                value={formData.categoryId}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, categoryId: e.target.value }));
                  if (formErrors.categoryId) setFormErrors((prev) => ({ ...prev, categoryId: '' }));
                }}
                error={!!formErrors.categoryId}
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>

            {/* Unit of Measure */}
            <FormField label="Unit of Measure" required error={formErrors.unit}>
              <Select
                value={formData.unit}
                onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                error={!!formErrors.unit}
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="box">Box (box)</option>
                <option value="pack">Pack (pack)</option>
                <option value="ream">Ream (ream)</option>
                <option value="set">Set (set)</option>
                <option value="pair">Pair (pair)</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="bottle">Bottle (bottle)</option>
                <option value="jar">Jar (jar)</option>
              </Select>
            </FormField>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            {/* Purchase Price */}
            <FormField label="Purchase Price ($)" required error={formErrors.purchasePrice}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchasePrice}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, purchasePrice: e.target.value }));
                    if (formErrors.purchasePrice) setFormErrors((prev) => ({ ...prev, purchasePrice: '' }));
                  }}
                  placeholder="0.00"
                  className="pl-7 font-mono"
                  error={!!formErrors.purchasePrice}
                />
              </div>
            </FormField>

            {/* Selling Price */}
            <FormField label="Selling Price ($)" required error={formErrors.sellingPrice}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.sellingPrice}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, sellingPrice: e.target.value }));
                    if (formErrors.sellingPrice) setFormErrors((prev) => ({ ...prev, sellingPrice: '' }));
                  }}
                  placeholder="0.00"
                  className="pl-7 font-mono"
                  error={!!formErrors.sellingPrice}
                />
              </div>
            </FormField>

            {/* Profit Margin Preview */}
            <div className="flex flex-col justify-center pt-2 sm:pt-0">
              <span className="text-xs font-semibold text-slate-400 mb-1">Estimated Margin</span>
              {(() => {
                const margin = calculateMargin(formData.purchasePrice, formData.sellingPrice);
                if (!margin) return <span className="text-xs text-slate-500">Enter prices to view margin</span>;
                return (
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold font-mono ${
                        margin.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      ${margin.profit.toFixed(2)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                        margin.profit >= 0
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {margin.margin.toFixed(1)}%
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Reorder Level Threshold */}
            <FormField
              label="Reorder Level Threshold"
              required
              helperText="Alerts when stock drops to or below this quantity."
              error={formErrors.reorderLevel}
            >
              <Input
                type="number"
                min="0"
                step="1"
                value={formData.reorderLevel}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, reorderLevel: e.target.value }));
                  if (formErrors.reorderLevel) setFormErrors((prev) => ({ ...prev, reorderLevel: '' }));
                }}
                placeholder="10"
                className="font-mono"
                error={!!formErrors.reorderLevel}
              />
            </FormField>

            {/* Status Selector */}
            <FormField label="Product Status" required error={formErrors.status}>
              <Select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
              >
                <option value="ACTIVE">ACTIVE (Available for sales)</option>
                <option value="INACTIVE">INACTIVE (Hidden from POS)</option>
                <option value="DISCONTINUED">DISCONTINUED (End of life)</option>
              </Select>
            </FormField>
          </div>

          {/* Description */}
          <FormField label="Description (Optional)" error={formErrors.description}>
            <Textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Product specs, features, storage recommendations..."
            />
          </FormField>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}" (${productToDelete?.sku})? This action will permanently remove it if it has no sales or inventory history.`}
        confirmText="Delete Product"
        isLoading={isSubmitting}
        type="danger"
      />

      {/* Unsafe Deletion Warning Modal (Transaction History Guard) */}
      <Modal
        isOpen={isUnsafeAlertOpen}
        onClose={() => setIsUnsafeAlertOpen(false)}
        title="Cannot Delete Active Product"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              onClick={() => setIsUnsafeAlertOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleArchiveInstead}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <Power className="w-3.5 h-3.5" />
              Mark as Discontinued Instead
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center p-2">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-slate-100 mb-2">Audit History Protected</h4>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            {unsafeErrorMessage}
          </p>
          <p className="text-[11px] text-slate-400">
            For financial compliance and inventory reconciliation, products with historical sales or stock receipts cannot be destroyed. We recommend switching its status to <strong className="text-amber-300">DISCONTINUED</strong>.
          </p>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
