'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
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
import { SupplierItem, SupplierStats } from '@/types/supplier';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  Eye,
  Power,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  DollarSign,
  ShoppingCart,
  Building2,
  Mail,
  Phone,
  MapPin,
  X,
  FileText,
} from 'lucide-react';

interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function SuppliersPage() {
  const { hasRole } = useAuth();
  const { success, error: showError, info } = useToast();
  const canManage = hasRole('ADMIN', 'MANAGER');

  // Data State
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [stats, setStats] = useState<SupplierStats>({
    totalSuppliers: 0,
    activeSuppliers: 0,
    totalPurchases: 0,
    totalSpend: 0,
  });
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Deletion & Safety State
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierItem | null>(null);
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

  // Fetch Suppliers
  const fetchSuppliers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string | number> = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const res = await api.get('/suppliers', { params });
      if (res.data.success) {
        setSuppliers(res.data.data.items);
        setPagination(res.data.data.pagination);
        if (res.data.data.stats) {
          setStats(res.data.data.stats);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch suppliers:', err);
      showError(err.response?.data?.message || 'Failed to load suppliers directory');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, statusFilter, sortBy, sortOrder, showError]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Supplier company name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Supplier name must be at least 2 characters';
    }

    if (formData.code.trim()) {
      const codeRegex = /^[A-Za-z0-9_-]+$/;
      if (!codeRegex.test(formData.code.trim())) {
        errors.code = 'Code can only contain letters, numbers, hyphens, and underscores';
      }
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please enter a valid email address';
      }
    }

    if (formData.phone.trim() && formData.phone.trim().length < 5) {
      errors.phone = 'Phone number must be at least 5 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingSupplier(null);
    setFormData({
      code: '',
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      taxId: '',
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (supplier: SupplierItem) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code,
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      taxId: supplier.taxId || '',
      isActive: supplier.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Submit Create or Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const payload: Record<string, any> = {
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        taxId: formData.taxId.trim() || null,
        isActive: formData.isActive,
      };

      if (formData.code.trim()) {
        payload.code = formData.code.trim().toUpperCase();
      }

      if (editingSupplier) {
        // Update
        const res = await api.put(`/suppliers/${editingSupplier.id}`, payload);
        if (res.data.success) {
          success(`Supplier '${payload.name}' updated successfully!`);
          setIsModalOpen(false);
          fetchSuppliers();
        }
      } else {
        // Create
        const res = await api.post('/suppliers', payload);
        if (res.data.success) {
          success(`Supplier '${payload.name}' added successfully!`);
          setIsModalOpen(false);
          fetchSuppliers();
        }
      }
    } catch (err: any) {
      console.error('Save supplier failed:', err);
      const msg = err.response?.data?.message || 'An error occurred while saving supplier';
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (supplier: SupplierItem) => {
    const nextStatus = !supplier.isActive;
    try {
      const res = await api.put(`/suppliers/${supplier.id}`, { isActive: nextStatus });
      if (res.data.success) {
        success(`Supplier '${supplier.name}' marked as ${nextStatus ? 'ACTIVE' : 'INACTIVE'}.`);
        fetchSuppliers();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to update supplier status');
    }
  };

  // Open Delete Confirmation
  const handleDeleteClick = (supplier: SupplierItem) => {
    if (supplier.totalPurchases > 0) {
      setSupplierToDelete(supplier);
      setIsUnsafeAlertOpen(true);
    } else {
      setSupplierToDelete(supplier);
      setIsDeleteDialogOpen(true);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;

    try {
      setIsSubmitting(true);
      const res = await api.delete(`/suppliers/${supplierToDelete.id}`);
      if (res.data.success) {
        success(`Supplier '${supplierToDelete.name}' was removed successfully.`);
        setIsDeleteDialogOpen(false);
        setSupplierToDelete(null);
        fetchSuppliers();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to delete supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format Currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      {/* Top Header */}
      <PageHeader
        title="Supplier Management"
        description="Maintain vendor directory, contacts, procurement purchase history, and partnership records."
        breadcrumbs={[{ label: 'Suppliers' }]}
        actions={
          canManage && (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Supplier
            </button>
          )
        }
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Suppliers</p>
            <p className="text-2xl font-bold text-slate-100">{stats.totalSuppliers}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Vendors</p>
            <p className="text-2xl font-bold text-slate-100">{stats.activeSuppliers}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Purchase Orders</p>
            <p className="text-2xl font-bold text-slate-100">{stats.totalPurchases}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Procurement Spend</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.totalSpend)}</p>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Controls Bar: Search & Status Filters */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, code, contact, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Controls: Filter Tabs & Refresh */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setStatusFilter('ACTIVE');
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => {
                  setStatusFilter('INACTIVE');
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Inactive
              </button>
            </div>

            <button
              onClick={fetchSuppliers}
              title="Refresh Directory"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Suppliers Table */}
        {isLoading ? (
          <LoadingState message="Loading supplier directory..." />
        ) : suppliers.length === 0 ? (
          <EmptyState
            title="No suppliers found"
            description={
              searchTerm || statusFilter !== 'all'
                ? 'No suppliers match your current filter parameters.'
                : 'Your vendor directory is empty. Click "Add Supplier" above to register your first partner.'
            }
            action={
              searchTerm || statusFilter !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all"
                >
                  Clear Filters
                </button>
              ) : canManage ? (
                <button
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-brand-500/20"
                >
                  Register First Supplier
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Supplier & Code</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Address / Tax</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Purchases</th>
                  <th className="py-3.5 px-4 text-right">Total Spend</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-slate-850/50 transition-colors group"
                  >
                    {/* Supplier Name & Code */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <Link
                          href={`/suppliers/${supplier.id}`}
                          className="font-bold text-slate-100 hover:text-brand-400 transition-colors flex items-center gap-1.5"
                        >
                          <span>{supplier.name}</span>
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-brand-400 font-semibold border border-slate-700">
                            {supplier.code}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-200 font-medium">
                          {supplier.contactPerson || <span className="text-slate-500 italic">No contact person</span>}
                        </span>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          {supplier.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <a
                                href={`mailto:${supplier.email}`}
                                className="hover:text-brand-400 transition-colors"
                              >
                                {supplier.email}
                              </a>
                            </span>
                          )}
                          {supplier.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <a
                                href={`tel:${supplier.phone}`}
                                className="hover:text-brand-400 transition-colors"
                              >
                                {supplier.phone}
                              </a>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Address & Tax */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5 max-w-[200px]">
                        {supplier.address ? (
                          <span className="truncate text-slate-300 flex items-center gap-1 text-[11px]" title={supplier.address}>
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{supplier.address}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">—</span>
                        )}
                        {supplier.taxId && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Tax ID: {supplier.taxId}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge & Quick Toggle */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={supplier.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
                        {canManage && (
                          <button
                            onClick={() => handleToggleStatus(supplier)}
                            title={supplier.isActive ? 'Deactivate' : 'Activate'}
                            className={`p-1 rounded-lg border transition-colors ${
                              supplier.isActive
                                ? 'text-slate-400 hover:text-rose-400 border-slate-700 hover:border-rose-500/30'
                                : 'text-slate-400 hover:text-emerald-400 border-slate-700 hover:border-emerald-500/30'
                            }`}
                          >
                            <Power className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Purchases Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono font-bold text-xs border border-slate-700">
                        {supplier.totalPurchases}
                      </span>
                    </td>

                    {/* Total Spend */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-bold text-slate-100">
                        {formatCurrency(supplier.totalPurchaseAmount)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/suppliers/${supplier.id}`}
                          title="View Profile & Orders"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(supplier)}
                              title="Edit Supplier"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(supplier)}
                              title="Delete Supplier"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 bg-slate-950/20">
          <div>
            Showing <span className="text-slate-200 font-semibold">{suppliers.length}</span> of{' '}
            <span className="text-slate-200 font-semibold">{pagination.totalItems}</span> suppliers
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              disabled={!pagination.hasPrevPage}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 rounded-lg transition-colors flex items-center gap-1 font-semibold"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 font-mono">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              disabled={!pagination.hasNextPage}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 rounded-lg transition-colors flex items-center gap-1 font-semibold"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Supplier'}
        description="Enter vendor contact details and procurement identification information."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Supplier Code */}
            <FormField
              label="Supplier Code"
              error={formErrors.code}
              helperText="Optional: Leave blank to auto-generate (e.g. SUP-011)"
            >
              <Input
                placeholder="e.g. SUP-011"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </FormField>

            {/* Company Name */}
            <FormField label="Company Name *" error={formErrors.name}>
              <Input
                placeholder="e.g. Acme Components Ltd"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contact Person */}
            <FormField label="Contact Person" error={formErrors.contactPerson}>
              <Input
                placeholder="e.g. John Smith"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              />
            </FormField>

            {/* Tax / VAT ID */}
            <FormField label="Tax / VAT ID" error={formErrors.taxId}>
              <Input
                placeholder="e.g. TAX-998811"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email Address */}
            <FormField label="Email Address" error={formErrors.email}>
              <Input
                type="email"
                placeholder="e.g. sales@acme.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FormField>

            {/* Phone Number */}
            <FormField label="Phone Number" error={formErrors.phone}>
              <Input
                placeholder="e.g. +1-800-555-0199"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </FormField>
          </div>

          {/* Business Address */}
          <FormField label="Physical / Billing Address" error={formErrors.address}>
            <Textarea
              placeholder="e.g. 100 Industrial Parkway, Suite 400, Chicago, IL"
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </FormField>

          {/* Active Status Checkbox */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-brand-600 focus:ring-brand-500 focus:ring-offset-slate-900"
            />
            <label htmlFor="isActive" className="text-xs font-semibold text-slate-300 cursor-pointer">
              Active Vendor (allowed for purchase replenishment orders)
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {editingSupplier ? 'Save Changes' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Supplier Partner"
        message={`Are you sure you want to delete '${supplierToDelete?.name}' (${supplierToDelete?.code})? This action cannot be undone.`}
        confirmText="Delete Supplier"
        type="danger"
        isLoading={isSubmitting}
      />

      {/* Unsafe Deletion Protection Alert Modal */}
      <Modal
        isOpen={isUnsafeAlertOpen}
        onClose={() => setIsUnsafeAlertOpen(false)}
        title="Deletion Blocked by Audit Safety"
        description="SmartStock protects financial & procurement audit integrity."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Cannot delete active procurement supplier</p>
              <p className="text-slate-300">
                <span className="font-semibold text-white">{supplierToDelete?.name}</span> has{' '}
                <span className="font-bold text-amber-400">{supplierToDelete?.totalPurchases}</span> associated
                purchase order(s) totaling{' '}
                <span className="font-bold text-amber-400">
                  {formatCurrency(supplierToDelete?.totalPurchaseAmount || 0)}
                </span>
                .
              </p>
              <p className="text-slate-400 pt-1">
                Hard-deleting this record would corrupt transaction logs and inventory history.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300">
            <p className="font-semibold text-slate-200 mb-1">Recommended Action:</p>
            <p className="text-slate-400">
              Set this supplier status to <span className="font-bold text-slate-300">INACTIVE</span>. This disables future purchase orders while preserving historical reporting accuracy.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setIsUnsafeAlertOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            {supplierToDelete?.isActive && (
              <button
                onClick={async () => {
                  if (!supplierToDelete) return;
                  await handleToggleStatus(supplierToDelete);
                  setIsUnsafeAlertOpen(false);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                <Power className="w-3.5 h-3.5" />
                Deactivate Supplier Now
              </button>
            )}
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
