import React, { ReactNode } from 'react';

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  iconClassName?: string;
  /** compact: 업무 허브용 — 제목 축소, 설명 한 줄 */
  density?: 'default' | 'compact';
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  description,
  actions,
  iconClassName = 'text-indigo-600',
  density = 'default',
}) => {
  const compact = density === 'compact';

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${
        compact ? 'gap-2 sm:gap-3' : 'gap-3'
      }`}
    >
      <div className="min-w-0">
        <h2
          className={`font-bold text-slate-900 tracking-tight flex items-center gap-2 ${
            compact ? 'text-lg' : 'text-lg sm:text-xl'
          }`}
        >
          <span className={`${iconClassName} shrink-0`}>{icon}</span>
          <span className="truncate">{title}</span>
        </h2>
        {description && !compact && (
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-snug line-clamp-2">
            {description}
          </p>
        )}
        {description && compact && (
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{description}</p>
        )}
      </div>
      {actions && (
        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
