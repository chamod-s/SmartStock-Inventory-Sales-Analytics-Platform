'use client';

import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-fadeIn transition-opacity"
      />

      {/* Modal Card */}
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-10 overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-100">{title}</h3>
            {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  type?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  type = 'danger',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      icon: <AlertTriangle className="w-6 h-6 text-red-400" />,
      iconBg: 'bg-red-500/10 border-red-500/20',
      btn: 'bg-red-600 hover:bg-red-500 text-white',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      btn: 'bg-amber-600 hover:bg-amber-500 text-white',
    },
    info: {
      icon: <AlertTriangle className="w-6 h-6 text-sky-400" />,
      iconBg: 'bg-sky-500/10 border-sky-500/20',
      btn: 'bg-brand-600 hover:bg-brand-500 text-white',
    },
  };

  const style = typeStyles[type];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex flex-col items-center text-center py-2">
        <div className={`p-3 rounded-2xl border mb-4 ${style.iconBg}`}>{style.icon}</div>
        <p className="text-sm text-slate-300 mb-6">{message}</p>
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-1/2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl border border-slate-700 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-1/2 px-4 py-2.5 text-sm font-semibold rounded-xl shadow-lg transition-all ${style.btn} disabled:opacity-50`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
