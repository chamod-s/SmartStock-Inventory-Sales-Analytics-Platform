'use client';

import React, { useState } from 'react';
import { 
  Package, 
  BarChart3, 
  ShieldCheck, 
  TrendingUp, 
  Activity, 
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    message: string;
    timestamp?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkBackendHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/health');
      setHealthStatus(response.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reach API server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Package className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              SmartStock
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Phase 1: Initialized
            </span>
            <a href="/login" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition">
              Sign In
            </a>
            <a href="/dashboard" className="px-4 py-2 text-sm font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-md hover:shadow-sky-500/25 transition">
              Open Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-sm mb-8">
          <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
          <span>Platform Architecture Ready</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Smart Inventory & <br />
          <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Sales Analytics Platform
          </span>
        </h1>

        <p className="mt-6 text-lg text-slate-400 max-w-2xl">
          An enterprise-grade SaaS application featuring real-time stock control, atomic POS database transactions, automated invoicing, and high-performance sales intelligence.
        </p>

        {/* Action Buttons & Health Checker */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={checkBackendHealth}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold rounded-xl bg-slate-900 border border-slate-700 hover:border-sky-500 text-slate-200 hover:text-white flex items-center justify-center space-x-2 transition shadow-lg"
          >
            {loading ? (
              <Activity className="h-4 w-4 animate-spin text-sky-400" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-sky-400" />
            )}
            <span>Test API Health Endpoint</span>
          </button>
          <button className="w-full sm:w-auto px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white flex items-center justify-center space-x-2 transition shadow-lg shadow-sky-500/20">
            <span>Explore Roadmap</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* API Health Response Display */}
        {healthStatus && (
          <div className="mt-8 p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-left max-w-md w-full animate-fadeIn">
            <div className="flex items-center space-x-2 text-emerald-400 text-sm font-semibold mb-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Backend Connected Successfully</span>
            </div>
            <pre className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-lg overflow-x-auto">
              {JSON.stringify(healthStatus, null, 2)}
            </pre>
          </div>
        )}

        {error && (
          <div className="mt-8 p-4 rounded-xl bg-slate-900/80 border border-rose-500/30 text-left max-w-md w-full">
            <div className="flex items-center space-x-2 text-rose-400 text-sm font-semibold mb-1">
              <AlertCircle className="h-4 w-4" />
              <span>API Connection Status</span>
            </div>
            <p className="text-xs text-slate-400">
              Backend API offline or starting up on port 5000. Start backend using <code className="text-sky-400 font-mono">cd backend && npm run dev</code>.
            </p>
          </div>
        )}

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition">
            <div className="h-10 w-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 mb-4">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">Strict Inventory Tracking</h3>
            <p className="mt-2 text-sm text-slate-400">
              Guaranteed stock integrity with non-negative constraints and full audit transaction trails.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">POS & Atomic Checkout</h3>
            <p className="mt-2 text-sm text-slate-400">
              High-speed cart management powered by PostgreSQL database transactions.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">Business Intelligence</h3>
            <p className="mt-2 text-sm text-slate-400">
              Interactive revenue analytics, product performance trends, and demand forecasting modules.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/30 text-center py-6 text-xs text-slate-500">
        SmartStock SaaS Architecture &copy; {new Date().getFullYear()} – Production Portfolio Project
      </footer>
    </div>
  );
}
