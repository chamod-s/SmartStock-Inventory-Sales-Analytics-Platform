'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import {
  Receipt,
  ArrowLeft,
  Printer,
  ShoppingBag,
  CreditCard,
  User,
  Calendar,
  CheckCircle2,
  Package,
  Building2,
  Clock,
  Plus,
} from 'lucide-react';
import { SaleDetail } from '@/types/sale';

export default function SaleInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { error: showError } = useToast();

  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saleId = params.id as string;

  useEffect(() => {
    async function fetchSaleDetails() {
      setIsLoading(true);
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
    }

    if (saleId) {
      fetchSaleDetails();
    }
  }, [saleId, showError]);

  const handlePrint = () => {
    window.print();
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

  const payment = sale.payments?.[0];
  const dateFormatted = new Date(sale.createdAt).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
            <h1 className="text-xl font-black text-white font-mono flex items-center gap-2">
              <Receipt className="w-5 h-5 text-brand-400" />
              <span>{sale.invoiceNumber}</span>
            </h1>
            <p className="text-xs text-slate-400">Transaction ID: {sale.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-brand-400" />
            <span>Print Invoice / Receipt</span>
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
            <div className="pt-1">
              <StatusBadge status={sale.status} />
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
              Payment & Cashier
            </span>
            <div className="text-slate-300 print:text-gray-700">
              Cashier: <span className="font-semibold text-white print:text-black">{sale.user?.name}</span>
            </div>
            <div className="text-slate-300 print:text-gray-700">
              Payment Method: <span className="font-semibold text-white print:text-black">{payment?.paymentMethod || 'CASH'}</span>
            </div>
            {payment?.transactionRef && (
              <div className="text-slate-400 print:text-gray-600 font-mono">
                Ref: {payment.transactionRef}
              </div>
            )}
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
              <span>Total Paid:</span>
              <span className="text-emerald-400 print:text-black font-black text-lg">
                ${Number(sale.totalAmount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
