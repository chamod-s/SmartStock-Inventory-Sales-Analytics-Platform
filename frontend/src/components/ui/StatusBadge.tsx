import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'role' | 'status' | 'payment' | 'transaction';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, type = 'status', size = 'md' }: StatusBadgeProps) {
  const normalized = status?.toUpperCase() || 'UNKNOWN';

  const styles: Record<string, string> = {
    // Roles
    ADMIN: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    MANAGER: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    CASHIER: 'bg-sky-500/10 text-sky-400 border-sky-500/30',

    // Statuses
    ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    INACTIVE: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    RECEIVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/30',
    REFUNDED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    DISCONTINUED: 'bg-slate-700/50 text-slate-400 border-slate-600',

    // Payments
    CASH: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    CARD: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    BANK_TRANSFER: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    ONLINE: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    PAID: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    PARTIALLY_PAID: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    UNPAID: 'bg-rose-500/15 text-rose-400 border-rose-500/30',

    // Stock Statuses
    IN_STOCK: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'IN STOCK': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    LOW_STOCK: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'LOW STOCK': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    OUT_OF_STOCK: 'bg-red-500/15 text-red-400 border-red-500/30',
    'OUT OF STOCK': 'bg-red-500/15 text-red-400 border-red-500/30',

    // Transactions
    PURCHASE: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    SALE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    RETURN: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    DAMAGE: 'bg-red-500/10 text-red-400 border-red-500/30',
    ADJUSTMENT: 'bg-purple-500/10 text-purple-400 border-purple-500/30',

    // Customer Segments
    VIP: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    LOYAL: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    NEW: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    AT_RISK: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    'AT RISK': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    OCCASIONAL: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    PROSPECT: 'bg-slate-700/50 text-slate-400 border-slate-600',
    WALK_IN: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    'WALK IN': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  };

  const currentStyle = styles[normalized] || 'bg-slate-800 text-slate-300 border-slate-700';
  const sizeStyle = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center rounded-lg border font-mono tracking-wide ${sizeStyle} ${currentStyle}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {normalized.replace('_', ' ')}
    </span>
  );
}
