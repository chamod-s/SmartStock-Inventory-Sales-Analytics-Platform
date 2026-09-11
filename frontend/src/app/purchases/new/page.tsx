'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  HelpCircle,
  Package,
  Layers,
  Save,
  AlertCircle,
} from 'lucide-react';

interface SupplierOption {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  purchasePrice: number | string;
  sellingPrice: number | string;
}

interface PurchaseLineItem {
  id: string; // temporary row key
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  currentStock: number;
  quantity: number;
  unitCost: number;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const { success, error: showError } = useToast();

  // Reference options
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields
  const [supplierId, setSupplierId] = useState<string>('');
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<'RECEIVED' | 'PENDING'>('RECEIVED');
  const [discount, setDiscount] = useState<number | string>(0);
  const [tax, setTax] = useState<number | string>(0);
  const [notes, setNotes] = useState<string>('');

  // Line Items
  const [items, setItems] = useState<PurchaseLineItem[]>([
    {
      id: `row-${Date.now()}`,
      productId: '',
      productName: '',
      sku: '',
      unit: 'pcs',
      currentStock: 0,
      quantity: 1,
      unitCost: 0,
    },
  ]);

  // Load suppliers and products
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoadingOptions(true);
        const [supRes, prodRes] = await Promise.all([
          api.get('/suppliers?limit=100'),
          api.get('/products?limit=200'),
        ]);

