'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { FormField, Input } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import {
  FileText,
  ArrowLeft,
  Printer,
  Download,
  Receipt,
  CreditCard,
  Banknote,
  Building,
  Globe,
  DollarSign,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  Mail,
  Phone,
} from 'lucide-react';
import { InvoiceDetails } from '@/types/invoice';
import { PaymentMethod } from '@/types/sale';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { error: showError, success: showSuccess } = useToast();

  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Record Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const invoiceId = params.id as string;

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoices/${invoiceId}`);
      if (res.data?.data) {
        setInvoice(res.data.data);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to load commercial invoice details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      setIsLoading(true);
      fetchInvoice();
    }
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!invoice) return;
    try {
      const res = await api.get(`/invoices/${invoice.id}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.invoiceNumber}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess(`Invoice ${invoice.invoiceNumber} downloaded successfully`);
    } catch (err: any) {
      showError('Failed to download invoice file');
    }
  };

  const handleOpenPaymentModal = () => {
    if (!invoice) return;
    setPaymentAmount(invoice.balanceRemaining.toString());
    setPaymentMethod('CASH');
    setTransactionRef('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showError('Payment amount must be greater than zero');
      return;
    }

    if (amt > invoice.balanceRemaining + 0.001) {
      showError(`Payment cannot exceed the remaining balance of $${invoice.balanceRemaining.toFixed(2)}`);
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await api.post('/payments', {
        saleId: invoice.id,
        amount: amt,
        paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
      });

      showSuccess(`Payment of $${amt.toFixed(2)} recorded successfully`);
      setIsPaymentModalOpen(false);
      await fetchInvoice();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const getMethodIcon = (method: string) => {
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

  if (isLoading) {
    return (
      <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
        <div className="py-20">
          <LoadingState message="Loading official invoice document..." />
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
        <div className="py-20 text-center space-y-4">
          <FileText className="w-12 h-12 text-slate-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Invoice Not Found</h2>
          <p className="text-xs text-slate-400">The requested invoice document does not exist.</p>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Invoices</span>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const b = invoice.business;

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
      {/* Top Action Bar (hidden on print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white font-mono flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-400" />
                <span>{invoice.invoiceNumber}</span>
              </h1>
              <StatusBadge status={invoice.status} size="sm" />
              <StatusBadge status={invoice.paymentStatus} size="sm" />
            </div>
            <p className="text-xs text-slate-400">Reference Sale ID: {invoice.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {invoice.balanceRemaining > 0 && invoice.status === 'COMPLETED' && (
            <button
              onClick={handleOpenPaymentModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              <span>Record Payment (${invoice.balanceRemaining.toFixed(2)})</span>
            </button>
          )}

          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-brand-400" />
            <span>Download HTML</span>
          </button>

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

      {/* Printable Invoice Container */}
      <div className="max-w-4xl mx-auto bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 sm:p-10 shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Header Block: Business Info & Invoice Meta */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-700/60 print:border-gray-200">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-black text-base print:bg-black print:text-white">
                S
              </div>
              <div>
                <span className="text-xl font-black tracking-wider text-white print:text-black uppercase block">
                  {b.name}
                </span>
                <span className="text-[11px] text-brand-400 print:text-gray-600 font-medium">
                  {b.legalName}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-400 print:text-gray-600 mt-3 space-y-0.5">
              <div>{b.address}</div>
              <div className="flex items-center gap-3">
                <span>Phone: {b.phone}</span>
                <span>&bull;</span>
                <span>Email: {b.email}</span>
              </div>
              <div className="font-mono text-slate-500 print:text-gray-500">
                Tax Registration ID: {b.taxId} &bull; {b.website}
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-gray-500 block">
              Official Commercial Invoice
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-brand-400 print:text-black tracking-tight">
              {invoice.invoiceNumber}
            </div>
            <div className="text-xs font-mono text-slate-300 print:text-gray-700">
              Date: {invoice.formattedDate}
            </div>
            <div className="pt-1.5 flex items-center gap-2 sm:justify-end">
              <StatusBadge status={invoice.status} />
              <StatusBadge status={invoice.paymentStatus} />
            </div>
          </div>
        </div>

        {/* 2-Column Details: Customer / Billed To & Cashier / Station */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-700/60 print:border-gray-200 text-xs">
          <div className="bg-slate-900/30 print:bg-transparent rounded-2xl p-4 border border-slate-800/60 print:border-none print:p-0">
            <span className="text-[11px] font-bold text-slate-400 print:text-gray-500 uppercase tracking-wider block mb-2">
              Customer / Billed To
            </span>
            <div className="text-base font-bold text-white print:text-black">
              {invoice.customer.name}
            </div>
            <div className="text-slate-400 print:text-gray-600 space-y-0.5 mt-1 font-mono">
              <div>Customer Code: {invoice.customer.code}</div>
              {invoice.customer.email && <div>Email: {invoice.customer.email}</div>}
              {invoice.customer.phone && <div>Phone: {invoice.customer.phone}</div>}
            </div>
          </div>

          <div className="bg-slate-900/30 print:bg-transparent rounded-2xl p-4 border border-slate-800/60 print:border-none print:p-0 sm:text-right">
            <span className="text-[11px] font-bold text-slate-400 print:text-gray-500 uppercase tracking-wider block mb-2">
              Fulfillment & Cashier
            </span>
            <div className="text-base font-bold text-white print:text-black">
              {invoice.cashier.name}
            </div>
            <div className="text-slate-400 print:text-gray-600 space-y-0.5 mt-1 font-mono">
              <div>User Role: {invoice.cashier.role}</div>
              <div>POS Terminal: Station 01 &bull; Status: {invoice.status}</div>
              <div>Payment Summary: {invoice.paymentMethod}</div>
            </div>
          </div>
        </div>

        {/* Products Line Items Table */}
        <div className="py-6">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-500">
            Purchased Products & Services
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700 print:border-gray-300 text-slate-400 print:text-gray-600 font-semibold uppercase text-[10px] tracking-wider bg-slate-900/40 print:bg-transparent">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Product Description</th>
                <th className="py-2.5 px-3 font-mono">SKU</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-gray-200">
              {invoice.items.map((item, index) => (
                <tr key={item.id} className="text-slate-200 print:text-gray-800">
                  <td className="py-3 px-3 font-mono text-slate-500">{index + 1}</td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-white print:text-black block text-sm">
                      {item.productName}
                    </span>
                    <span className="text-[10px] text-slate-400 print:text-gray-500">
                      Category: {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400 print:text-gray-600">
                    {item.sku}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    ${item.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white print:text-black">
                    ${item.subtotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoice Summary Totals & Payments */}
        <div className="pt-4 border-t border-slate-700/60 print:border-gray-300 flex flex-col sm:flex-row justify-between gap-6 text-xs">
          <div className="max-w-xs space-y-4">
            {/* Payment Method Breakdown */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-500 block mb-2">
                Settled Payment Records
              </span>

              {invoice.payments.length > 0 ? (
                <div className="space-y-2">
                  {invoice.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-slate-900/50 print:bg-gray-100 border border-slate-800 print:border-none flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {getMethodIcon(p.paymentMethod)}
                        <div>
                          <span className="font-semibold text-white print:text-black block">
                            {p.paymentMethod.replace('_', ' ')}
                          </span>
                          {p.transactionRef && (
                            <span className="text-[10px] text-slate-400 print:text-gray-600 font-mono block">
                              Ref: {p.transactionRef}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 print:text-black text-sm">
                        ${p.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-amber-400 italic">No payments have been recorded for this invoice.</div>
              )}
            </div>

            {invoice.notes && (
              <div>
                <span className="font-semibold block text-slate-300 print:text-gray-800 mb-1">
                  Customer Notes:
                </span>
                <p className="italic text-slate-400 print:text-gray-600">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Totals Computation Card */}
          <div className="w-full sm:w-72 space-y-2.5 font-mono bg-slate-900/30 print:bg-transparent rounded-2xl p-4 border border-slate-800/60 print:border-none print:p-0">
            <div className="flex justify-between text-slate-300 print:text-gray-700">
              <span>Subtotal:</span>
              <span className="font-semibold">${invoice.subtotal.toFixed(2)}</span>
            </div>

            {invoice.discount > 0 && (
              <div className="flex justify-between text-red-400 print:text-red-600">
                <span>Discount:</span>
                <span>-${invoice.discount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-300 print:text-gray-700">
              <span>Tax (8%):</span>
              <span>+${invoice.tax.toFixed(2)}</span>
            </div>

            <div className="pt-2.5 border-t border-slate-700 print:border-gray-300 flex justify-between text-sm font-bold text-white print:text-black">
              <span>Total Invoiced:</span>
              <span className="text-white print:text-black font-black text-lg">
                ${invoice.total.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-xs text-emerald-400 print:text-gray-800 font-semibold">
              <span>Total Paid:</span>
              <span>${invoice.totalPaid.toFixed(2)}</span>
            </div>

            {invoice.balanceRemaining > 0 && (
              <div className="flex justify-between text-xs text-amber-400 print:text-red-600 font-bold pt-1 border-t border-slate-800 print:border-gray-200">
                <span>Balance Due:</span>
                <span>${invoice.balanceRemaining.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Terms of Service & Barcode simulation footer */}
        <div className="mt-10 pt-6 border-t border-slate-700/60 print:border-gray-300 text-center space-y-2">
          <p className="text-[11px] text-slate-400 print:text-gray-600 max-w-xl mx-auto">
            {b.terms}
          </p>
          <div className="font-mono text-[10px] text-slate-500 print:text-gray-500">
            * * * INVOICE VALIDATED &bull; SYSTEM RECORD {invoice.id} * * *
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment for ${invoice.invoiceNumber}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex justify-between items-center text-xs">
            <span className="text-slate-400">Remaining Balance:</span>
            <span className="font-mono font-bold text-amber-400 text-sm">
              ${invoice.balanceRemaining.toFixed(2)}
            </span>
          </div>

          <FormField label="Payment Amount ($)" required>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={invoice.balanceRemaining}
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
