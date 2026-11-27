import React, { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  variant?: 'default' | 'flat' | 'elevated' | 'interactive';
}

const CARD_VARIANTS = {
  default: 'bg-white rounded-2xl border border-slate-200/80 shadow-2xs',
  flat: 'bg-slate-50/70 rounded-2xl border border-slate-200/60',
  elevated: 'bg-white rounded-2xl border border-slate-100 shadow-md',
  interactive:
    'bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className = '', children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={`overflow-hidden ${CARD_VARIANTS[variant]} ${className}`}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  action?: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ action, className = '', children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 ${className}`}
        {...rest}
      >
        <div className="min-w-0 flex-1">{children}</div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    );
  }
);
CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', children, ...rest }, ref) => {
    return (
      <h3
        ref={ref}
        className={`font-bold text-slate-900 text-sm sm:text-base truncate ${className}`}
        {...rest}
      >
        {children}
      </h3>
    );
  }
);
CardTitle.displayName = 'CardTitle';

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', children, ...rest }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-xs text-slate-500 mt-0.5 leading-normal ${className}`}
        {...rest}
      >
        {children}
      </p>
    );
  }
);
CardDescription.displayName = 'CardDescription';

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...rest }, ref) => {
    return (
      <div ref={ref} className={`p-4 sm:p-5 ${className}`} {...rest}>
        {children}
      </div>
    );
  }
);
CardContent.displayName = 'CardContent';

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 ${className}`}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
CardFooter.displayName = 'CardFooter';
