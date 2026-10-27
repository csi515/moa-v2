import React from 'react';
import { Wallet } from 'lucide-react';
import { formatPayrollPeriod, resolveEditableQuantity } from '@/capabilities/billing/finance/teacherPayroll';
import { PageHeader } from '@/shared/components';
import { TeacherPayrollDetailModal } from './TeacherPayrollDetailModal';
import { TeacherPayrollList } from './TeacherPayrollList';
import { TeacherPayrollSummaryCards } from './TeacherPayrollSummaryCards';
import { useTeacherPayroll } from './useTeacherPayroll';

const WORKFLOW_STEPS = [
  '정산 월 선택',
  '강사 선택',
  '방식·금액 확인',
  '필요 시 조정',
  '정산 확정',
  '필요 시 지출 등록',
] as const;

export const TeacherPayrollView: React.FC<{ embedded?: boolean }> = ({
  embedded = false,
}) => {
  const payroll = useTeacherPayroll();
  const selected = payroll.selectedRow;

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-4 pb-4'}>
      {!embedded && (
        <PageHeader
          icon={<Wallet className="w-6 h-6" />}
          title="강사 정산"
          description="월·강사를 고른 뒤 금액을 확인하고, 정산 확정과 지출 등록을 순서대로 진행합니다"
        />
      )}

      {embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900">강사 정산</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 sm:hidden">
              월 선택 → 강사 → 확정 → 지출 등록
            </p>
            <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
              정산 확정(금액 확정)과 지출 등록(회계 반영)은 별도 단계입니다
            </p>
          </div>
          <button
            type="button"
            onClick={() => payroll.setActiveTab('teachers')}
            className="text-xs font-bold text-indigo-600 hover:underline min-h-[44px] self-start shrink-0"
          >
            강사 정산 기준 설정
          </button>
        </div>
      )}

      <ol
        className="hidden sm:flex flex-wrap gap-1.5 sm:gap-2"
        aria-label="강사 정산 작업 순서"
      >
        {WORKFLOW_STEPS.map((label, index) => (
          <li
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-slate-600"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[9px] text-white">
              {index + 1}
            </span>
            {label}
            {index < WORKFLOW_STEPS.length - 1 ? (
              <span className="hidden sm:inline text-slate-400 font-medium" aria-hidden>
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3">
        <div className="min-w-0">
          <label
            htmlFor="teacher-payroll-month"
            className="block text-[11px] font-bold text-slate-500 mb-1"
          >
            1. 정산 월 선택
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              id="teacher-payroll-month"
              value={payroll.selectedMonth}
              onChange={(e) => payroll.changeMonth(e.target.value)}
              className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl min-h-[44px]"
            >
              {payroll.monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 font-medium">
              기간 {formatPayrollPeriod(payroll.selectedMonth)}
            </p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 font-medium sm:text-right">
          다음: 목록에서 <span className="font-bold text-slate-700">강사를 선택</span>해
          상세로 이동합니다
        </p>
      </div>

      <TeacherPayrollSummaryCards totals={payroll.totals} />
      <TeacherPayrollList
        yearMonth={payroll.selectedMonth}
        rows={payroll.rows}
        onOpenDetail={payroll.openDetail}
      />

      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 space-y-1">
        <p className="text-[11px] font-bold text-slate-600">정산 확정 ≠ 지출 등록</p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <span className="font-bold text-slate-700">정산 확정</span>은 이번 달 지급액을
          확정·저장하는 단계이고,{' '}
          <span className="font-bold text-slate-700">지출 등록</span>은 확정된 금액을 지출
          장부에 반영하는 다음 단계입니다. 이미 지출 등록된 월·강사는 다시 등록되지 않습니다.
        </p>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          수업 실적은 저장된 수업 기록(수업 일지) 기준입니다. 출근·근무시간 방식은 자동 집계가 없어
          상세에서 실적을 직접 입력해야 하며, 미입력 시 0원으로 표시됩니다.
        </p>
      </div>

      {selected && (
        <TeacherPayrollDetailModal
          row={selected}
          yearMonth={payroll.selectedMonth}
          draftQuantity={resolveEditableQuantity(
            selected,
            payroll.quantityOverrides[selected.teacherId]
          )}
          draftAdjustment={payroll.adjustmentOverrides[selected.teacherId]?.amount || 0}
          draftReason={payroll.adjustmentOverrides[selected.teacherId]?.reason || ''}
          onQuantityChange={(v) => payroll.setDraftQuantity(selected.teacherId, v)}
          onAdjustmentChange={(v) => payroll.setDraftAdjustment(selected.teacherId, v)}
          onReasonChange={(v) => payroll.setDraftReason(selected.teacherId, v)}
          onConfirm={() => payroll.handleConfirm(selected)}
          onRegisterExpense={() => payroll.handleRegisterExpense(selected)}
          onClose={payroll.closeDetail}
        />
      )}
    </div>
  );
};
