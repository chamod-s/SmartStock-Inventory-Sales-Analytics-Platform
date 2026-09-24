'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/auth';
import {
  LayoutDashboard,
  Package,
  Tags,
  Truck,
  Users,
  ShoppingCart,
  Receipt,
  Boxes,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  UserCog,
  Settings,
  ShieldCheck,
  CreditCard,
  FileText,
  X,
} from 'lucide-react';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const sidebarNavItems: SidebarItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['ADMIN', 'MANAGER', 'CASHIER'],
  },
  {
    label: 'Sales & POS',
    href: '/sales',
    icon: <Receipt className="w-5 h-5" />,
    roles: ['ADMIN', 'MANAGER', 'CASHIER'],
  },
  {
    label: 'Payments',
    href: '/payments',
    icon: <CreditCard className="w-5 h-5" />,
    roles: ['ADMIN', 'MANAGER', 'CASHIER'],
  },
  {
    label: 'Invoices',
    href: '/invoices',
    icon: <FileText className="w-5 h-5" />,
    roles: ['ADMIN', 'MANAGER', 'CASHIER'],
  },
  {
    label: 'Products Catalog',
    href: '/products',
    icon: <Package className="w-5 h-5" />,
    roles: ['ADMIN', 'MANAGER', 'CASHIER'],
  },
  {
    label: 'Categories',
    href: '/categories',
    icon: <Tags className="w-5 h-5" />,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'Inventory',
    href: '/inventory',
    icon: <Boxes className="w-5 h-5" />,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'Purchases',
    href: '/purchases',
    icon: <ShoppingCart className="w-5 h-5" />,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'Suppliers',
    href: '/suppliers',
    icon: <Truck className="w-5 h-5" />,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'Customers',
    href: '/customers',
    icon: <Users className="w-5 h-5" />,
    roles: ['ADMIN', 'MANAGER', 'CASHIER'],
  },
  {
    label: 'Expenses',
    href: '/expenses',
    icon: <DollarSign className="w-5 h-5" />,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: <TrendingUp className="w-5 h-5" />,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'User Management',
    href: '/users',
    icon: <UserCog className="w-5 h-5" />,
    roles: ['ADMIN'],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="w-5 h-5" />,
    roles: ['ADMIN', 'MANAGER'],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const userRole = user?.role || 'CASHIER';

  const filteredNavItems = sidebarNavItems.filter((item) => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden animate-fadeIn"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              S
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white">
                Smart<span className="text-brand-400">Stock</span>
              </span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">v1.0 SaaS</span>
              </div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Navigation Menu ({userRole})
          </div>
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <span className={isActive ? 'text-brand-400' : 'text-slate-500'}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Bottom Role Info Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-850 border border-slate-800">
            <div className="p-2 rounded-lg bg-slate-800 text-brand-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.name || 'SmartStock User'}</p>
              <p className="text-[10px] text-slate-400 capitalize truncate">{userRole.toLowerCase()} Mode</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
