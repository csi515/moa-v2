import React from 'react';
import { ChevronRight, Users } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import {
  formatPayrollFormula,
  formatPayrollPeriod,
  payTypeLabel,
  quantityUnitLabel,
  type PayrollSettlementStatus,
  type TeacherPayrollRow,
} from '@/capabilities/billing/finance/teacherPayroll';
import { TeacherPayrollStatusBadge } from './TeacherPayrollStatusBadge';

interface TeacherPayrollListProps {
  yearMonth: string;
  rows: TeacherPayrollRow[];
  onOpenDetail: (row: TeacherPayrollRow) => void;
}

function nextStepLabel(status: PayrollSettlementStatus): string {
  if (status === 'expensed') return '지출 등록 완료 · 재등록 없음';
  if (status === 'confirmed') return '다음: 지출 등록';
  return '다음: 확인 후 정산 확정';
}

function statusDetailLabel(status: PayrollSettlementStatus): string {
  if (status === 'expensed') return '확정 + 지출됨';
  if (status === 'confirmed') return '확정됨 (지출 전)';
  return '계산만 (미확정)';
}

function actionLabel(status: PayrollSettlementStatus): string {
  if (status === 'expensed') return '내역 보기';
  if (status === 'confirmed') return '지출 등록';
  return '정산하기';
}

export function TeacherPayrollList({
  yearMonth,
  rows,
  onOpenDetail,
}: TeacherPayrollListProps) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
        등록된 활성 강사가 없습니다.
      </div>
    );
  }

  const periodLabel = formatPayrollPeriod(yearMonth);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-0.5">
        <h3 className="text-xs font-black text-slate-800">
          2. 강사 선택
          <span className="ml-2 font-bold text-slate-500">({yearMonth} · {periodLabel})</span>
        </h3>
        <p className="text-[11px] text-slate-400">
          월 · 방식 · 금액 · 상태를 확인한 뒤 강사를 고르세요
        </p>
      </div>

      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left font-bold px-4 py-3">강사</th>
              <th className="text-left font-bold px-3 py-3">정산 월</th>
              <th className="text-left font-bold px-3 py-3">정산 방식</th>
              <th className="text-right font-bold px-3 py-3">계산 금액</th>
              <th className="text-right font-bold px-3 py-3">최종 금액</th>
              <th className="text-left font-bold px-3 py-3">상태</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.teacherId} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="px-4 py-3 font-bold text-slate-900">{row.teacherName}</td>
                <td className="px-3 py-3 text-slate-600 tabular-nums">{yearMonth}</td>
                <td className="px-3 py-3 text-slate-600">
                  <p>{payTypeLabel(row.payType)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {formatPayrollFormula({
                      payType: row.payType,
                      quantity: row.quantity,
                      rate: row.rate,
                    })}
                  </p>
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                  {formatCurrency(row.calculatedAmount)}
                </td>
                <td className="px-3 py-3 text-right font-black tabular-nums text-slate-900">
                  {formatCurrency(row.finalAmount)}
                </td>
                <td className="px-3 py-3">
                  <div className="space-y-1">
                    <TeacherPayrollStatusBadge status={row.settlementStatus} />
                    <p className="text-[10px] font-bold text-slate-500">
                      {statusDetailLabel(row.settlementStatus)}
                    </p>
                    <p className="text-[10px] text-slate-400">{nextStepLabel(row.settlementStatus)}</p>
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onOpenDetail(row)}
                    className="text-indigo-600 font-bold hover:underline min-h-[44px] px-2"
                  >
                    {actionLabel(row.settlementStatus)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {rows.map((row) => (
          <button
            key={row.teacherId}
            type="button"
            onClick={() => onOpenDetail(row)}
            className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 min-h-[44px]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-sm">{row.teacherName}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {yearMonth} · {payTypeLabel(row.payType)}
                  {row.payType !== 'none' && row.payType !== 'monthly'
                    ? ` · ${row.quantity}${quantityUnitLabel(row.payType)}`
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <TeacherPayrollStatusBadge status={row.settlementStatus} />
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <p className="text-slate-400 font-bold">계산 금액</p>
                <p className="font-bold text-slate-700 tabular-nums mt-0.5">
                  {formatCurrency(row.calculatedAmount)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <p className="text-slate-400 font-bold">최종 금액</p>
                <p className="font-black text-slate-900 tabular-nums mt-0.5">
                  {formatCurrency(row.finalAmount)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-500 font-medium">
                {statusDetailLabel(row.settlementStatus)} · {nextStepLabel(row.settlementStatus)}
              </span>
              <span className="font-bold text-indigo-600">{actionLabel(row.settlementStatus)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
