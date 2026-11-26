import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'danger'
  | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white shadow-xs focus-visible:ring-slate-900',
  secondary:
    'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 focus-visible:ring-slate-400',
  outline:
    'border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-700 bg-white shadow-2xs focus-visible:ring-slate-400',
  ghost:
    'text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400',
  destructive:
    'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs shadow-rose-200 focus-visible:ring-rose-600',
  danger:
    'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs shadow-rose-200 focus-visible:ring-rose-600',
  success:
    'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs shadow-emerald-200 focus-visible:ring-emerald-600',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] h-9 px-3 text-xs gap-1.5 rounded-xl font-semibold',
  md: 'min-h-[44px] h-11 px-4 text-sm gap-2 rounded-xl font-bold',
  lg: 'min-h-[48px] h-12 px-5 text-sm sm:text-base gap-2.5 rounded-xl font-bold',
  'icon-sm': 'min-h-[36px] min-w-[36px] w-9 h-9 p-0 rounded-xl justify-center',
  'icon-md': 'min-h-[44px] min-w-[44px] w-11 h-11 p-0 rounded-xl justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      children,
      disabled,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isIconOnly = size === 'icon-sm' || size === 'icon-md';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] cursor-pointer ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
        {...rest}
      >
        {isLoading ? (
          <>
            <Loader2 className={`animate-spin ${size === 'sm' || size === 'icon-sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            {!isIconOnly && <span>처리 중...</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
