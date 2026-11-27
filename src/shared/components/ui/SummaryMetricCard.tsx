import React from 'react';

type SummaryMetricVariant =
  | 'default'
  | 'rose'
  | 'amber'
  | 'emerald'
  | 'purple'
  | 'indigo'
  | 'teal';

interface SummaryMetricCardProps {
  label: string;
  value: string | number;
  variant?: SummaryMetricVariant;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

const VARIANT_STYLES: Record<
  SummaryMetricVariant,
  { container: string; label: string; value: string }
> = {
  default: {
    container: 'bg-white border-slate-200/80',
    label: 'text-slate-500 font-semibold',
    value: 'text-slate-900',
  },
  rose: {
    container: 'bg-rose-50/80 border-rose-200/80',
    label: 'text-rose-700 font-bold',
    value: 'text-rose-950',
  },
  amber: {
    container: 'bg-amber-50/80 border-amber-200/80',
    label: 'text-amber-700 font-bold',
    value: 'text-amber-950',
  },
  emerald: {
    container: 'bg-emerald-50/80 border-emerald-200/80',
    label: 'text-emerald-700 font-bold',
    value: 'text-emerald-950',
  },
  purple: {
    container: 'bg-slate-50 border-slate-200',
    label: 'text-slate-800 font-bold',
    value: 'text-slate-950',
  },
  indigo: {
    container: 'bg-slate-50 border-slate-200',
    label: 'text-slate-800 font-bold',
    value: 'text-slate-950',
  },
  teal: {
    container: 'bg-teal-50/80 border-teal-200/80',
    label: 'text-teal-700 font-bold',
    value: 'text-teal-950',
  },
};

export const SummaryMetricCard: React.FC<SummaryMetricCardProps> = ({
  label,
  value,
  variant = 'default',
  subtitle,
  onClick,
  className = '',
}) => {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
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
      className={`p-3.5 sm:p-4 rounded-2xl border shadow-2xs ${styles.container} ${
        onClick ? 'cursor-pointer hover:shadow-xs transition-shadow' : ''
      } ${className}`}
    >
      <p className={`text-xs ${styles.label} truncate`}>{label}</p>
      <p className={`text-lg sm:text-xl font-extrabold mt-1 tracking-tight ${styles.value}`}>{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
    </div>
  );
};
