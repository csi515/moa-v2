import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  settlementStatusLabel,
  type PayrollSettlementStatus,
} from '@/capabilities/billing/finance/teacherPayroll';

const STATUS_CLASS: Record<PayrollSettlementStatus, string> = {
  expensed: 'text-emerald-700 bg-emerald-50',
  confirmed: 'text-indigo-700 bg-indigo-50',
  pending: 'text-amber-700 bg-amber-50',
};

export function TeacherPayrollStatusBadge({
  status,
}: {
  status: PayrollSettlementStatus;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${STATUS_CLASS[status]}`}
    >
      {status === 'expensed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
      {settlementStatusLabel(status)}
    </span>
  );
}
