import React, { useMemo, useState } from 'react';
import { Student } from '@/types';
import {
  countMonthlyTuitionWorkStatuses,
  filterMonthlyTuitionWorkStudents,
  TuitionService,
  type MonthlyTuitionWorkFilter,
} from '@/core/finance';
import { formatCurrency } from '@/utils/formatters';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { FilterBar, FilterTabs } from '@/shared/components';
import { COMBINED_BILLING_STATUS_FILTER_LABELS } from './tuitionViewTypes';

interface TuitionCombinedBillingViewProps {
  customerLabel: string;
  students: Student[];
  selectedMonth: string;
  searchQuery: string;
  onSelectStudent: (studentId: string) => void;
  onCombinedPay: (student: Student) => void;
}

const WORK_STATUS_FILTER_ORDER: MonthlyTuitionWorkFilter[] = [
  'all',
  'paid',
  'unpaid',
  'no_invoice',
];

function StatusBadge({ totalUnpaid, totalPaid }: { totalUnpaid: number; totalPaid: number }) {
  if (totalUnpaid === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5" /> 완납
      </span>
    );
  }
  if (totalPaid > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">
        <AlertCircle className="w-3.5 h-3.5" /> 일부미납
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">
      <AlertCircle className="w-3.5 h-3.5" /> 전액미납
    </span>
  );
}

export const TuitionCombinedBillingView: React.FC<TuitionCombinedBillingViewProps> = ({
  customerLabel,
  students,
  selectedMonth,
  searchQuery,
  onSelectStudent,
  onCombinedPay
}) => {
  const [workStatusFilter, setWorkStatusFilter] = useState<MonthlyTuitionWorkFilter>('all');
  const invoices = TuitionService.getInvoices();

  const statusCounts = useMemo(
    () => countMonthlyTuitionWorkStatuses(students, invoices, selectedMonth),
    [students, invoices, selectedMonth]
  );

  const filteredStudents = useMemo(
    () =>
      filterMonthlyTuitionWorkStudents(students, invoices, selectedMonth, {
        statusFilter: workStatusFilter,
        searchQuery,
      }),
    [students, invoices, selectedMonth, workStatusFilter, searchQuery]
  );

  const statusFilterTabs = WORK_STATUS_FILTER_ORDER.map((id) => ({
    id,
    label: COMBINED_BILLING_STATUS_FILTER_LABELS[id],
    count: statusCounts[id],
  }));

  const emptyMessage = (
    <p className="py-12 text-center text-slate-400 text-sm">검색 조건에 맞는 {customerLabel}이(가) 없습니다.</p>
  );

  return (
    <div className="space-y-3">
      <FilterBar>
        <FilterTabs
          tabs={statusFilterTabs}
          active={workStatusFilter}
          onChange={(id) => setWorkStatusFilter(id as MonthlyTuitionWorkFilter)}
        />
      </FilterBar>

      {/* 데스크톱 테이블 */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1 text-xs">
          <span className="font-bold text-slate-800">
            {customerLabel}별 총 청구/수납/미납 현황 (수강료 + 교재비 자동 합산)
          </span>
          <span className="text-slate-500">
            * 항목별로 개별 관리되면서도 통합 수납이 가능합니다.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">{customerLabel}명 / 학부모</th>
                <th className="px-6 py-4 text-right">수강료 (청구/미납)</th>
                <th className="px-6 py-4 text-right">교재비 (구매/미납)</th>
                <th className="px-6 py-4 text-right">합산 총 청구액</th>
                <th className="px-6 py-4 text-right">합산 총 미납액</th>
                <th className="px-6 py-4 text-center">수납 상태</th>
                <th className="px-6 py-4 text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7}>{emptyMessage}</td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const summary = TuitionService.getStudentBillingSummary(student.id, selectedMonth);
                  const hasUnpaid = (summary.totalUnpaid || 0) > 0;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => onSelectStudent(student.id)}
                          className="font-bold text-slate-900 hover:text-indigo-600 text-left block"
                        >
                          {student.name}
                        </button>
                        <span className="text-[11px] text-slate-400">
                          {student.parentName} ({student.parentPhone})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-bold text-slate-900">{formatCurrency(summary.tuitionBilled || 0)}</p>
                        {summary.tuitionUnpaid > 0 ? (
                          <p className="text-[11px] font-bold text-rose-600">미납: {formatCurrency(summary.tuitionUnpaid)}</p>
                        ) : (
                          <p className="text-[11px] text-emerald-600 font-semibold">전액 완납</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-bold text-slate-900">
                          {(summary.textbookBilled || 0) > 0
                            ? formatCurrency(summary.textbookBilled || 0)
                            : '-'}
                        </p>
                        {summary.textbookUnpaid > 0 ? (
                          <p className="text-[11px] font-bold text-rose-600">미납: {formatCurrency(summary.textbookUnpaid)}</p>
                        ) : (summary.textbookBilled || 0) > 0 ? (
                          <p className="text-[11px] text-emerald-600 font-semibold">전액 완납</p>
                        ) : (
                          <p className="text-[11px] text-slate-400">-</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">
                        {formatCurrency(summary.totalBilled || 0)}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-rose-600">
                        {(summary.totalUnpaid || 0) > 0 ? formatCurrency(summary.totalUnpaid) : '₩0'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge totalUnpaid={summary.totalUnpaid || 0} totalPaid={summary.totalPaid || 0} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasUnpaid && (
                            <button
                              onClick={() => onCombinedPay(student)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
                            >
                              통합 수납
                            </button>
                          )}
                          <button
                            onClick={() => onSelectStudent(student.id)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                          >
                            상세보기
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 모바일 카드 */}
      <div className="md:hidden space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">{emptyMessage}</div>
        ) : (
          filteredStudents.map((student) => {
            const summary = TuitionService.getStudentBillingSummary(student.id, selectedMonth);
            const hasUnpaid = (summary.totalUnpaid || 0) > 0;

            return (
              <div
                key={student.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <button
                      onClick={() => onSelectStudent(student.id)}
                      className="font-bold text-slate-900 hover:text-indigo-600 text-sm text-left"
                    >
                      {student.name}
                    </button>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {student.parentName} ({student.parentPhone})
                    </p>
                  </div>
                  <StatusBadge totalUnpaid={summary.totalUnpaid || 0} totalPaid={summary.totalPaid || 0} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <p className="text-slate-500 font-semibold mb-0.5">수강료</p>
                    <p className="font-bold text-slate-900">{formatCurrency(summary.tuitionBilled || 0)}</p>
                    {summary.tuitionUnpaid > 0 && (
                      <p className="text-[11px] font-bold text-rose-600">미납 {formatCurrency(summary.tuitionUnpaid)}</p>
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <p className="text-slate-500 font-semibold mb-0.5">교재비</p>
                    <p className="font-bold text-slate-900">
                      {(summary.textbookBilled || 0) > 0
                        ? formatCurrency(summary.textbookBilled || 0)
                        : '-'}
                    </p>
                    {summary.textbookUnpaid > 0 && (
                      <p className="text-[11px] font-bold text-rose-600">미납 {formatCurrency(summary.textbookUnpaid)}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-[11px] text-slate-500">총 미납</p>
                    <p className="text-lg font-black text-rose-600">
                      {(summary.totalUnpaid || 0) > 0 ? formatCurrency(summary.totalUnpaid) : '₩0'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {hasUnpaid && (
                      <button
                        onClick={() => onCombinedPay(student)}
                        className="px-4 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                      >
                        통합 수납
                      </button>
                    )}
                    <button
                      onClick={() => onSelectStudent(student.id)}
                      className="px-3 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                    >
                      상세
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
