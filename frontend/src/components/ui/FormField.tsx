import React from 'react';

interface FormFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  required?: boolean;
}

export function FormField({ label, error, helperText, children, required }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-red-400">*</span>}
          </span>
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-400 font-medium animate-fadeIn">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className = '', error, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={`w-full bg-slate-950/80 text-slate-100 placeholder-slate-500 text-sm px-3.5 py-2.5 rounded-xl border transition-all ${
        error
          ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500'
          : 'border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
      } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full bg-slate-950/80 text-slate-100 text-sm px-3.5 py-2.5 rounded-xl border transition-all ${
          error
            ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
        } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full bg-slate-950/80 text-slate-100 placeholder-slate-500 text-sm px-3.5 py-2.5 rounded-xl border transition-all ${
          error
            ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
        } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
