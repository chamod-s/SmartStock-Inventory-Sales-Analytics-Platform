'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Lock, Mail, Loader2, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.post('/auth/login', values);
      if (response.data?.success && response.data?.data) {
        const { token, user } = response.data.data;
        login(token, user);
        router.push('/dashboard');
      } else {
        setErrorMessage(response.data?.message || 'Login failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Invalid email or password. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (email: string) => {
    setValue('email', email);
    setValue('password', 'Admin123!');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card Container */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 animate-fadeIn">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white font-black text-2xl shadow-xl shadow-brand-500/20 mb-4">
            S
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">SmartStock SaaS</h1>
          <p className="text-xs text-slate-400 mt-1">Smart Inventory & Sales Analytics Platform</p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Work Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                {...register('email')}
                type="email"
                placeholder="user@smartstock.com"
                className={`w-full bg-slate-950/80 text-slate-100 placeholder-slate-500 text-sm pl-10 pr-4 py-3 rounded-xl border transition-all ${
                  errors.email
                    ? 'border-red-500/60 focus:border-red-500'
                    : 'border-slate-800 hover:border-slate-700 focus:border-brand-500'
                } focus:outline-none`}
              />
            </div>
            {errors.email && <p className="text-xs text-red-400 font-medium mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <a href="#" className="text-[11px] text-brand-400 hover:underline">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••••••"
                className={`w-full bg-slate-950/80 text-slate-100 placeholder-slate-500 text-sm pl-10 pr-4 py-3 rounded-xl border transition-all ${
                  errors.password
                    ? 'border-red-500/60 focus:border-red-500'
                    : 'border-slate-800 hover:border-slate-700 focus:border-brand-500'
                } focus:outline-none`}
              />
            </div>
            {errors.password && <p className="text-xs text-red-400 font-medium mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In to Dashboard
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Quick Fill Actions */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Demo Account Quick Fill
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => fillDemoCredentials('admin@smartstock.com')}
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-[11px] font-semibold text-slate-300 transition-colors truncate"
            >
              👑 Admin
            </button>
            <button
              onClick={() => fillDemoCredentials('manager1@smartstock.com')}
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-[11px] font-semibold text-slate-300 transition-colors truncate"
            >
              👔 Manager
            </button>
            <button
              onClick={() => fillDemoCredentials('cashier1@smartstock.com')}
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-[11px] font-semibold text-slate-300 transition-colors truncate"
            >
              🛒 Cashier
            </button>
          </div>
        </div>
      </div>

      {/* Footer Copyright */}
      <p className="text-xs text-slate-500 mt-8 font-mono">
        SmartStock © 2026 • Encrypted JWT Authentication
      </p>
    </div>
  );
}
