'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge } from '../ui/StatusBadge';
import { Menu, Search, Bell, LogOut, User, ChevronDown } from 'lucide-react';

interface TopNavProps {
  onMenuToggle: () => void;
}

export function TopNav({ onMenuToggle }: TopNavProps) {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="h-16 bg-slate-900/80 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-slate-400 hover:text-slate-200 p-2 rounded-xl border border-slate-800 bg-slate-950/50"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative max-w-md w-full hidden sm:block">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products, invoices, customers (Ctrl+K)..."
            className="w-full bg-slate-950/60 text-slate-200 placeholder-slate-500 text-xs pl-10 pr-4 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>
      </div>

      {/* Right: Notifications & User Profile Menu */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button className="relative text-slate-400 hover:text-slate-200 p-2 rounded-xl border border-slate-800 bg-slate-950/50 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-slate-900" />
        </button>

        {/* User Profile Popover */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 p-1.5 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-800/80 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">{user?.name || 'User'}</p>
              <div className="flex items-center gap-1">
                <StatusBadge status={user?.role || 'CASHIER'} size="sm" />
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <>
              <div onClick={() => setShowProfileMenu(false)} className="fixed inset-0 z-40" />
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 py-2 animate-fadeIn">
                <div className="px-4 py-2.5 border-b border-slate-800">
                  <p className="text-xs font-bold text-slate-200 truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  <a
                    href="/settings"
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Account Settings
                  </a>
                </div>
                <div className="pt-1 border-t border-slate-800">
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors font-medium text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
