'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { ProtectedRoute } from './ProtectedRoute';
import { ToastProvider } from '../ui/Toast';
import { UserRole } from '@/types/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function DashboardLayout({ children, allowedRoles }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <ToastProvider>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
          {/* Collapsible Sidebar */}
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Main Layout Content Area */}
          <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
            <TopNav onMenuToggle={() => setSidebarOpen(true)} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </ProtectedRoute>
  );
}
