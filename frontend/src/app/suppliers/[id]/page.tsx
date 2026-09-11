'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { FormField, Input, Textarea } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { SupplierDetail, PurchaseHistoryItem } from '@/types/supplier';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  Edit2,
  Power,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;

  const { hasRole } = useAuth();
  const { success, error: showError } = useToast();
  const canManage = hasRole('ADMIN', 'MANAGER');

  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
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

  const fetchSupplierDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/suppliers/${supplierId}`);
      if (res.data.success) {
        setSupplier(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load supplier:', err);
      showError(err.response?.data?.message || 'Failed to load supplier profile');
      router.push('/suppliers');
    } finally {
      setIsLoading(false);
    }
  }, [supplierId, showError, router]);

  useEffect(() => {
    if (supplierId) {
      fetchSupplierDetails();
    }
  }, [supplierId, fetchSupplierDetails]);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const handleOpenEdit = () => {
    if (!supplier) return;
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
    setIsEditModalOpen(true);
  };

  const handleToggleStatus = async () => {
    if (!supplier) return;
    const nextStatus = !supplier.isActive;
    try {
      const res = await api.put(`/suppliers/${supplier.id}`, { isActive: nextStatus });
      if (res.data.success) {
        success(`Supplier status updated to ${nextStatus ? 'ACTIVE' : 'INACTIVE'}`);
        fetchSupplierDetails();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to update supplier status');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormErrors({ name: 'Supplier name is required' });
      return;
    }

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

      const res = await api.put(`/suppliers/${supplierId}`, payload);
      if (res.data.success) {
        success('Supplier details updated successfully');
        setIsEditModalOpen(false);
        fetchSupplierDetails();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to update supplier details');
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

  const formatDate = (dateString: string) => {
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

  if (isLoading) {
    return (
      <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
        <LoadingState message="Loading supplier profile & purchase history..." />
      </DashboardLayout>
    );
  }

  if (!supplier) {
    return (
      <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
        <div className="p-8 text-center text-slate-400">
          <p>Supplier could not be found.</p>
          <Link href="/suppliers" className="text-brand-400 font-semibold underline mt-2 inline-block">
            Return to Suppliers Directory
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const averageOrderValue =
    supplier.totalPurchases > 0 ? supplier.totalPurchaseAmount / supplier.totalPurchases : 0;
  const latestOrderDate =
    supplier.purchaseHistory.length > 0 ? formatDate(supplier.purchaseHistory[0].createdAt) : 'None';

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      {/* Top Header */}
      <div className="mb-6">
        <Link
          href="/suppliers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Suppliers Directory
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-100">{supplier.name}</h1>
                <StatusBadge status={supplier.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-brand-400 font-bold border border-slate-700">
                  {supplier.code}
                </span>
                <span>•</span>
                <span>Partner since {formatDate(supplier.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleStatus}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  supplier.isActive
                    ? 'bg-slate-800 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border-slate-700 hover:border-rose-500/30'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                {supplier.isActive ? 'Deactivate' : 'Activate Vendor'}
              </button>
              <button
                onClick={handleOpenEdit}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Details
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Purchase Volume</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(supplier.totalPurchaseAmount)}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Number of Purchases</p>
            <p className="text-2xl font-bold text-slate-100">{supplier.totalPurchases}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Order Value</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(averageOrderValue)}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Latest Order Date</p>
            <p className="text-lg font-bold text-slate-100 truncate">{latestOrderDate}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contact & Business Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider pb-3 border-b border-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-400" />
              Contact & Business Information
            </h2>
            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Primary Contact Person</span>
                <span className="text-slate-200 font-semibold text-sm">
                  {supplier.contactPerson || <span className="text-slate-500 italic">Not specified</span>}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Email Address</span>
                {supplier.email ? (
                  <a
                    href={`mailto:${supplier.email}`}
                    className="text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {supplier.email}
                  </a>
                ) : (
                  <span className="text-slate-500 italic">No email on file</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Phone Number</span>
                {supplier.phone ? (
                  <a
                    href={`tel:${supplier.phone}`}
                    className="text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {supplier.phone}
                  </a>
                ) : (
                  <span className="text-slate-500 italic">No phone on file</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Headquarters / Address</span>
                {supplier.address ? (
                  <div className="flex items-start gap-1.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span>{supplier.address}</span>
                  </div>
                ) : (
                  <span className="text-slate-500 italic">No address on file</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Tax / VAT Identification</span>
                <span className="font-mono text-slate-300 font-semibold">
                  {supplier.taxId || <span className="text-slate-500 italic">N/A</span>}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
                <p>Created: {formatDate(supplier.createdAt)}</p>
                <p>Last Updated: {formatDate(supplier.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Full Purchase History Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-indigo-400" />
                  Purchase Orders History ({supplier.purchaseHistory.length})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete record of inventory replenishment orders placed with this vendor.
                </p>
              </div>
            </div>

            {supplier.purchaseHistory.length === 0 ? (
              <EmptyState
                title="No purchase orders yet"
                description="This supplier does not have any recorded purchase order transactions."
                action={
                  <Link
                    href="/purchases"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-brand-500/20"
                  >
                    Go to Purchases Module
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-slate-800/80">
                {supplier.purchaseHistory.map((po) => {
                  const isExpanded = !!expandedOrders[po.id];
                  return (
                    <div key={po.id} className="p-4 hover:bg-slate-850/40 transition-colors">
                      {/* PO Summary Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100 font-mono">{po.purchaseOrderNumber}</span>
                            <StatusBadge status={po.status} size="sm" />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                            <span>{formatDate(po.createdAt)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-300">
                              <UserCheck className="w-3 h-3 text-slate-500" />
                              {po.user?.name || 'Authorized Buyer'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right">
                            <p className="text-xs text-slate-400 font-medium">Order Total</p>
                            <p className="text-base font-mono font-bold text-slate-100">
                              {formatCurrency(po.totalAmount)}
                            </p>
                          </div>
                          {po.items && po.items.length > 0 && (
                            <button
                              onClick={() => toggleOrderExpand(po.id)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                              title={isExpanded ? 'Collapse Items' : 'View Itemized Breakdown'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {po.notes && (
                        <p className="text-xs text-slate-400 italic mt-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                          Note: {po.notes}
                        </p>
                      )}

                      {/* Itemized Order Breakdown (Collapsible) */}
                      {isExpanded && po.items && po.items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Order Line Items ({po.items.length})
                          </p>
                          <div className="bg-slate-950/70 rounded-xl border border-slate-800 overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider bg-slate-900/60">
                                  <th className="py-2 px-3">Product Name & SKU</th>
                                  <th className="py-2 px-3 text-center">Quantity</th>
                                  <th className="py-2 px-3 text-right">Unit Cost</th>
                                  <th className="py-2 px-3 text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                {po.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="py-2 px-3">
                                      <span className="font-semibold text-slate-200">
                                        {item.product?.name || 'Product'}
                                      </span>
                                      <span className="block text-[10px] font-mono text-slate-400">
                                        {item.product?.sku}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-center font-mono">
                                      {item.quantity} {item.product?.unit || 'pcs'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono">
                                      {formatCurrency(item.unitCost)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-200">
                                      {formatCurrency(item.subtotal)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Supplier Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Supplier: ${supplier.name}`}
        description="Update vendor information and contact credentials."
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Supplier Code *" error={formErrors.code}>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </FormField>

            <FormField label="Company Name *" error={formErrors.name}>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Contact Person">
              <Input
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              />
            </FormField>

            <FormField label="Tax / VAT ID">
              <Input
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Email Address" error={formErrors.email}>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FormField>

            <FormField label="Phone Number" error={formErrors.phone}>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Physical / Billing Address">
            <Textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </FormField>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="detail-isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-brand-600 focus:ring-brand-500 focus:ring-offset-slate-900"
            />
            <label htmlFor="detail-isActive" className="text-xs font-semibold text-slate-300 cursor-pointer">
              Active Vendor (allowed for purchase replenishment orders)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
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
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
