'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { FormField, Input, Textarea } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  Plus,
  Search,
  FolderTree,
  Edit2,
  Trash2,
  Power,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    products: number;
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

export default function CategoriesPage() {
  const { hasRole } = useAuth();
  const { success, error: showError, info } = useToast();
  const canManage = hasRole('ADMIN', 'MANAGER');

  // Data & State
  const [categories, setCategories] = useState<CategoryItem[]>([]);
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

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'productCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isManualSlug, setIsManualSlug] = useState<boolean>(false);

  // Delete & Safety State
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isUnsafeAlertOpen, setIsUnsafeAlertOpen] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Helper to slugify
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Fetch Categories from Backend API
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: statusFilter,
        sortBy,
        sortOrder,
      });

      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }

      const res = await api.get(`/categories?${params.toString()}`);
      if (res.data?.success && res.data?.data) {
        setCategories(res.data.data.items || []);
        setPagination(res.data.data.pagination);
      }
    } catch (err: any) {
      showError(
        'Failed to load categories',
        err.response?.data?.message || 'Check server connection.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, statusFilter, sortBy, sortOrder, showError]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Handle Create / Edit Open
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      isActive: true,
    });
    setFormErrors({});
    setIsManualSlug(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: CategoryItem) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      isActive: category.isActive,
    });
    setFormErrors({});
    setIsManualSlug(true);
    setIsModalOpen(true);
  };

  // Form Field Changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: isManualSlug ? prev.slug : generateSlug(val),
    }));
    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsManualSlug(true);
    setFormData((prev) => ({ ...prev, slug: e.target.value }));
    if (formErrors.slug) setFormErrors((prev) => ({ ...prev, slug: '' }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'Category name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      errors.name = 'Name cannot exceed 50 characters';
    }

    if (formData.slug.trim()) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(formData.slug.trim())) {
        errors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
      }
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description cannot exceed 500 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Category (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || generateSlug(formData.name.trim()),
        description: formData.description.trim() || null,
        isActive: formData.isActive,
      };

      if (editingCategory) {
        const res = await api.put(`/categories/${editingCategory.id}`, payload);
        if (res.data?.success) {
          success('Category updated', `Successfully updated "${payload.name}"`);
          setIsModalOpen(false);
          fetchCategories();
        }
      } else {
        const res = await api.post('/categories', payload);
        if (res.data?.success) {
          success('Category created', `Successfully added "${payload.name}"`);
          setIsModalOpen(false);
          fetchCategories();
        }
      }
    } catch (err: any) {
      const serverMessage = err.response?.data?.message || 'Operation failed.';
      showError(editingCategory ? 'Update failed' : 'Creation failed', serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Category Active Status
  const handleToggleStatus = async (category: CategoryItem) => {
    if (!canManage) return;
    try {
      const newStatus = !category.isActive;
      const res = await api.put(`/categories/${category.id}`, { isActive: newStatus });
      if (res.data?.success) {
        success(
          newStatus ? 'Category activated' : 'Category deactivated',
          `"${category.name}" is now ${newStatus ? 'active' : 'inactive'}.`
        );
        fetchCategories();
      }
    } catch (err: any) {
      showError('Status change failed', err.response?.data?.message || 'Could not update status');
    }
  };

  // Safe Deletion Handler
  const handleDeleteClick = (category: CategoryItem) => {
    if (!canManage) return;
    setCategoryToDelete(category);

    // CRITICAL: Protect against unsafe deletion if products exist
    if (category._count && category._count.products > 0) {
      setIsUnsafeAlertOpen(true);
    } else {
      setIsDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await api.delete(`/categories/${categoryToDelete.id}`);
      if (res.data?.success) {
        success('Category deleted', `"${categoryToDelete.name}" was successfully removed.`);
        setIsDeleteDialogOpen(false);
        setCategoryToDelete(null);
        fetchCategories();
      }
    } catch (err: any) {
      showError('Deletion blocked', err.response?.data?.message || 'Could not delete category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick action from unsafe modal: Deactivate instead
  const handleDeactivateInstead = async () => {
    if (!categoryToDelete) return;
    setIsUnsafeAlertOpen(false);
    await handleToggleStatus(categoryToDelete);
    setCategoryToDelete(null);
  };

  // Sorting Handler
  const handleSort = (field: 'name' | 'createdAt' | 'productCount') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Metric Aggregates
  const metrics = useMemo(() => {
    const total = pagination.totalItems;
    const active = categories.filter((c) => c.isActive).length;
    const inactive = categories.filter((c) => !c.isActive).length;
    const totalProducts = categories.reduce((sum, c) => sum + (c._count?.products || 0), 0);
    return { total, active, inactive, totalProducts };
  }, [categories, pagination.totalItems]);

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
      {/* Page Header */}
      <PageHeader
        title="Category Management"
        description="Organize, filter, and track product taxonomy across retail & warehouse inventories."
        breadcrumbs={[{ label: 'Categories' }]}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchCategories()}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 rounded-xl transition-all"
              title="Refresh categories"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
            </button>
            {canManage && (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            )}
          </div>
        }
      />

      {/* KPI / Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center gap-3.5 backdrop-blur-sm">
          <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-400">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Categories</p>
            <p className="text-xl font-bold text-slate-100 mt-0.5">{metrics.total}</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center gap-3.5 backdrop-blur-sm">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Active Categories</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">
              {statusFilter === 'active' ? pagination.totalItems : metrics.active}
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center gap-3.5 backdrop-blur-sm">
          <div className="p-3 bg-slate-500/10 border border-slate-500/20 rounded-xl text-slate-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Inactive Categories</p>
            <p className="text-xl font-bold text-slate-400 mt-0.5">
              {statusFilter === 'inactive' ? pagination.totalItems : metrics.inactive}
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center gap-3.5 backdrop-blur-sm">
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Current Cataloged Items</p>
            <p className="text-xl font-bold text-sky-400 mt-0.5">{metrics.totalProducts} Products</p>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Status Filters */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Field */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, slug, description..."
            className="w-full bg-slate-950/90 text-slate-100 placeholder-slate-500 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-brand-500 focus:outline-none transition-all"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl w-full md:w-auto self-stretch justify-center md:justify-start">
          <button
            onClick={() => {
              setStatusFilter('all');
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Statuses
          </button>
          <button
            onClick={() => {
              setStatusFilter('active');
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => {
              setStatusFilter('inactive');
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'inactive'
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-6">
            <LoadingState type="table" rows={6} />
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16">
            <EmptyState
              title={debouncedSearch ? 'No matching categories found' : 'No categories available'}
              description={
                debouncedSearch
                  ? `No category matches "${debouncedSearch}". Try resetting your search or filter.`
                  : 'Get started by creating your first product category.'
              }
              action={
                canManage ? (
                  <button
                    onClick={debouncedSearch ? () => setSearchTerm('') : handleOpenCreate}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all"
                  >
                    {debouncedSearch ? 'Clear Search' : 'Add Category'}
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  <th
                    className="p-4 pl-6 cursor-pointer hover:text-slate-200 transition-colors select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Category Details</span>
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                    </div>
                  </th>
                  <th className="p-4">Slug</th>
                  <th
                    className="p-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                    onClick={() => handleSort('productCount')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Products</span>
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                    </div>
                  </th>
                  <th className="p-4">Status</th>
                  <th
                    className="p-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Created</span>
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                    </div>
                  </th>
                  {canManage && <th className="p-4 pr-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Name & Description */}
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0 border border-slate-700/60">
                          {cat.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-100 truncate max-w-xs">{cat.name}</p>
                          {cat.description ? (
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">{cat.description}</p>
                          ) : (
                            <p className="text-[11px] text-slate-600 italic">No description provided</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="p-4 font-mono text-[11px] text-slate-400">
                      <span className="px-2 py-0.5 bg-slate-950/70 border border-slate-800 rounded-md">
                        {cat.slug}
                      </span>
                    </td>

                    {/* Product Count */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-brand-400" />
                        <span className="font-semibold text-slate-200">
                          {cat._count?.products || 0}
                        </span>
                        <span className="text-[11px] text-slate-500">items</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      <StatusBadge status={cat.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>

                    {/* Created Date */}
                    <td className="p-4 text-slate-400">
                      {new Date(cat.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    {canManage && (
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          {/* Toggle Active Switch */}
                          <button
                            onClick={() => handleToggleStatus(cat)}
                            title={cat.isActive ? 'Deactivate category' : 'Activate category'}
                            className={`p-2 rounded-lg border transition-all ${
                              cat.isActive
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            title="Edit category"
                            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteClick(cat)}
                            title={
                              cat._count?.products > 0
                                ? 'Cannot delete: linked products exist'
                                : 'Delete category'
                            }
                            className={`p-2 rounded-lg border transition-all ${
                              cat._count?.products > 0
                                ? 'bg-slate-800/40 text-slate-500 border-slate-800 hover:text-amber-400'
                                : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalItems > 0 && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing{' '}
              <span className="font-semibold text-slate-200">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-slate-200">
                {Math.min(pagination.page * pagination.limit, pagination.totalItems)}
              </span>{' '}
              of <span className="font-semibold text-slate-200">{pagination.totalItems}</span>{' '}
              categories
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                }
                disabled={!pagination.hasPrevPage || isLoading}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <span className="px-3 py-1 font-semibold text-slate-200 bg-slate-900/60 rounded-lg border border-slate-800">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={!pagination.hasNextPage || isLoading}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 font-medium"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create or Edit Category */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
        description={
          editingCategory
            ? 'Modify category taxonomy and catalog settings.'
            : 'Add a new product category to organize inventory items.'
        }
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Category Name" error={formErrors.name} required>
            <Input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g. Office Supplies & Electronics"
              error={!!formErrors.name}
              autoFocus
            />
          </FormField>

          <FormField
            label="URL Slug"
            error={formErrors.slug}
            helperText="Used for system identification. Auto-generated from name if left default."
          >
            <Input
              type="text"
              value={formData.slug}
              onChange={handleSlugChange}
              placeholder="e.g. office-supplies-electronics"
              error={!!formErrors.slug}
            />
          </FormField>

          <FormField
            label="Description"
            error={formErrors.description}
            helperText="Optional context regarding what products fall under this category."
          >
            <Textarea
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Describe this category's scope..."
              error={!!formErrors.description}
            />
          </FormField>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div>
              <p className="text-xs font-semibold text-slate-200">Active Category</p>
              <p className="text-[11px] text-slate-400">
                Inactive categories are hidden from cashier POS search and replenishment orders.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600" />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog: Safe Deletion (0 products) */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Category"
        cancelText="Keep Category"
        isLoading={isSubmitting}
        type="danger"
      />

      {/* Warning Dialog: Unsafe Deletion Protection (Products attached) */}
      <Modal
        isOpen={isUnsafeAlertOpen}
        onClose={() => {
          setIsUnsafeAlertOpen(false);
          setCategoryToDelete(null);
        }}
        title="Deletion Blocked"
        maxWidth="sm"
      >
        <div className="flex flex-col items-center text-center py-2">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-100 mb-1.5">
            Category In Use by Products
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            <span className="font-semibold text-amber-300 font-mono">
              &quot;{categoryToDelete?.name}&quot;
            </span>{' '}
            cannot be deleted because it is currently linked to{' '}
            <span className="font-bold text-brand-400">
              {categoryToDelete?._count?.products || 0} product(s)
            </span>{' '}
            in your inventory database.
          </p>
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 mb-6 text-left w-full">
            <p className="font-semibold text-slate-300 mb-1">Recommended Alternative:</p>
            <p>
              Instead of deleting, you can <strong>deactivate</strong> this category. It will safely
              preserve all product sales and order history while preventing new additions.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={handleDeactivateInstead}
              className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Power className="w-3.5 h-3.5" />
              Deactivate Category Instead
            </button>
            <button
              onClick={() => {
                setIsUnsafeAlertOpen(false);
                setCategoryToDelete(null);
              }}
              className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
