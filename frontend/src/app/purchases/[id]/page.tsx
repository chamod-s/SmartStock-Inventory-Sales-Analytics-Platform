'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { PurchaseDetail } from '@/types/purchase';
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  PackageCheck,
  UserCheck,
  FileText,
  Clock,
  Printer,
  XCircle,
  TrendingUp,
  Package,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const purchaseId = params.id as string;

  const { hasRole } = useAuth();
  const { success, error: showError } = useToast();
  const canManage = hasRole('ADMIN', 'MANAGER');

  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Action Dialog States
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState<boolean>(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Fetch Purchase Details
  const fetchPurchaseDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/purchases/${purchaseId}`);
      if (res.data.success) {
        setPurchase(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load purchase details:', err);
      showError(err.response?.data?.message || 'Failed to load purchase order details');
      router.push('/purchases');
    } finally {
      setIsLoading(false);
    }
  }, [purchaseId, showError, router]);

  useEffect(() => {
    if (purchaseId) {
      fetchPurchaseDetails();
    }
  }, [purchaseId, fetchPurchaseDetails]);

  // Handle Receive Action
  const handleReceivePurchase = async () => {
    try {
      setIsProcessing(true);
      const res = await api.put(`/purchases/${purchaseId}`, {
        status: 'RECEIVED',
      });
      if (res.data.success) {
        success('Purchase order received successfully! Product stocks have been updated.');
        setIsReceiveDialogOpen(false);
        fetchPurchaseDetails();
      }
    } catch (err: any) {
      console.error('Failed to receive purchase:', err);
      showError(err.response?.data?.message || 'Failed to receive purchase order');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Cancel Action
  const handleCancelPurchase = async () => {
    try {
      setIsProcessing(true);
      const res = await api.put(`/purchases/${purchaseId}`, {
        status: 'CANCELLED',
      });
      if (res.data.success) {
        success('Purchase order marked as CANCELLED.');
        setIsCancelDialogOpen(false);
        fetchPurchaseDetails();
      }
    } catch (err: any) {
      console.error('Failed to cancel purchase:', err);
      showError(err.response?.data?.message || 'Failed to cancel purchase order');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
        <div className="py-24">
          <LoadingState message="Loading purchase order details..." />
        </div>
      </DashboardLayout>
    );
  }

  if (!purchase) {
    return null;
  }

  const formattedDate = new Date(purchase.purchaseDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      {/* Header */}
      <PageHeader
        title={`Purchase Order: ${purchase.purchaseOrderNumber}`}
        description={`Placed on ${formattedDate} with ${purchase.supplier?.name}`}
        breadcrumbs={[
          { label: 'Purchases', href: '/purchases' },
          { label: purchase.purchaseOrderNumber },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Link
              href="/purchases"
              className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-all text-xs font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-all text-xs font-semibold flex items-center gap-1.5"
              title="Print Purchase Order Receipt"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>

            {canManage && purchase.status === 'PENDING' && (
              <>
                <button
                  onClick={() => setIsCancelDialogOpen(true)}
                  className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Order
                </button>

                <button
                  onClick={() => setIsReceiveDialogOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                >
                  <PackageCheck className="w-4 h-4" />
                  Receive Goods & Stock In
                </button>
              </>
            )}
          </div>
        }
      />

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Amount</span>
          <h4 className="text-2xl font-bold text-emerald-400 font-mono mt-2">
            ${Number(purchase.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h4>
          <p className="text-xs text-slate-500 mt-1">Inclusive of tax & discounts</p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Order Status</span>
          <div className="mt-2">
            <StatusBadge status={purchase.status} size="md" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {purchase.status === 'RECEIVED'
              ? 'Stock successfully added to inventory'
              : purchase.status === 'PENDING'
              ? 'Pending supplier shipment delivery'
              : 'Purchase order cancelled'}
          </p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Purchase Date</span>
          <div className="flex items-center gap-2 text-slate-200 font-medium text-sm mt-2">
            <Calendar className="w-4 h-4 text-brand-400" />
            {formattedDate}
          </div>
          <p className="text-xs text-slate-500 mt-1">Recorded order date</p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Created By</span>
          <div className="flex items-center gap-2 text-slate-200 font-medium text-sm mt-2">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            {purchase.user?.name || 'Staff User'}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono">{purchase.user?.role || 'SYSTEM'}</p>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Items Table & Inventory Audit Log */}
        <div className="lg:col-span-8 space-y-6">
          {/* Purchase Items Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-400" />
                Purchased Products ({purchase.items?.length || 0})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">Product</th>
                    <th className="py-3 px-3">SKU</th>
                    <th className="py-3 px-3 text-center">Quantity</th>
                    <th className="py-3 px-3 text-right">Unit Cost</th>
                    <th className="py-3 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {purchase.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/20">
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-200">{item.product?.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Unit: {item.product?.unit || 'pcs'}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-xs text-slate-400">
                        {item.product?.sku}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-bold text-slate-200">
                          {item.quantity} {item.product?.unit || 'pcs'}
                        </span>
                        {purchase.status === 'RECEIVED' && (
                          <span className="block text-xs font-semibold text-emerald-400 mt-0.5">
                            +{item.quantity} added to stock
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                        ${Number(item.unitCost).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-100">
                        ${Number(item.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inventory Transaction Audit Records */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  Inventory Stock Audit Log
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Audited inventory stock adjustments recorded during purchase order receipt.
                </p>
              </div>
            </div>

            {purchase.inventoryTransactions && purchase.inventoryTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Stock Before</th>
                      <th className="py-2.5 px-3 text-center">Credited Qty</th>
                      <th className="py-2.5 px-3 text-right">Stock After</th>
                      <th className="py-2.5 px-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm font-mono">
                    {purchase.inventoryTransactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-slate-800/20 text-xs">
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                            {txn.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {txn.stockBefore} pcs
                        </td>
                        <td className="py-3 px-3 text-center text-emerald-400 font-bold">
                          +{txn.quantity} pcs
                        </td>
                        <td className="py-3 px-3 text-right text-slate-200 font-bold">
                          {txn.stockAfter} pcs
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500 font-sans">
                          {new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center border border-slate-800/60 rounded-xl bg-slate-950/30">
                <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  {purchase.status === 'PENDING'
                    ? 'Stock transactions will be automatically logged when goods are marked as RECEIVED.'
                    : 'No inventory transactions recorded for this order.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Supplier, Financial Summary, Notes */}
        <div className="lg:col-span-4 space-y-6">
          {/* Supplier Details Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-400" />
                Supplier Information
              </h3>
              {purchase.supplier?.id && (
                <Link
                  href={`/suppliers/${purchase.supplier.id}`}
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                >
                  Profile
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-500">Name:</span>
                <span className="font-semibold text-slate-200 ml-1.5">{purchase.supplier?.name}</span>
              </div>
              <div>
                <span className="text-slate-500">Code:</span>
                <span className="font-mono text-slate-300 ml-1.5">{purchase.supplier?.code}</span>
              </div>
              <div>
                <span className="text-slate-500">Contact Person:</span>
                <span className="text-slate-300 ml-1.5">{purchase.supplier?.contactPerson || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-300 ml-1.5">{purchase.supplier?.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500">Phone:</span>
                <span className="text-slate-300 ml-1.5">{purchase.supplier?.phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Cost & Invoicing Summary */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 mb-3 border-b border-slate-800 pb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-brand-400" />
              Financial Breakdown
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Items Subtotal:</span>
                <span className="font-mono text-slate-200">
                  ${Number(purchase.subtotal).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span>Discount:</span>
                <span className="font-mono text-slate-200">
                  -${Number(purchase.discountAmount).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span>Tax / Freight:</span>
                <span className="font-mono text-slate-200">
                  +${Number(purchase.taxAmount).toFixed(2)}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-sm font-bold">
                <span className="text-slate-100">Total Expenditure:</span>
                <span className="font-mono text-emerald-400 text-base">
                  ${Number(purchase.totalAmount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes Card */}
          {purchase.notes && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
              <h3 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-400" />
                Notes & Instructions
              </h3>
              <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                {purchase.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog: Receive Purchase */}
      <ConfirmDialog
        isOpen={isReceiveDialogOpen}
        onClose={() => setIsReceiveDialogOpen(false)}
        onConfirm={handleReceivePurchase}
        title="Receive Purchase Order"
        message={`Confirm receiving ${purchase.purchaseOrderNumber}? This will immediately increment inventory stock levels for all ${purchase.items?.length || 0} product(s) and record audit transactions.`}
        confirmText="Confirm & Receive Stock"
        type="info"
        isLoading={isProcessing}
      />

      {/* Confirmation Dialog: Cancel Purchase */}
      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleCancelPurchase}
        title="Cancel Purchase Order"
        message={`Are you sure you want to cancel purchase order ${purchase.purchaseOrderNumber}? This action cannot be reversed.`}
        confirmText="Yes, Cancel Order"
        type="danger"
        isLoading={isProcessing}
      />
    </DashboardLayout>
  );
}
