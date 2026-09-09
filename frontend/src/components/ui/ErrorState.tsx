import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while fetching information from the server.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="p-6 bg-red-950/40 border border-red-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 my-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-red-300">{title}</h4>
          <p className="text-xs text-red-400/90 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold rounded-xl border border-red-500/30 transition-all flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
}
