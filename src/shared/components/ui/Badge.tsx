import React, { type HTMLAttributes, type ReactNode } from 'react';

export type BadgeVariant =
  | 'brand'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'outline';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  pill?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  brand: 'bg-slate-50 text-slate-800 border-slate-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200/80',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
  danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
  outline: 'bg-white text-slate-600 border-slate-200',
};

const BADGE_SIZES: Record<BadgeSize, string> = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  pill = false,
  icon,
  className = '',
  children,
  ...rest
}) => {
  const radiusClass = pill ? 'rounded-full' : size === 'sm' ? 'rounded-md' : 'rounded-lg';

  return (
    <span
      className={`inline-flex items-center border font-semibold tracking-tight whitespace-nowrap select-none transition-colors ${BADGE_VARIANTS[variant]} ${BADGE_SIZES[size]} ${radiusClass} ${className}`}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
