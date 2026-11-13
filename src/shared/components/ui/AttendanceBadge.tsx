import React from 'react';
import { CheckCircle2, XCircle, Clock, ArrowRightLeft, Ticket } from 'lucide-react';

export type StandardAttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'early_leave'
  | 'make_up'
  | 'pending';

export interface AttendanceBadgeProps {
  status: StandardAttendanceStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
  customLabel?: string;
}

const ATTENDANCE_CONFIG: Record<
  StandardAttendanceStatus,
  {
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  present: {
    label: '출석',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    icon: CheckCircle2,
  },
  absent: {
    label: '결석',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-200',
    icon: XCircle,
  },
  late: {
    label: '지각',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    icon: Clock,
  },
  early_leave: {
    label: '조퇴',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    icon: Clock,
  },
  make_up: {
    label: '보강',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-200',
    icon: Ticket,
  },
  pending: {
    label: '미처리',
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-500',
    borderClass: 'border-slate-200',
    icon: Clock,
  },
};

export const AttendanceBadge: React.FC<AttendanceBadgeProps> = ({
  status,
  size = 'md',
  showIcon = false,
  className = '',
  customLabel,
}) => {
  const config = ATTENDANCE_CONFIG[status] || ATTENDANCE_CONFIG.pending;
  const IconComponent = config.icon;
  const label = customLabel || config.label;

  const sizeClasses =
    size === 'sm'
      ? 'text-[10px] px-1.5 py-0.5 rounded-md gap-0.5'
      : 'text-xs px-2 py-0.5 rounded-lg gap-1';

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span
      className={`inline-flex items-center font-bold border transition-colors select-none ${config.bgClass} ${config.textClass} ${config.borderClass} ${sizeClasses} ${className}`}
    >
      {showIcon && <IconComponent className={`${iconSize} shrink-0`} />}
      <span>{label}</span>
    </span>
  );
};
