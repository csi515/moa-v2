import React from 'react';
import { formatCurrency } from '@/utils/formatters';
import {
  formatPerformanceSummary,
  type TeacherPayrollTotals,
} from '@/capabilities/billing/finance/teacherPayroll';

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <p className="text-[10px] font-bold text-slate-500">{label}</p>
      <p className="text-sm font-black text-slate-900 mt-0.5 tabular-nums">{value}</p>
      {sub ? <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p> : null}
    </div>
  );
}

export function TeacherPayrollSummaryCards({ totals }: { totals: TeacherPayrollTotals }) {
  const performance = formatPerformanceSummary(totals);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <SummaryCard label="대상 강사" value={`${totals.teacherCount}명`} />
      <SummaryCard label="실적 요약" value={performance.primary} sub={performance.detail} />
      <SummaryCard
        label="미정산"
        value={formatCurrency(totals.pendingAmount)}
        sub={`${totals.pendingCount}명`}
      />
      <SummaryCard
        label="정산 완료"
        value={formatCurrency(totals.settledAmount)}
        sub={`${totals.settledCount}명`}
      />
    </div>
  );
}
