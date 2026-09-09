'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { Save, Store, Shield, BellRing } from 'lucide-react';

export default function SettingsPage() {
  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      <PageHeader
        title="Store & Application Settings"
        description="Configure store branding, tax rates, receipt headers, and notification preferences."
        breadcrumbs={[{ label: 'Settings' }]}
        actions={
          <button className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        }
      />

      <div className="space-y-8 max-w-3xl">
        {/* Store Profile Section */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <div className="p-2.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-xl">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Store Profile</h3>
              <p className="text-xs text-slate-400">Basic information printed on receipts and invoices</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Store Name">
              <Input defaultValue="SmartStock Store 01" />
            </FormField>
            <FormField label="Tax Identification Number (TIN)">
              <Input defaultValue="TAX-99812401" />
            </FormField>
            <FormField label="Support Email">
              <Input defaultValue="support@smartstock.com" />
            </FormField>
            <FormField label="Currency Symbol">
              <Select defaultValue="USD">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </Select>
            </FormField>
          </div>
        </div>

        {/* Security & System Notifications */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <div className="p-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Security & Low-Stock Alerts</h3>
              <p className="text-xs text-slate-400">Automated notification thresholds</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Default Reorder Warning Threshold">
              <Input type="number" defaultValue="10" />
            </FormField>
            <FormField label="Session Inactivity Timeout (minutes)">
              <Input type="number" defaultValue="60" />
            </FormField>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
