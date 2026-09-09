import React from 'react';
import { Loader2 } from 'lucide-react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/60 rounded-xl ${className}`} />;
}

interface LoadingStateProps {
  type?: 'card' | 'table' | 'full';
  rows?: number;
}

export function LoadingState({ type = 'card', rows = 5 }: LoadingStateProps) {
  if (type === 'full') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading SmartStock data...</p>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-24" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-6 w-1/5" />
            <Skeleton className="h-6 w-1/6" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
