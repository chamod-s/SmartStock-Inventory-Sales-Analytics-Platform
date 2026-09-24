'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { FormField, Input } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import {
  Receipt,
  ArrowLeft,
  Printer,
  CreditCard,
  Banknote,
  Building,
  Globe,
  Plus,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { SaleDetail, PaymentMethod } from '@/types/sale';

export default function SaleInvoiceDetailPage() {
  const params = useParams();
  const { error: showError, success: showSuccess } = useToast();

  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Add Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const saleId = params.id as string;

  const fetchSaleDetails = async () => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      if (res.data?.data) {
        setSale(res.data.data);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to load sale invoice details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (saleId) {
      setIsLoading(true);
      fetchSaleDetails();
    }
  }, [saleId]);

  const handlePrint = () => {
    window.print();
  };

  // Open modal with remaining balance preset
  const handleOpenPaymentModal = () => {
    if (!sale) return;
    const totalAmount = Number(sale.totalAmount);
    const totalPaid =
      sale.totalPaid !== undefined
        ? Number(sale.totalPaid)
        : (sale.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
    const balanceRemaining = Math.max(0, Number((totalAmount - totalPaid).toFixed(2)));

    setPaymentAmount(balanceRemaining.toString());
    setPaymentMethod('CASH');
    setTransactionRef('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showError('Please enter a valid payment amount greater than zero');
      return;
    }

    const totalAmount = Number(sale.totalAmount);
    const totalPaid =
      sale.totalPaid !== undefined
        ? Number(sale.totalPaid)
        : (sale.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
    const balanceRemaining = Math.max(0, Number((totalAmount - totalPaid).toFixed(2)));

    if (amountNum > balanceRemaining + 0.001) {
      showError(`Payment amount cannot exceed the remaining balance of $${balanceRemaining.toFixed(2)}`);
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await api.post('/payments', {
        saleId: sale.id,
        amount: amountNum,
        paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
      });

      showSuccess(`Payment of $${amountNum.toFixed(2)} recorded successfully`);
      setIsPaymentModalOpen(false);
      await fetchSaleDetails();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
        <div className="py-20">
          <LoadingState message="Loading invoice and transaction details..." />
        </div>
      </DashboardLayout>
    );
  }

  if (!sale) {
    return (
      <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
        <div className="py-20 text-center space-y-4">
          <Receipt className="w-12 h-12 text-slate-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Invoice Not Found</h2>
          <p className="text-xs text-slate-400">The requested sale transaction record does not exist.</p>
          <Link
            href="/sales"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Sales</span>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const totalAmount = Number(sale.totalAmount);
  const totalPaid =
    sale.totalPaid !== undefined
      ? Number(sale.totalPaid)
      : (sale.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
  const balanceRemaining = Math.max(0, Number((totalAmount - totalPaid).toFixed(2)));
  const paymentStatus =
    sale.paymentStatus || (totalPaid >= totalAmount - 0.001 ? 'PAID' : totalPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

  const dateFormatted = new Date(sale.createdAt).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
      {/* Top Action Bar (hidden when printing) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/sales"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white font-mono flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand-400" />
                <span>{sale.invoiceNumber}</span>
              </h1>
              <StatusBadge status={sale.status} size="sm" />
              <StatusBadge status={paymentStatus} size="sm" />
            </div>
            <p className="text-xs text-slate-400">Transaction ID: {sale.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {balanceRemaining > 0 && sale.status === 'COMPLETED' && (
            <button
              onClick={handleOpenPaymentModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              <span>Record Payment (${balanceRemaining.toFixed(2)} due)</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-brand-400" />
            <span>Print Invoice</span>
          </button>

          <Link
            href="/sales/new"
            className="px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New POS Order</span>
          </Link>
        </div>
      </div>

      {/* Financial Summary Metric Bar (hidden when printing) */}
      <div className="print:hidden max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Billed</span>
            <div className="text-lg font-black font-mono text-white mt-0.5">
              ${totalAmount.toFixed(2)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-700/40 text-slate-300">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Collected</span>
            <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
              ${totalPaid.toFixed(2)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Balance Remaining</span>
            <div
              className={`text-lg font-black font-mono mt-0.5 ${
                balanceRemaining > 0 ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              ${balanceRemaining.toFixed(2)}
            </div>
          </div>
          <div
            className={`p-2.5 rounded-xl ${
              balanceRemaining > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700/40 text-slate-400'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="max-w-4xl mx-auto bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-700/60 print:border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
                S
              </div>
              <span className="text-lg font-black tracking-wider text-white print:text-black uppercase">
                SmartStock
              </span>
            </div>
            <p className="text-xs text-slate-400 print:text-gray-600 mt-2">
              Smart Inventory & Point of Sale Platform
            </p>
            <p className="text-xs text-slate-500 print:text-gray-500">
              Tax ID: SS-89210-POS &bull; Terminal 01
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 print:text-gray-500">
              Commercial Invoice
            </span>
            <div className="text-2xl font-black font-mono text-brand-400 print:text-black">
              {sale.invoiceNumber}
            </div>
            <div className="text-xs font-mono text-slate-400 print:text-gray-600">
              Issued: {dateFormatted}
            </div>
            <div className="pt-1 flex items-center gap-2 sm:justify-end">
              <StatusBadge status={sale.status} />
              <StatusBadge status={paymentStatus} />
            </div>
          </div>
        </div>

        {/* Billed To & Transaction Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-700/60 print:border-gray-200 text-xs">
          <div>
            <span className="text-[11px] font-bold text-slate-400 print:text-gray-500 uppercase tracking-wider block mb-2">
              Customer Details
            </span>
            <div className="text-sm font-bold text-white print:text-black">
              {sale.customer?.name || 'Walk-in Customer'}
            </div>
            {sale.customer && (
              <div className="text-slate-400 print:text-gray-600 space-y-0.5 mt-1 font-mono">
                <div>Customer Code: {sale.customer.code}</div>
                {sale.customer.email && <div>Email: {sale.customer.email}</div>}
                {sale.customer.phone && <div>Phone: {sale.customer.phone}</div>}
              </div>
            )}
          </div>

          <div className="space-y-1 sm:text-right">
            <span className="text-[11px] font-bold text-slate-400 print:text-gray-500 uppercase tracking-wider block mb-2">
              Cashier & Fulfillment
            </span>
            <div className="text-slate-300 print:text-gray-700">
              Processed By: <span className="font-semibold text-white print:text-black">{sale.user?.name}</span>
            </div>
            <div className="text-slate-300 print:text-gray-700">
              Payment Status:{' '}
              <span className="font-semibold text-white print:text-black">
                {paymentStatus.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700 print:border-gray-300 text-slate-400 print:text-gray-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-2">#</th>
                <th className="py-2.5 px-2">Item Description</th>
                <th className="py-2.5 px-2 font-mono">SKU</th>
                <th className="py-2.5 px-2 text-right">Qty</th>
                <th className="py-2.5 px-2 text-right">Unit Price</th>
                <th className="py-2.5 px-2 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-gray-200">
              {sale.items.map((item, index) => (
                <tr key={item.id} className="text-slate-200 print:text-gray-800">
                  <td className="py-3 px-2 font-mono text-slate-500">{index + 1}</td>
                  <td className="py-3 px-2">
                    <span className="font-semibold text-white print:text-black block">
                      {item.product?.name}
                    </span>
                    {item.product?.category && (
                      <span className="text-[10px] text-slate-400 print:text-gray-500">
                        {item.product.category.name}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2 font-mono text-slate-400 print:text-gray-600">
                    {item.product?.sku}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold">
                    {item.quantity} {item.product?.unit}
                  </td>
                  <td className="py-3 px-2 text-right font-mono">
                    ${Number(item.unitPrice).toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold text-white print:text-black">
                    ${Number(item.subtotal).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoice Summary Totals */}
        <div className="pt-4 border-t border-slate-700/60 print:border-gray-300 flex flex-col sm:flex-row justify-between gap-6 text-xs">
          <div className="max-w-xs text-slate-400 print:text-gray-600">
            {sale.notes && (
              <div>
                <span className="font-semibold block text-slate-300 print:text-gray-800 mb-1">
                  Notes / Terms:
                </span>
                <p className="italic">{sale.notes}</p>
              </div>
            )}
            <p className="mt-3 text-[11px] text-slate-500 print:text-gray-500">
              Thank you for shopping with SmartStock. All returns must be accompanied by this receipt within 14 days.
            </p>
          </div>

          <div className="w-full sm:w-64 space-y-2 font-mono">
            <div className="flex justify-between text-slate-300 print:text-gray-700">
              <span>Subtotal:</span>
              <span>${Number(sale.subtotal).toFixed(2)}</span>
            </div>

            {Number(sale.discountAmount) > 0 && (
              <div className="flex justify-between text-red-400 print:text-red-600">
                <span>Discount:</span>
                <span>-${Number(sale.discountAmount).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-300 print:text-gray-700">
              <span>Tax Amount:</span>
              <span>+${Number(sale.taxAmount).toFixed(2)}</span>
            </div>

            <div className="pt-2 border-t border-slate-700 print:border-gray-300 flex justify-between text-sm font-bold text-white print:text-black">
              <span>Total Amount:</span>
              <span className="text-white print:text-black font-black text-base">
                ${totalAmount.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-xs text-emerald-400 print:text-gray-800">
              <span>Total Paid:</span>
              <span className="font-bold">${totalPaid.toFixed(2)}</span>
            </div>

            {balanceRemaining > 0 && (
              <div className="flex justify-between text-xs text-amber-400 print:text-red-600 font-bold">
                <span>Balance Due:</span>
                <span>${balanceRemaining.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Payment History Table */}
        <div className="mt-8 pt-6 border-t border-slate-700/60 print:border-gray-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-gray-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-400" />
              <span>Payment History & Audit Trail</span>
            </span>
            <span className="text-[11px] text-slate-400 print:text-gray-600 font-mono">
              {sale.payments?.length || 0} transaction{sale.payments?.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden print:bg-white print:border-gray-300">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 print:border-gray-300 text-slate-400 print:text-gray-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Payment Method</th>
                  <th className="py-2.5 px-3">Transaction Reference</th>
                  <th className="py-2.5 px-3 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
                {sale.payments && sale.payments.length > 0 ? (
                  sale.payments.map((p) => (
                    <tr key={p.id} className="text-slate-200 print:text-gray-800">
                      <td className="py-2.5 px-3 font-mono text-slate-400 print:text-gray-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {new Date(p.paidAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-200 print:bg-transparent print:border-none print:text-black">
                          {getMethodIcon(p.paymentMethod)}
                          <span>{p.paymentMethod.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 print:text-gray-600">
                        {p.transactionRef || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 print:text-black">
                        ${Number(p.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-500 italic">
                      No payment records found for this sale.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment for ${sale.invoiceNumber}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex justify-between items-center text-xs">
            <span className="text-slate-400">Remaining Balance:</span>
            <span className="font-mono font-bold text-amber-400 text-sm">
              ${balanceRemaining.toFixed(2)}
            </span>
          </div>

          <FormField label="Payment Amount ($)" required>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={balanceRemaining}
              value={paymentAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
            />
          </FormField>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Payment Method *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE'] as PaymentMethod[]).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                    paymentMethod === method
                      ? 'bg-brand-600/20 border-brand-500 text-white'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {getMethodIcon(method)}
                  <span>{method.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          </div>

          <FormField label="Transaction Reference / Note (Optional)">
            <Input
              type="text"
              value={transactionRef}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransactionRef(e.target.value)}
              placeholder="e.g. CARD-AUTH-88192 or Bank Ref"
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingPayment}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all disabled:opacity-50"
            >
              {isSubmittingPayment ? 'Recording...' : 'Confirm & Save Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
