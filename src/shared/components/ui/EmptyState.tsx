import React, { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-2xl p-6 sm:p-8 text-center border border-slate-200 animate-in fade-in duration-300 ${className}`}>
      <div className="mx-auto mb-3 text-slate-300 animate-in zoom-in duration-300 delay-75">{icon}</div>
      <h3 className="font-bold text-slate-700 text-sm sm:text-base animate-in slide-in-from-bottom-2 duration-300 delay-100">{title}</h3>
      {description && <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-snug animate-in slide-in-from-bottom-2 duration-300 delay-150">{description}</p>}
      {action && <div className="mt-4 animate-in slide-in-from-bottom-2 duration-300 delay-200">{action}</div>}
    </div>
  );
};
