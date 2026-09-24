'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { FormField, Input, Textarea } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  DollarSign,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  Filter,
  CreditCard,
  Banknote,
  Building,
  Globe,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Layers,
  Zap,
  Briefcase,
  Truck,
  Megaphone,
  Wrench,
  HelpCircle,
  PowerOff,
  Power,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  ExpenseItem,
  ExpenseCategory,
  EXPENSE_CATEGORIES,
  ExpenseSummary,
  CreateExpensePayload,
  UpdateExpensePayload,
} from '@/types/expense';
import { PaymentMethod } from '@/types/sale';

export default function ExpensesPage() {
  const { hasRole } = useAuth();
  const { error: showError, success: showSuccess, info: showInfo } = useToast();

  const isAuthorized = hasRole('ADMIN', 'MANAGER');

  // List & Pagination State
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalCount: 0,
    totalAmount: 0,
    categoryBreakdown: {
      rent: 0,
      electricity: 0,
      salary: 0,
      transport: 0,
      marketing: 0,
      maintenance: 0,
      other: 0,
    },
    methodBreakdown: {
      cash: 0,
      card: 0,
      bankTransfer: 0,
      online: 0,
    },
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);

  // Form State
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Other');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('CASH');
  const [formExpenseDate, setFormExpenseDate] = useState<string>(todayStr);

  // Search Debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch Expenses List & Summary
  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        paymentMethod: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const res = await api.get('/expenses', { params });
      if (res.data?.data) {
        const data = res.data.data;
        setExpenses(data.items || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalItems(data.pagination.total || 0);
        }
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to fetch expense records');
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    limit,
    debouncedSearch,
    categoryFilter,
    paymentMethodFilter,
    statusFilter,
    startDate,
    endDate,
    showError,
  ]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormCategory('Other');
    setFormAmount('');
    setFormDescription('');
    setFormPaymentMethod('CASH');
    setFormExpenseDate(todayStr);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (expense: ExpenseItem) => {
    setSelectedExpense(expense);
    setFormCategory((expense.category as ExpenseCategory) || 'Other');
    setFormAmount(expense.amount.toString());
    setFormDescription(expense.description || '');
    setFormPaymentMethod(expense.paymentMethod || 'CASH');
    const dateFormatted = expense.expenseDate
      ? new Date(expense.expenseDate).toISOString().split('T')[0]
      : todayStr;
    setFormExpenseDate(dateFormatted);
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (expense: ExpenseItem) => {
    setSelectedExpense(expense);
    setIsDeleteModalOpen(true);
  };

  // Validate Monetary Input
  const validateAmount = (amtStr: string): { isValid: boolean; value: number; error?: string } => {
    if (!amtStr || amtStr.trim() === '') {
      return { isValid: false, value: 0, error: 'Amount is required' };
    }
    const val = parseFloat(amtStr);
    if (isNaN(val)) {
      return { isValid: false, value: 0, error: 'Amount must be a valid number' };
    }
    if (val <= 0) {
      return { isValid: false, value: 0, error: 'Amount must be greater than zero ($0.00)' };
    }
    return { isValid: true, value: val };
  };

  // Handle Add Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateAmount(formAmount);
    if (!validation.isValid) {
      showError(validation.error || 'Invalid expense amount');
      return;
    }

    if (!formDescription.trim() || formDescription.trim().length < 3) {
      showError('Description must be at least 3 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateExpensePayload = {
        category: formCategory,
        amount: validation.value,
        description: formDescription.trim(),
        paymentMethod: formPaymentMethod,
        expenseDate: formExpenseDate ? new Date(formExpenseDate).toISOString() : undefined,
      };

      await api.post('/expenses', payload);
      showSuccess(`Expense for $${validation.value.toFixed(2)} recorded successfully`);
      setIsAddModalOpen(false);
      await fetchExpenses();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;

    const validation = validateAmount(formAmount);
    if (!validation.isValid) {
      showError(validation.error || 'Invalid expense amount');
      return;
    }

    if (!formDescription.trim() || formDescription.trim().length < 3) {
      showError('Description must be at least 3 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateExpensePayload = {
        category: formCategory,
        amount: validation.value,
        description: formDescription.trim(),
        paymentMethod: formPaymentMethod,
        expenseDate: formExpenseDate ? new Date(formExpenseDate).toISOString() : undefined,
      };

      await api.put(`/expenses/${selectedExpense.id}`, payload);
      showSuccess(`Expense record updated successfully`);
      setIsEditModalOpen(false);
      setSelectedExpense(null);
      await fetchExpenses();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to update expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Soft Deactivate / Reactivate
  const handleToggleStatus = async (expense: ExpenseItem) => {
    try {
      if (expense.isActive) {
        await api.patch(`/expenses/${expense.id}/deactivate`);
        showInfo(`Expense deactivated successfully`);
      } else {
        await api.patch(`/expenses/${expense.id}/activate`);
        showSuccess(`Expense reactivated successfully`);
      }
      await fetchExpenses();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to update expense status');
    }
  };

  // Handle Hard Delete
  const handleDeleteConfirm = async () => {
    if (!selectedExpense) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/expenses/${selectedExpense.id}`);
      showSuccess('Expense deleted permanently');
      setIsDeleteModalOpen(false);
      setSelectedExpense(null);
      await fetchExpenses();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setCategoryFilter('all');
    setPaymentMethodFilter('all');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Category Icon & Styling Helper
  const getCategoryDetails = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'rent':
        return {
          icon: <Building className="w-3.5 h-3.5" />,
          color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        };
      case 'electricity':
        return {
          icon: <Zap className="w-3.5 h-3.5" />,
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        };
      case 'salary':
        return {
          icon: <Briefcase className="w-3.5 h-3.5" />,
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        };
      case 'transport':
        return {
          icon: <Truck className="w-3.5 h-3.5" />,
          color: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
        };
      case 'marketing':
        return {
          icon: <Megaphone className="w-3.5 h-3.5" />,
          color: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
        };
      case 'maintenance':
        return {
          icon: <Wrench className="w-3.5 h-3.5" />,
          color: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        };
      default:
        return {
          icon: <HelpCircle className="w-3.5 h-3.5" />,
          color: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        };
    }
  };

  // Payment Method Icon Helper
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
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      {/* Header */}
      <PageHeader
        title="Expense Management"
        description="Record, categorize, audit, and analyze company operating costs and overheads."
        breadcrumbs={[{ label: 'Expenses' }]}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchExpenses()}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition-colors shadow-sm"
              title="Refresh Expenses"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
            </button>
            {isAuthorized && (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Record Expense
              </button>
            )}
          </div>
        }
      />

      {/* KPI & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Expenses */}
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-slate-700/60 transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors" />
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Expenses
            </p>
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2 font-mono">
            ${summary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {summary.totalCount} active expenditures logged
          </p>
        </div>

        {/* Salaries & Rent */}
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-slate-700/60 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Salary & Rent
            </p>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-slate-400">Salary: </span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                ${summary.categoryBreakdown.salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400">Rent: </span>
              <span className="text-sm font-bold text-purple-400 font-mono">
                ${summary.categoryBreakdown.rent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Core fixed operating commitments</p>
        </div>

        {/* Utilities & Maintenance */}
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-slate-700/60 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Power & Maintenance
            </p>
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-slate-400">Electricity: </span>
              <span className="text-sm font-bold text-amber-400 font-mono">
                ${summary.categoryBreakdown.electricity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400">Maint: </span>
              <span className="text-sm font-bold text-orange-400 font-mono">
                ${summary.categoryBreakdown.maintenance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Facility upkeep & power consumption</p>
        </div>

        {/* Transport & Marketing */}
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm group hover:border-slate-700/60 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Logistics & Outreach
            </p>
            <div className="p-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-xl">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-slate-400">Transport: </span>
              <span className="text-sm font-bold text-sky-400 font-mono">
                ${summary.categoryBreakdown.transport.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400">Marketing: </span>
              <span className="text-sm font-bold text-pink-400 font-mono">
                ${summary.categoryBreakdown.marketing.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Other categories: ${summary.categoryBreakdown.other.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl mb-6 backdrop-blur-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search description or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 text-slate-200 pl-9 pr-8 py-2 text-xs rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950/60 border border-slate-800 text-slate-200 px-3 py-2 text-xs rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950/60 border border-slate-800 text-slate-200 px-3 py-2 text-xs rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
            >
              <option value="all">All Payment Methods</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950/60 border border-slate-800 text-slate-200 px-3 py-2 text-xs rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Deactivated Only</option>
            </select>
          </div>
        </div>

        {/* Date Range Sub-Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-brand-400" />
            <span>Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950/60 border border-slate-800 text-slate-300 px-2.5 py-1 text-xs rounded-lg focus:border-brand-500 focus:outline-none"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950/60 border border-slate-800 text-slate-300 px-2.5 py-1 text-xs rounded-lg focus:border-brand-500 focus:outline-none"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-rose-400 hover:text-rose-300 underline ml-1"
              >
                Clear Dates
              </button>
            )}
          </div>

          {/* Active Filter Clear */}
          {(searchTerm ||
            categoryFilter !== 'all' ||
            paymentMethodFilter !== 'all' ||
            statusFilter !== 'all' ||
            startDate ||
            endDate) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium transition-colors"
            >
              <Filter className="w-3 h-3" />
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Expenses Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
        {isLoading ? (
          <div className="p-12">
            <LoadingState message="Loading expense records..." />
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No expenses found"
              description="No expense transactions match your active filters or search criteria."
              action={
                isAuthorized ? (
                  <button
                    onClick={handleOpenAdd}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs rounded-xl shadow-lg transition-all"
                  >
                    Record New Expense
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
                  <th className="p-4 pl-6">Date</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Recorded By</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {expenses.map((expense) => {
                  const catDetails = getCategoryDetails(expense.category);
                  const isDeactivated = !expense.isActive;

                  return (
                    <tr
                      key={expense.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isDeactivated ? 'opacity-60 bg-slate-950/20' : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="p-4 pl-6 font-mono text-slate-300">
                        {new Date(expense.expenseDate || expense.createdAt).toLocaleDateString(
                          undefined,
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }
                        )}
                      </td>

                      {/* Category Badge */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${catDetails.color}`}
                        >
                          {catDetails.icon}
                          {expense.category}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="p-4">
                        <p className="font-medium text-slate-200 line-clamp-1">
                          {expense.description}
                        </p>
                      </td>

                      {/* User */}
                      <td className="p-4 text-slate-400">
                        <div className="flex flex-col">
                          <span className="text-slate-300 font-medium">
                            {expense.user?.name || 'Staff User'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {expense.user?.email || 'user@smartstock.com'}
                          </span>
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-slate-700/60 bg-slate-800/40 text-slate-300 text-xs font-mono">
                          {getMethodIcon(expense.paymentMethod)}
                          {expense.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="p-4 text-right">
                        <span className="font-mono font-bold text-rose-400 text-sm">
                          ${expense.amount.toFixed(2)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <StatusBadge
                          status={expense.isActive ? 'ACTIVE' : 'INACTIVE'}
                          type="status"
                          size="sm"
                        />
                      </td>

                      {/* Actions */}
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit button */}
                          <button
                            onClick={() => handleOpenEdit(expense)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Expense"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Deactivate / Reactivate button */}
                          <button
                            onClick={() => handleToggleStatus(expense)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              expense.isActive
                                ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                            }`}
                            title={expense.isActive ? 'Deactivate Expense' : 'Reactivate Expense'}
                          >
                            {expense.isActive ? (
                              <PowerOff className="w-4 h-4" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleOpenDelete(expense)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete Permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing {((page - 1) * limit) + 1} to{' '}
              {Math.min(page * limit, totalItems)} of {totalItems} expenditures
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-300 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Add Expense */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record New Expense"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {/* Category */}
          <FormField label="Category" required>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-xs focus:border-brand-500 focus:outline-none"
              required
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </FormField>

          {/* Amount */}
          <FormField label="Monetary Amount ($)" required>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              required
            />
            {formAmount && parseFloat(formAmount) <= 0 && (
              <p className="text-[11px] text-rose-400 mt-1">
                Monetary value must be greater than zero.
              </p>
            )}
          </FormField>

          {/* Description */}
          <FormField label="Description & Notes" required>
            <Textarea
              placeholder="e.g. Monthly store electrical billing or facility lease"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              required
            />
          </FormField>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Payment Method" required>
              <select
                value={formPaymentMethod}
                onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-xs focus:border-brand-500 focus:outline-none"
                required
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="ONLINE">Online</option>
              </select>
            </FormField>

            <FormField label="Expense Date" required>
              <Input
                type="date"
                value={formExpenseDate}
                onChange={(e) => setFormExpenseDate(e.target.value)}
                required
              />
            </FormField>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formAmount || parseFloat(formAmount) <= 0}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? 'Recording...' : 'Record Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Edit Expense */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedExpense(null);
        }}
        title="Edit Expense Details"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {/* Category */}
          <FormField label="Category" required>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-xs focus:border-brand-500 focus:outline-none"
              required
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </FormField>

          {/* Amount */}
          <FormField label="Monetary Amount ($)" required>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              required
            />
            {formAmount && parseFloat(formAmount) <= 0 && (
              <p className="text-[11px] text-rose-400 mt-1">
                Monetary value must be greater than zero.
              </p>
            )}
          </FormField>

          {/* Description */}
          <FormField label="Description & Notes" required>
            <Textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              required
            />
          </FormField>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Payment Method" required>
              <select
                value={formPaymentMethod}
                onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-xs focus:border-brand-500 focus:outline-none"
                required
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="ONLINE">Online</option>
              </select>
            </FormField>

            <FormField label="Expense Date" required>
              <Input
                type="date"
                value={formExpenseDate}
                onChange={(e) => setFormExpenseDate(e.target.value)}
                required
              />
            </FormField>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedExpense(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formAmount || parseFloat(formAmount) <= 0}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Confirm Permanent Delete */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedExpense(null);
        }}
        title="Confirm Expense Deletion"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-rose-300">
                Are you sure you want to permanently delete this expense?
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                This action is irreversible and will remove this expense record from historical
                audit trails. For reversible removals, consider deactivating the expense instead.
              </p>
            </div>
          </div>

          {selectedExpense && (
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold text-slate-200">
                  {selectedExpense.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Description:</span>
                <span className="text-slate-200 font-medium">
                  {selectedExpense.description}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-rose-400 font-mono">
                  ${selectedExpense.amount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedExpense(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDeleteConfirm}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