        if (supRes.data.success) {
          setSuppliers(supRes.data.data.items || []);
        }
        if (prodRes.data.success) {
          setProducts(prodRes.data.data.items || []);
        }
      } catch (err: any) {
        console.error('Failed to load options:', err);
        showError('Failed to load suppliers and products list');
      } finally {
        setIsLoadingOptions(false);
      }
    }
    loadData();
  }, [showError]);

  // Selected supplier details
  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === supplierId) || null;
  }, [suppliers, supplierId]);

  // Handle Product Change in row
  const handleProductChange = (rowId: string, selectedProdId: string) => {
    const prod = products.find((p) => p.id === selectedProdId);
    setItems((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            productId: selectedProdId,
            productName: prod?.name || '',
            sku: prod?.sku || '',
            unit: prod?.unit || 'pcs',
            currentStock: prod?.currentStock || 0,
            unitCost: prod ? Number(prod.purchasePrice) : 0,
          };
        }
        return row;
      })
    );
  };

  // Handle Quantity Change in row
  const handleQuantityChange = (rowId: string, val: string) => {
    const qty = parseInt(val, 10);
    setItems((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, quantity: isNaN(qty) ? 0 : Math.max(1, qty) } : row
      )
    );
  };

  // Handle Unit Cost Change in row
  const handleUnitCostChange = (rowId: string, val: string) => {
    const cost = parseFloat(val);
    setItems((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, unitCost: isNaN(cost) ? 0 : Math.max(0, cost) } : row
      )
    );
  };

  // Add Item Row
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: '',
        productName: '',
        sku: '',
        unit: 'pcs',
        currentStock: 0,
        quantity: 1,
        unitCost: 0,
      },
    ]);
  };

  // Remove Item Row
  const handleRemoveItem = (rowId: string) => {
    if (items.length <= 1) {
      showError('Purchase order must contain at least one item');
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Financial Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  }, [items]);

  const numDiscount = Number(discount) || 0;
  const numTax = Number(tax) || 0;
  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - numDiscount + numTax);
  }, [subtotal, numDiscount, numTax]);

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      showError('Please select a supplier');
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId) {
        showError(`Please select a product for line item #${i + 1}`);
        return;
      }
      if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        showError(`Quantity for product '${item.productName || item.sku}' must be a positive integer`);
        return;
      }
      if (item.unitCost < 0) {
        showError(`Unit cost for product '${item.productName || item.sku}' cannot be negative`);
        return;
      }
    }

    // Check duplicate products
    const productIds = items.map((i) => i.productId);
    if (new Set(productIds).size !== productIds.length) {
      showError('Duplicate products found in items list. Please consolidate quantities.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        supplierId,
        purchaseOrderNumber: purchaseOrderNumber.trim() || undefined,
        purchaseDate,
        status,
        discount: numDiscount,
        tax: numTax,
        subtotal,
        totalAmount: grandTotal,
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          subtotal: Number((item.quantity * item.unitCost).toFixed(2)),
        })),
      };

      const res = await api.post('/purchases', payload);
      if (res.data.success) {
        success('Purchase order created successfully!');
        const createdId = res.data.data.id;
        router.push(`/purchases/${createdId}`);
      }
    } catch (err: any) {
      console.error('Failed to create purchase:', err);
      showError(err.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      <PageHeader
        title="Create Purchase Order"
        description="Replenish stock levels, create supplier purchase orders, and record inventory receipts."
        breadcrumbs={[{ label: 'Purchases', href: '/purchases' }, { label: 'New Purchase' }]}
        actions={
          <Link
            href="/purchases"
            className="px-4 py-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-all text-xs font-semibold flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Purchases
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Card: Supplier & General Order Details */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-400" />
            Order Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Supplier Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                Supplier <span className="text-red-400">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                disabled={isLoadingOptions}
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Purchase Date */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                Purchase Date <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            {/* PO Number (Optional) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                PO Number
                <span className="text-xs text-slate-500 font-normal">(Auto-generated if blank)</span>
              </label>
              <input
                type="text"
                value={purchaseOrderNumber}
                onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                placeholder="e.g. PO-2026-0099"
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          {/* Supplier Preview Card (when selected) */}
          {selectedSupplier && (
            <div className="mt-4 p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Contact:</span>
                <span className="text-slate-300 font-medium">{selectedSupplier.contactPerson || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-300 font-medium">{selectedSupplier.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Phone:</span>
                <span className="text-slate-300 font-medium">{selectedSupplier.phone || 'N/A'}</span>
              </div>
            </div>
          )}

          {/* Receipt Status Selector */}
          <div className="mt-5 pt-5 border-t border-slate-800/80">
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Initial Order Status
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <button
                type="button"
                onClick={() => setStatus('RECEIVED')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  status === 'RECEIVED'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/30'
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 mt-0.5 ${status === 'RECEIVED' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <div>
                  <div className="font-semibold text-sm text-slate-200">Received (Immediate Stock In)</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Automatically credits product stock and logs inventory transactions immediately.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatus('PENDING')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  status === 'PENDING'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/30'
                }`}
              >
                <Clock className={`w-5 h-5 mt-0.5 ${status === 'PENDING' ? 'text-amber-400' : 'text-slate-500'}`} />
                <div>
                  <div className="font-semibold text-sm text-slate-200">Pending Order</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Places order without altering stock. Stock will be received when goods arrive.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Middle Card: Products Line Items */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-brand-400" />
              Purchase Items
            </h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 border border-brand-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Product
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3 w-5/12">Product</th>
                  <th className="py-3 px-3 w-2/12">Current Stock</th>
                  <th className="py-3 px-3 w-2/12">Quantity</th>
                  <th className="py-3 px-3 w-2/12">Unit Cost ($)</th>
                  <th className="py-3 px-3 w-2/12 text-right">Subtotal ($)</th>
                  <th className="py-3 px-3 w-1/12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {items.map((item, index) => {
                  const lineSubtotal = (item.quantity * item.unitCost).toFixed(2);

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/20">
                      {/* Product Selector */}
                      <td className="py-3 px-3">
                        <select
                          value={item.productId}
                          onChange={(e) => handleProductChange(item.id, e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} [{p.sku}]
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-3 text-xs text-slate-400">
                        {item.productId ? (
                          <span className="font-mono bg-slate-800 px-2 py-1 rounded-md text-slate-300">
                            {item.currentStock} {item.unit}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Quantity Input */}
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          required
                          className="w-28 px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                        />
                      </td>

                      {/* Unit Cost Input */}
                      <td className="py-3 px-3">
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(e) => handleUnitCostChange(item.id, e.target.value)}
                            required
                            className="w-full pl-7 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                          />
                        </div>
                      </td>

                      {/* Line Subtotal */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-100">
                        ${lineSubtotal}
                      </td>

                      {/* Delete Row Button */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={items.length <= 1}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:bg-transparent"
                          title="Remove Line Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Section: Notes and Financial Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Notes Card */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <h3 className="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-400" />
              Notes & Reference Details
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Add any special supplier instructions, invoice numbers, shipment tracking, or delivery notes.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="e.g. Supplier Invoice #INV-8891. Goods received in good condition via courier."
              className="w-full p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Financial Totals Card */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-brand-400" />
              Cost Breakdown
            </h3>

            <div className="space-y-3.5">
              {/* Subtotal */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Items Subtotal:</span>
                <span className="font-mono font-bold text-slate-200">
                  ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-400">Order Discount:</span>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">
                    -$
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 text-right focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              {/* Tax */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-400">Tax / Freight:</span>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">
                    +$
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 text-right focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-base font-bold text-slate-100">Grand Total:</span>
                <span className="text-xl font-mono font-extrabold text-emerald-400">
                  ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <Link
                href="/purchases"
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving Order...' : status === 'RECEIVED' ? 'Save & Receive Stock' : 'Create Purchase Order'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
