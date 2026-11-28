import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { UI_RADIUS, UI_SIZES } from '@/shared/styles/density';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'danger'
  | 'success';

export type ButtonSize = 'sm' | 'default' | 'touch' | 'md' | 'lg' | 'icon-sm' | 'icon-md';

/** 폼 하단 제출·취소. 모바일은 한 줄, 데스크톱은 내용 너비로 제한한다. */
export const FORM_ACTION_BUTTON_CLASS = 'w-full sm:w-auto sm:min-w-[120px]';

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

function controlSize(token: (typeof UI_SIZES)[keyof typeof UI_SIZES], weight = ''): string {
  return [token.height, token.text, token.padding, token.gap, UI_RADIUS.control, weight]
    .filter(Boolean)
    .join(' ');
}

/** density.ts UI_SIZES. md=44px 표준 터치, lg=48px 카운터. default/touch 는 그 별칭. */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: controlSize(UI_SIZES.sm, 'font-medium'),
  md: controlSize(UI_SIZES.md, 'font-semibold'),
  default: controlSize(UI_SIZES.md, 'font-semibold'),
  lg: controlSize(UI_SIZES.lg),
  touch: controlSize(UI_SIZES.lg),
  'icon-sm': `${UI_SIZES.sm.height} min-w-9 w-9 p-0 ${UI_RADIUS.control} justify-center`,
  'icon-md': `${UI_SIZES.md.height} min-w-11 w-11 p-0 ${UI_RADIUS.control} justify-center`,
};

function spinnerClass(size: ButtonSize): string {
  if (size === 'sm' || size === 'icon-sm') return UI_SIZES.sm.icon;
  if (size === 'lg' || size === 'touch') return UI_SIZES.lg.icon;
  return UI_SIZES.md.icon;
}

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
        className={`inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] cursor-pointer ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
        {...rest}
      >
        {isLoading ? (
          <>
            <Loader2 className={`animate-spin ${spinnerClass(size)}`} />
            {!isIconOnly && <span>처리 중...</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children != null && children !== false && (
              <span className="whitespace-nowrap shrink-0">{children}</span>
            )}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
