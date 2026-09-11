'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { CustomerItem, CustomerStats, CustomerSegment } from '@/types/customer';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ShoppingCart,
  Phone,
  Mail,
  X,
  CreditCard,
  UserCheck,
  TrendingUp,
} from 'lucide-react';

interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function CustomersPage() {
  const { hasRole } = useAuth();
  const { success, error: showError } = useToast();
  const canDelete = hasRole('ADMIN', 'MANAGER');

  // Data State
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    totalRevenue: 0,
    avgLifetimeValue: 0,
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
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    creditLimit: '0',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Deletion State
  const [customerToDelete, setCustomerToDelete] = useState<CustomerItem | null>(null);
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

  // Fetch Customers
  const fetchCustomers = useCallback(async () => {
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

      if (segmentFilter !== 'all') {
        params.segment = segmentFilter;
      }

      const res = await api.get('/customers', { params });
      if (res.data.success) {
        setCustomers(res.data.data.items);
        setPagination(res.data.data.pagination);
        if (res.data.data.stats) {
          setStats(res.data.data.stats);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch customers:', err);
      showError(err.response?.data?.message || 'Failed to load customer directory');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, segmentFilter, sortBy, sortOrder, showError]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Customer name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Customer name must be at least 2 characters';
    }

    if (formData.code.trim()) {
      const codeRegex = /^[A-Za-z0-9_-]+$/;
      if (!codeRegex.test(formData.code.trim())) {
        errors.code = 'Code can only contain alphanumeric characters, hyphens, and underscores';
      }
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please enter a valid email address';
      }
    }

    if (formData.phone.trim() && formData.phone.trim().length < 5) {
      errors.phone = 'Phone number must be at least 5 digits';
    }

    if (formData.creditLimit) {
      const limit = Number(formData.creditLimit);
      if (isNaN(limit) || limit < 0) {
        errors.creditLimit = 'Credit limit must be a positive number or zero';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setFormData({
      code: '',
      name: '',
      email: '',
      phone: '',
      address: '',
      creditLimit: '0',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (customer: CustomerItem) => {
    setEditingCustomer(customer);
    setFormData({
      code: customer.code,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      creditLimit: customer.creditLimit.toString(),
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
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        creditLimit: Number(formData.creditLimit) || 0.0,
      };

      if (formData.code.trim()) {
        payload.code = formData.code.trim().toUpperCase();
      }

      if (editingCustomer) {
        const res = await api.put(`/customers/${editingCustomer.id}`, payload);
        if (res.data.success) {
          success(`Customer '${payload.name}' updated successfully!`);
          setIsModalOpen(false);
          fetchCustomers();
        }
      } else {
        const res = await api.post('/customers', payload);
        if (res.data.success) {
          success(`Customer '${payload.name}' added successfully!`);
          setIsModalOpen(false);
          fetchCustomers();
        }
      }
    } catch (err: any) {
      console.error('Save customer error:', err);
      showError(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Click handler with safety check
  const handleDeleteClick = (customer: CustomerItem) => {
    if (customer.code === 'CUST-WALKIN') {
      showError('The system Walk-in Customer record cannot be deleted.');
      return;
    }

    if (customer.totalOrders > 0) {
      setCustomerToDelete(customer);
      setIsUnsafeAlertOpen(true);
    } else {
      setCustomerToDelete(customer);
      setIsDeleteDialogOpen(true);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;

    try {
      setIsSubmitting(true);
      const res = await api.delete(`/customers/${customerToDelete.id}`);
      if (res.data.success) {
        success(`Customer '${customerToDelete.name}' was removed successfully.`);
        setIsDeleteDialogOpen(false);
        setCustomerToDelete(null);
        fetchCustomers();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to delete customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const segments: Array<{ label: string; value: string }> = [
    { label: 'All Segments', value: 'all' },
    { label: 'VIP Spenders', value: 'VIP' },
    { label: 'Loyal Buyers', value: 'LOYAL' },
    { label: 'New Customers', value: 'NEW' },
    { label: 'At Risk', value: 'AT_RISK' },
    { label: 'Prospects', value: 'PROSPECT' },
    { label: 'Walk-in', value: 'WALK_IN' },
  ];

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
      {/* Top Header */}
      <PageHeader
        title="Customer Management"
        description="Maintain customer profiles, credit limits, purchasing history, and RFM segmentation insights."
        breadcrumbs={[{ label: 'Customers' }]}
        actions={
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        }
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Clients</p>
            <p className="text-2xl font-bold text-slate-100">{stats.totalCustomers}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Buyers</p>
            <p className="text-2xl font-bold text-slate-100">{stats.activeCustomers}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer Revenue</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.totalRevenue)}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Lifetime Value</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.avgLifetimeValue)}</p>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Search and Segment Filter Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, code, phone, email..."
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

          {/* Segment Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto justify-start lg:justify-end">
            <div className="flex flex-wrap items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 gap-1">
              {segments.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setSegmentFilter(s.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    segmentFilter === s.value
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchCustomers}
              title="Refresh Directory"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Customer Directory Table */}
        {isLoading ? (
          <LoadingState message="Loading customer directory & analytics..." />
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers found"
            description={
              searchTerm || segmentFilter !== 'all'
                ? 'No customers match the current search or segment parameters.'
                : 'Customer directory is empty. Register your first customer to get started.'
            }
            action={
              searchTerm || segmentFilter !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSegmentFilter('all');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-brand-500/20"
                >
                  Register First Customer
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Customer & Code</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Segment</th>
                  <th className="py-3.5 px-4 text-center">Orders</th>
                  <th className="py-3.5 px-4 text-right">Avg Order</th>
                  <th className="py-3.5 px-4 text-right">Total Spent</th>
                  <th className="py-3.5 px-4 text-right">Credit Limit</th>
                  <th className="py-3.5 px-4">Last Purchase</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {customers.map((customer) => {
                  const isWalkIn = customer.code === 'CUST-WALKIN';
                  return (
                    <tr key={customer.id} className="hover:bg-slate-850/50 transition-colors group">
                      {/* Customer Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="font-bold text-slate-100 hover:text-brand-400 transition-colors flex items-center gap-1.5"
                          >
                            <span>{customer.name}</span>
                            {isWalkIn && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                                Walk-in
                              </span>
                            )}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-brand-400 font-semibold border border-slate-700">
                              {customer.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          {customer.phone ? (
                            <a
                              href={`tel:${customer.phone}`}
                              className="text-slate-200 hover:text-brand-400 flex items-center gap-1 text-[11px] transition-colors"
                            >
                              <Phone className="w-3 h-3 text-slate-500" />
                              {customer.phone}
                            </a>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">No phone</span>
                          )}
                          {customer.email ? (
                            <a
                              href={`mailto:${customer.email}`}
                              className="text-slate-400 hover:text-brand-400 flex items-center gap-1 text-[11px] transition-colors truncate max-w-[180px]"
                            >
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{customer.email}</span>
                            </a>
                          ) : null}
                        </div>
                      </td>

                      {/* Customer Segment Badge */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={customer.segment} size="sm" />
                      </td>

                      {/* Orders Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 font-mono font-bold text-slate-200 text-xs border border-slate-700">
                          {customer.totalOrders}
                        </span>
                      </td>

                      {/* Avg Order Value */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono text-slate-300 font-medium">
                          {formatCurrency(customer.averageOrderValue)}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-bold text-emerald-400">
                          {formatCurrency(customer.totalSpent)}
                        </span>
                      </td>

                      {/* Credit Limit */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono text-slate-400">
                          {formatCurrency(customer.creditLimit)}
                        </span>
                      </td>

                      {/* Last Purchase Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {formatDate(customer.lastPurchaseDate)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/customers/${customer.id}`}
                            title="View Profile & Invoices"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          {!isWalkIn && (
                            <button
                              onClick={() => handleOpenEditModal(customer)}
                              title="Edit Customer"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && !isWalkIn && (
                            <button
                              onClick={() => handleDeleteClick(customer)}
                              title="Delete Customer"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
        <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 bg-slate-950/20">
          <div>
            Showing <span className="text-slate-200 font-semibold">{customers.length}</span> of{' '}
            <span className="text-slate-200 font-semibold">{pagination.totalItems}</span> customers
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

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Add New Customer'}
        description="Register customer credentials, credit limit, and address."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Code */}
            <FormField
              label="Customer Code"
              error={formErrors.code}
              helperText="Optional: Leave blank to auto-generate (e.g. CUST-051)"
            >
              <Input
                placeholder="e.g. CUST-051"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </FormField>

            {/* Customer Name */}
            <FormField label="Customer Full Name *" error={formErrors.name}>
              <Input
                placeholder="e.g. John Doe / Global Enterprises"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone Number */}
            <FormField label="Phone Number" error={formErrors.phone}>
              <Input
                placeholder="e.g. +1-555-0199"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </FormField>

            {/* Email Address */}
            <FormField label="Email Address" error={formErrors.email}>
              <Input
                type="email"
                placeholder="e.g. client@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Credit Limit */}
            <FormField
              label="Credit Limit ($)"
              error={formErrors.creditLimit}
              helperText="Maximum allowed outstanding balance for POS credit purchases."
            >
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
              />
            </FormField>

            {/* Address */}
            <FormField label="Address / Location">
              <Input
                placeholder="e.g. 123 Commercial Way, Suite 10"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </FormField>
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
              {editingCustomer ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Customer Profile"
        message={`Are you sure you want to delete '${customerToDelete?.name}' (${customerToDelete?.code})? This action cannot be undone.`}
        confirmText="Delete Customer"
        type="danger"
        isLoading={isSubmitting}
      />

      {/* Unsafe Deletion Audit Protection Alert */}
      <Modal
        isOpen={isUnsafeAlertOpen}
        onClose={() => setIsUnsafeAlertOpen(false)}
        title="Deletion Blocked by Audit Safety"
        description="SmartStock protects financial and sales invoice audit integrity."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Cannot delete customer with historical transactions</p>
              <p className="text-slate-300">
                <span className="font-semibold text-white">{customerToDelete?.name}</span> has{' '}
                <span className="font-bold text-amber-400">{customerToDelete?.totalOrders}</span> completed sales
                invoice(s) totaling{' '}
                <span className="font-bold text-amber-400">
                  {formatCurrency(customerToDelete?.totalSpent || 0)}
                </span>
                .
              </p>
              <p className="text-slate-400 pt-1">
                Deleting this record would break invoice references and reporting history.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300">
            <p className="font-semibold text-slate-200 mb-1">Recommended Approach:</p>
            <p className="text-slate-400">
              Retain the customer record to preserve compliance and tax invoice audits. If you wish to suspend credit, set their credit limit to <span className="font-mono text-white font-bold">$0.00</span>.
            </p>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              onClick={() => setIsUnsafeAlertOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
