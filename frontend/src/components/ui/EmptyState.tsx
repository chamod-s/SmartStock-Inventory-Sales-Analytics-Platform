import React from 'react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title = 'No records found',
  description = 'There are no items created or available in this section yet.',
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center my-6">
      <div className="p-4 bg-slate-850 border border-slate-800 rounded-2xl mb-4 text-slate-400">
        {icon || <PackageOpen className="w-10 h-10 text-slate-400" />}
      </div>
      <h3 className="text-lg font-bold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
