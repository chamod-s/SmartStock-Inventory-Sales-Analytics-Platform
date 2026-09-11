'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { FormField, Input } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { CustomerDetail } from '@/types/customer';
import {
  ArrowLeft,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Edit2,
  CreditCard,
  ChevronDown,
  ChevronUp,
  UserCheck,
  RefreshCw,
  Award,
  Clock,
  Activity,
} from 'lucide-react';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const { success, error: showError } = useToast();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    creditLimit: '0',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchCustomerDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/customers/${customerId}`);
      if (res.data.success) {
        setCustomer(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load customer details:', err);
      showError(err.response?.data?.message || 'Failed to load customer profile');
      router.push('/customers');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, showError, router]);

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
    }
  }, [customerId, fetchCustomerDetails]);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const handleOpenEdit = () => {
    if (!customer) return;
    setFormData({
      code: customer.code,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      creditLimit: customer.creditLimit.toString(),
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormErrors({ name: 'Customer name is required' });
      return;
    }

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

      const res = await api.put(`/customers/${customerId}`, payload);
      if (res.data.success) {
        success('Customer details updated successfully!');
        setIsEditModalOpen(false);
        fetchCustomerDetails();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to update customer details');
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

  if (isLoading) {
    return (
      <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
        <LoadingState message="Loading customer profile & purchasing history..." />
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
        <div className="p-8 text-center text-slate-400">
          <p>Customer profile could not be found.</p>
          <Link href="/customers" className="text-brand-400 font-semibold underline mt-2 inline-block">
            Return to Customers Directory
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isWalkIn = customer.code === 'CUST-WALKIN';

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
      {/* Top Header */}
      <div className="mb-6">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Customers Directory
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-100">{customer.name}</h1>
                <StatusBadge status={customer.segment} size="sm" />
                {isWalkIn && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                    In-Store Walk-in
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-brand-400 font-bold border border-slate-700">
                  {customer.code}
                </span>
                <span>•</span>
                <span>Customer since {formatDate(customer.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isWalkIn && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenEdit}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Spending</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(customer.totalSpent)}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Number of Orders</p>
            <p className="text-2xl font-bold text-slate-100">{customer.totalOrders}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Order Value</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(customer.averageOrderValue)}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Credit Limit</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(customer.creditLimit)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contact & RFM Analytics */}
        <div className="lg:col-span-1 space-y-6">
          {/* Contact Details Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider pb-3 border-b border-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-400" />
              Contact & Account Info
            </h2>
            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Phone Number</span>
                {customer.phone ? (
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {customer.phone}
                  </a>
                ) : (
                  <span className="text-slate-500 italic">No phone on file</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Email Address</span>
                {customer.email ? (
                  <a
                    href={`mailto:${customer.email}`}
                    className="text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {customer.email}
                  </a>
                ) : (
                  <span className="text-slate-500 italic">No email on file</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Address / Location</span>
                {customer.address ? (
                  <div className="flex items-start gap-1.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span>{customer.address}</span>
                  </div>
                ) : (
                  <span className="text-slate-500 italic">No address on file</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Last Purchase Date</span>
                <span className="font-semibold text-slate-200">
                  {formatDate(customer.lastPurchaseDate)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
                <p>Created: {formatDate(customer.createdAt)}</p>
                <p>Last Modified: {formatDate(customer.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* RFM Segmentation Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider pb-3 border-b border-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              RFM Analytics & Segmentation
            </h2>
            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Assigned Segment:</span>
                <StatusBadge status={customer.segment} size="sm" />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Recency</span>
                  <span className="text-xs font-bold text-slate-200">
                    {customer.analytics.rfmScore.recency}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {customer.analytics.daysSinceLastPurchase !== null
                      ? `${customer.analytics.daysSinceLastPurchase}d ago`
                      : 'None'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Frequency</span>
                  <span className="text-xs font-bold text-slate-200">
                    {customer.analytics.rfmScore.frequency}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {customer.totalOrders} order(s)
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Monetary</span>
                  <span className="text-xs font-bold text-slate-200">
                    {customer.analytics.rfmScore.monetary}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {formatCurrency(customer.totalSpent)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Invoices & Purchase History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-brand-400" />
                  Sales & Invoices History ({customer.salesHistory.length})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological record of POS transactions and customer invoices.
                </p>
              </div>
            </div>

            {customer.salesHistory.length === 0 ? (
              <EmptyState
                title="No sales transactions yet"
                description="This customer does not have any recorded sales or purchases."
                action={
                  <Link
                    href="/sales"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-brand-500/20"
                  >
                    Open Point of Sale
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-slate-800/80">
                {customer.salesHistory.map((sale) => {
                  const isExpanded = !!expandedOrders[sale.id];
                  return (
                    <div key={sale.id} className="p-4 hover:bg-slate-850/40 transition-colors">
                      {/* Invoice Summary Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100 font-mono">{sale.invoiceNumber}</span>
                            <StatusBadge status={sale.status} size="sm" />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                            <span>{formatDate(sale.createdAt)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-300">
                              <UserCheck className="w-3 h-3 text-slate-500" />
                              {sale.user?.name || 'Cashier'}
                            </span>
                            {sale.payments && sale.payments.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-xs font-semibold text-slate-300">
                                  {sale.payments[0].paymentMethod}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right">
                            <p className="text-xs text-slate-400 font-medium">Invoice Amount</p>
                            <p className="text-base font-mono font-bold text-emerald-400">
                              {formatCurrency(sale.totalAmount)}
                            </p>
                          </div>
                          {sale.items && sale.items.length > 0 && (
                            <button
                              onClick={() => toggleOrderExpand(sale.id)}
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

                      {sale.notes && (
                        <p className="text-xs text-slate-400 italic mt-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                          Note: {sale.notes}
                        </p>
                      )}

                      {/* Itemized Order Breakdown */}
                      {isExpanded && sale.items && sale.items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Purchased Line Items ({sale.items.length})
                          </p>
                          <div className="bg-slate-950/70 rounded-xl border border-slate-800 overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider bg-slate-900/60">
                                  <th className="py-2 px-3">Product Name & SKU</th>
                                  <th className="py-2 px-3 text-center">Quantity</th>
                                  <th className="py-2 px-3 text-right">Unit Price</th>
                                  <th className="py-2 px-3 text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                {sale.items.map((item) => (
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
                                      {formatCurrency(item.unitPrice)}
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

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Customer: ${customer.name}`}
        description="Update contact credentials and credit limit."
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Customer Code *" error={formErrors.code}>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </FormField>

            <FormField label="Customer Name *" error={formErrors.name}>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Phone Number" error={formErrors.phone}>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </FormField>

            <FormField label="Email Address" error={formErrors.email}>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Credit Limit ($)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
              />
            </FormField>

            <FormField label="Address">
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </FormField>
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
