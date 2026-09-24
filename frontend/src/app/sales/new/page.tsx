'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Check,
  CreditCard,
  Banknote,
  Building2,
  Globe,
  User,
  ArrowLeft,
  X,
  Package,
  Boxes,
  Barcode,
  Sparkles,
  Printer,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Receipt,
  CheckCircle2,
  ShoppingBag,
} from 'lucide-react';
import { CartItem, PaymentMethod } from '@/types/sale';

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  reorderLevel: number;
  status: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface CustomerOption {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export default function PosRegisterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error: showError, info } = useToast();

  // Data
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Checkout State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walk-in');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [taxRatePercent, setTaxRatePercent] = useState<string>('8.0'); // Default 8% tax
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [tenderedAmount, setTenderedAmount] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Post-sale completion modal
  const [completedSale, setCompletedSale] = useState<any | null>(null);

  // Load initial products, categories, customers
  useEffect(() => {
    async function loadPosData() {
      setIsLoading(true);
      try {
        const [prodRes, catRes, custRes] = await Promise.all([
          api.get('/products?limit=100&status=ACTIVE'),
          api.get('/categories?limit=100&status=active'),
          api.get('/customers?limit=100'),
        ]);

        if (prodRes.data?.data?.items) {
          setProducts(prodRes.data.data.items);
        }
        if (catRes.data?.data?.items) {
          setCategories(catRes.data.data.items);
        }
        if (custRes.data?.data?.items) {
          setCustomers(custRes.data.data.items);
        }
      } catch (err) {
        showError('Failed to initialize POS register catalog');
      } finally {
        setIsLoading(false);
      }
    }
    loadPosData();
  }, [showError]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'all' || p.category?.id === selectedCategory;
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [products, searchQuery, selectedCategory]);

  // Add Product to Cart
  const addToCart = (product: ProductItem) => {
    if (product.currentStock <= 0) {
      showError(`"${product.name}" is out of stock!`);
      return;
    }

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((item) => item.productId === product.id);

      if (existingIdx > -1) {
        const existing = prevCart[existingIdx];
        if (existing.quantity >= product.currentStock) {
          showError(`Cannot add more than available stock (${product.currentStock} ${product.unit})`);
          return prevCart;
        }

        const newQty = existing.quantity + 1;
        const updated = [...prevCart];
        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          subtotal: Number((newQty * existing.unitPrice).toFixed(2)),
        };
        return updated;
      } else {
        const unitPrice = Number(product.sellingPrice);
        const unitCost = Number(product.purchasePrice);
        return [
          ...prevCart,
          {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            currentStock: product.currentStock,
            unitPrice,
            unitCost,
            quantity: 1,
            subtotal: unitPrice,
          },
        ];
      }
    });
  };

  // Update Cart Quantity
  const updateQuantity = (productId: string, newQty: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.productId === productId) {
            if (newQty <= 0) return null;
            if (newQty > item.currentStock) {
              showError(`Cannot exceed available stock (${item.currentStock} ${item.unit})`);
              return item;
            }
            return {
              ...item,
              quantity: newQty,
              subtotal: Number((newQty * item.unitPrice).toFixed(2)),
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((it) => it.productId !== productId));
  };

  // Clear cart
  const clearCart = () => {
    if (cart.length > 0) {
      setCart([]);
      info('Cart cleared');
    }
  };

  // Financial Calculations
  const subtotal = useMemo(() => {
    return Number(cart.reduce((acc, it) => acc + it.subtotal, 0).toFixed(2));
  }, [cart]);

  const discountAmount = useMemo(() => {
    const rawVal = parseFloat(discountValue) || 0;
    if (rawVal <= 0) return 0;
    if (discountType === 'percent') {
      return Number(((subtotal * Math.min(100, rawVal)) / 100).toFixed(2));
    }
    return Number(Math.min(subtotal, rawVal).toFixed(2));
  }, [subtotal, discountType, discountValue]);

  const taxAmount = useMemo(() => {
    const rate = parseFloat(taxRatePercent) || 0;
    if (rate <= 0) return 0;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    return Number(((taxableAmount * rate) / 100).toFixed(2));
  }, [subtotal, discountAmount, taxRatePercent]);

  const totalAmount = useMemo(() => {
    return Math.max(0, Number((subtotal - discountAmount + taxAmount).toFixed(2)));
  }, [subtotal, discountAmount, taxAmount]);

  // Cash Change calculation
  const changeDue = useMemo(() => {
    if (paymentMethod !== 'CASH') return 0;
    const tendered = parseFloat(tenderedAmount) || 0;
    return Math.max(0, Number((tendered - totalAmount).toFixed(2)));
  }, [paymentMethod, tenderedAmount, totalAmount]);

  // Quick Cash Tender helper
  const handleQuickTender = (amount: number) => {
    setTenderedAmount(String(amount));
  };

  // Submit POS Checkout
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      showError('Cart is empty. Please add products before checking out.');
      return;
    }

    // Verify stock availability once more
    for (const item of cart) {
      if (item.quantity > item.currentStock) {
        showError(`Insufficient stock for "${item.name}". Requested ${item.quantity}, available ${item.currentStock}.`);
        return;
      }
    }

    if (paymentMethod === 'CASH') {
      const tendered = parseFloat(tenderedAmount);
      if (isNaN(tendered) || tendered < totalAmount) {
        showError(`Tendered cash ($${isNaN(tendered) ? 0 : tendered}) cannot be less than Total Due ($${totalAmount.toFixed(2)})`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId === 'walk-in' ? null : selectedCustomerId,
        items: cart.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
        discountAmount,
        taxAmount,
        paymentMethod,
        amountPaid: paymentMethod === 'CASH' && tenderedAmount ? parseFloat(tenderedAmount) : totalAmount,
        transactionRef: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await api.post('/sales', payload);

      if (res.data?.success && res.data?.data) {
        const created = res.data.data;
        success(`Sale ${created.invoiceNumber} completed successfully!`);
        setCompletedSale(created);

        // Update local products stock
        setProducts((prev) =>
          prev.map((p) => {
            const cartItem = cart.find((c) => c.productId === p.id);
            if (cartItem) {
              return { ...p, currentStock: p.currentStock - cartItem.quantity };
            }
            return p;
          })
        );

        // Reset cart
        setCart([]);
        setTenderedAmount('');
        setTransactionRef('');
        setNotes('');
        setDiscountValue('0');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Checkout failed. Please check stock and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
      {/* Top POS Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/sales"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 transition-colors"
            title="Back to Sales History"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-400" />
              <span>Point of Sale Register</span>
            </h1>
            <p className="text-xs text-slate-400">
              Terminal Active &bull; Cashier: <span className="text-slate-200 font-semibold">{user?.name || 'Operator'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/40 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Cart</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Catalog (Left) + Cart & Checkout (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================== */}
        {/* LEFT / CENTER: PRODUCT CATALOG & SEARCH (7 COLS) */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Filter */}
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Scan Barcode or Search by Name / SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/70 border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 bg-slate-900/70 border border-slate-700/60 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="all">All Categories ({products.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Grid */}
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 min-h-[500px]">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Loading product catalog...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Package className="w-12 h-12 stroke-[1.2]" />
                <p className="text-sm font-semibold text-slate-400">No products found</p>
                <p className="text-xs text-slate-500">Try adjusting your search query or category filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.currentStock <= 0;
                  const isLowStock = p.currentStock <= p.reorderLevel && p.currentStock > 0;
                  const inCartQty = cart.find((it) => it.productId === p.id)?.quantity || 0;

                  return (
                    <button
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p)}
                      disabled={isOutOfStock}
                      className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between relative group ${
                        isOutOfStock
                          ? 'bg-slate-900/30 border-slate-800 opacity-50 cursor-not-allowed'
                          : 'bg-slate-900/60 border-slate-700/60 hover:border-brand-500/60 hover:bg-slate-800/80 hover:shadow-lg hover:shadow-brand-500/10'
                      }`}
                    >
                      {/* Active In-Cart Badge */}
                      {inCartQty > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white font-mono font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                          {inCartQty}
                        </span>
                      )}

                      <div>
                        {/* Header SKU & Category */}
                        <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-400 mb-1.5">
                          <span className="truncate">{p.sku}</span>
                          <span className="truncate text-slate-500">{p.category?.name}</span>
                        </div>

                        {/* Name */}
                        <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white line-clamp-2 leading-tight">
                          {p.name}
                        </h4>
                      </div>

                      {/* Price & Stock Status Footer */}
                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-end justify-between">
                        <div>
                          <div className="text-sm font-black text-emerald-400 font-mono">
                            ${Number(p.sellingPrice).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            per {p.unit}
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              isOutOfStock
                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                : isLowStock
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isOutOfStock ? '0 stock' : `${p.currentStock} left`}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT: CART, FINANCIALS & PAYMENT (5 COLS) */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-2xl flex flex-col space-y-4">
          {/* Customer Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand-400" />
                <span>Customer</span>
              </label>
              <button
                type="button"
                onClick={() => setSelectedCustomerId('walk-in')}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg transition-colors ${
                  selectedCustomerId === 'walk-in'
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; Walk-In Customer
              </button>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/70 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="walk-in">Default Walk-In Customer</option>
              {customers
                .filter((c) => c.code !== 'CUST-WALKIN')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) {c.phone ? `&bull; ${c.phone}` : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* Cart Items List */}
          <div className="border border-slate-700/60 rounded-xl bg-slate-900/60 overflow-hidden flex flex-col">
            <div className="px-3.5 py-2.5 bg-slate-800/60 border-b border-slate-700/60 flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-brand-400" />
                <span>Cart Order ({cart.length})</span>
              </span>
              <span>Subtotal</span>
            </div>

            <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-800 p-2 space-y-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Cart is empty. Click items from catalog to add.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.productId} className="py-2 px-2 flex items-center justify-between gap-3 group">
                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                        <span>${item.unitPrice.toFixed(2)} each</span>
                        <span>&bull;</span>
                        <span className="text-slate-500">Max: {item.currentStock}</span>
                      </div>
                    </div>

                    {/* Stepper Quantity */}
                    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700/60">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.currentStock}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) updateQuantity(item.productId, val);
                        }}
                        className="w-8 text-center bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                      />
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.currentStock}
                        className="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="w-16 text-right font-mono font-bold text-xs text-slate-100">
                      ${item.subtotal.toFixed(2)}
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-slate-500 hover:text-red-400 p-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pricing & Discounts Breakdown */}
          <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 text-xs">
            {/* Subtotal */}
            <div className="flex items-center justify-between text-slate-300">
              <span>Subtotal</span>
              <span className="font-mono font-bold text-slate-100">${subtotal.toFixed(2)}</span>
            </div>

            {/* Discount Row */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1">
                <span>Discount</span>
                <button
                  type="button"
                  onClick={() => setDiscountType(discountType === 'amount' ? 'percent' : 'amount')}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-brand-300 border border-slate-700"
                >
                  {discountType === 'amount' ? '$' : '%'}
                </button>
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-right font-mono text-xs text-slate-100 focus:outline-none"
                />
                <span className="text-red-400 font-mono w-16 text-right">
                  -${discountAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Tax Row */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1">
                <span>Tax Rate</span>
              </span>
              <div className="flex items-center gap-1">
                <div className="flex items-center">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={taxRatePercent}
                    onChange={(e) => setTaxRatePercent(e.target.value)}
                    className="w-14 px-2 py-1 bg-slate-800 border border-slate-700 rounded-l text-right font-mono text-xs text-slate-100 focus:outline-none"
                  />
                  <span className="px-1.5 py-1 bg-slate-700 text-slate-300 text-[10px] rounded-r border border-l-0 border-slate-700 font-mono">
                    %
                  </span>
                </div>
                <span className="text-slate-300 font-mono w-16 text-right">
                  +${taxAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Total Due</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                ${totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all ${
                  paymentMethod === 'CARD'
                    ? 'bg-brand-600/20 text-brand-300 border-brand-500/50 shadow-md shadow-brand-500/10'
                    : 'bg-slate-900/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-900/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('ONLINE')}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all ${
                  paymentMethod === 'ONLINE'
                    ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Online</span>
              </button>
            </div>
          </div>

          {/* Cash Change & Quick Denominations */}
          {paymentMethod === 'CASH' && (
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">Tendered Cash:</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={totalAmount}
                    placeholder={totalAmount.toFixed(2)}
                    value={tenderedAmount}
                    onChange={(e) => setTenderedAmount(e.target.value)}
                    className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-right font-mono text-xs font-bold text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickTender(totalAmount)}
                  className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono border border-slate-700/60"
                >
                  Exact
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTender(Math.ceil(totalAmount / 10) * 10 || 10)}
                  className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono border border-slate-700/60"
                >
                  ${Math.ceil(totalAmount / 10) * 10 || 10}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTender(50)}
                  className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono border border-slate-700/60"
                >
                  $50
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTender(100)}
                  className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono border border-slate-700/60"
                >
                  $100
                </button>
              </div>

              {/* Change Display */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800 font-mono">
                <span className="text-slate-400">Change Due:</span>
                <span className="text-sm font-black text-brand-400">
                  ${changeDue.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Reference input for Card / Transfer */}
          {paymentMethod !== 'CASH' && (
            <input
              type="text"
              placeholder="Authorization Code / Reference #"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/70 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            />
          )}

          {/* Checkout Button */}
          <button
            type="button"
            onClick={handleCompleteSale}
            disabled={isSubmitting || cart.length === 0}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing Checkout...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span>Complete Sale (${totalAmount.toFixed(2)})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Post-Sale Success Celebration & Print Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full mx-auto flex items-center justify-center border border-emerald-500/30">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">Sale Completed!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Invoice <span className="font-mono text-brand-400 font-bold">{completedSale.invoiceNumber}</span> was successfully issued.
              </p>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 font-mono text-xs space-y-1.5 text-left">
              <div className="flex justify-between text-slate-300">
                <span>Total Amount:</span>
                <span className="font-bold text-emerald-400">${Number(completedSale.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Payment Method:</span>
                <span>{completedSale.payments?.[0]?.paymentMethod || paymentMethod}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Customer:</span>
                <span>{completedSale.customer?.name || 'Walk-in Customer'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setCompletedSale(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                New Order
              </button>
              <Link
                href={`/sales/${completedSale.id}`}
                className="flex-1 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>View Invoice</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
