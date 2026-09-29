import React, { ReactNode } from 'react';

interface StatCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBg?: string;
  trend?: {
    text: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-indigo-50 text-indigo-600',
  trend,
  onClick,
  highlight = false,
}) => {
  return (
    <div
      id={id}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500' : ''
      } ${
        highlight
          ? 'bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white border-indigo-700 shadow-sm'
          : 'bg-white text-slate-800 border-slate-200 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium ${highlight ? 'text-indigo-200' : 'text-slate-500'}`}>
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <h3
              className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${highlight ? 'text-white' : 'text-slate-800'}`}
            >
              {value}
            </h3>
            {trend && (
              <span
                className={`text-xs font-bold ${trend.isPositive ? 'text-green-500' : 'text-rose-500'}`}
              >
                {trend.isPositive ? '+' : ''}
                {trend.text} {trend.isPositive ? '↑' : '↓'}
              </span>
            )}
          </div>
          {subtitle && (
            <p
              className={`text-xs mt-1 font-normal ${highlight ? 'text-indigo-200/80' : 'text-slate-400'}`}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-2 rounded-lg shrink-0 ${highlight ? 'bg-white/10 text-white' : iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
