import React from 'react';
import { CheckCircle2, ClipboardCheck, Wallet } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import {
  formatPayRateDisplay,
  formatPayrollFormula,
  formatPayrollPeriod,
  payTypeLabel,
  quantityUnitLabel,
  resolveDraftCalculated,
  settlementStatusLabel,
  type TeacherPayrollRow,
} from '@/capabilities/billing/finance/teacherPayroll';
import { Modal } from '@/shared/components/ui';

interface TeacherPayrollDetailProps {
  row: TeacherPayrollRow;
  yearMonth: string;
  draftQuantity: number;
  draftAdjustment: number;
  draftReason: string;
  onQuantityChange: (v: number) => void;
  onAdjustmentChange: (v: number) => void;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  onRegisterExpense: () => void;
  onClose: () => void;
}

function statusGuide(status: TeacherPayrollRow['settlementStatus']): {
  title: string;
  body: string;
  tone: string;
} {
  if (status === 'expensed') {
    return {
      title: '지출 등록 완료',
      body: '이미 지출 장부에 반영되었습니다. 같은 월·강사로 다시 등록하지 않습니다.',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    };
  }
  if (status === 'confirmed') {
    return {
      title: '정산 확정됨 · 지출 대기',
      body: '금액은 확정되었습니다. 다음 단계로만 「지출 등록」을 진행하세요. (정산 확정과 별개)',
      tone: 'border-indigo-200 bg-indigo-50 text-indigo-900',
    };
  }
  return {
    title: '계산만 된 상태 · 미확정',
    body: '아래 방식·금액을 확인한 뒤 필요하면 조정하고, 「정산 확정」으로 금액을 확정하세요.',
    tone: 'border-amber-200 bg-amber-50 text-amber-900',
  };
}

export const TeacherPayrollDetailModal: React.FC<TeacherPayrollDetailProps> = ({
  row,
  yearMonth,
  draftQuantity,
  draftAdjustment,
  draftReason,
  onQuantityChange,
  onAdjustmentChange,
  onReasonChange,
  onConfirm,
  onRegisterExpense,
  onClose,
}) => {
  const locked = row.settlementStatus !== 'pending';
  const calculated = locked
    ? row.calculatedAmount
    : resolveDraftCalculated(row, draftQuantity);
  const finalAmount = locked ? row.finalAmount : Math.max(0, calculated + draftAdjustment);
  const formulaQuantity = locked
    ? row.quantity
    : row.payType === 'monthly'
      ? 1
      : draftQuantity;
  const guide = statusGuide(row.settlementStatus);
  const periodLabel = formatPayrollPeriod(yearMonth);

  return (
    <Modal isOpen onClose={onClose} title={`${row.teacherName} 정산`} maxWidth="md">
      <div className="space-y-4 p-4 sm:p-6">
        {/* 한눈에: 강사 · 월 · 방식 · 금액 · 상태 */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 grid grid-cols-2 gap-2">
          <SummaryChip label="강사" value={row.teacherName} />
          <SummaryChip label="정산 월" value={periodLabel} />
          <SummaryChip label="정산 방식" value={payTypeLabel(row.payType)} />
          <SummaryChip label="최종 금액" value={formatCurrency(finalAmount)} emphasize />
          <div className="col-span-2">
            <SummaryChip label="현재 상태" value={settlementStatusLabel(row.settlementStatus)} />
          </div>
        </div>

        <div className={`rounded-xl border px-3 py-2.5 ${guide.tone}`}>
          <p className="text-[11px] font-black">{guide.title}</p>
          <p className="text-[11px] mt-0.5 leading-relaxed opacity-90">{guide.body}</p>
        </div>

        <SectionTitle title="정산 방식 · 실적 확인" />
        <DetailRow label="정산 대상 기간" value={periodLabel} />
        <DetailRow label="정산 방식" value={payTypeLabel(row.payType)} />
        {row.payType === 'hourly' && (
          <DetailRow
            label="수업 실적"
            value={`${locked ? row.quantity : row.lessonCount}회`}
            hint="저장된 수업 기록(수업 일지) 기준"
          />
        )}

        {row.requiresManualQuantity && !locked && (
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              정산 대상 {row.payType === 'attendance' ? '출근' : '근무 시간'} (
              {quantityUnitLabel(row.payType)})
            </label>
            <input
              type="number"
              min={0}
              step={row.payType === 'work_hours' ? 0.5 : 1}
              value={draftQuantity}
              onChange={(e) => onQuantityChange(Number(e.target.value) || 0)}
              className="w-full px-3 py-2.5 text-sm font-bold border border-slate-200 rounded-xl min-h-[44px]"
            />
            <p className="text-[11px] text-amber-700 mt-1.5 leading-relaxed">
              출근·근무시간은 출결/세션에서 자동 집계되지 않습니다. 값을 비우면 정산액이 0원으로
              계산되니, 이번 달 실적을 직접 입력한 뒤 확정하세요.
            </p>
          </div>
        )}

        {row.requiresManualQuantity && locked && (
          <DetailRow
            label={row.payType === 'attendance' ? '출근' : '근무 시간'}
            value={`${row.quantity}${quantityUnitLabel(row.payType)}`}
          />
        )}

        {row.payType !== 'none' && (
          <DetailRow label="지급 기준" value={formatPayRateDisplay(row.payType, row.rate)} />
        )}

        <SectionTitle title="계산 금액 확인" />
        <DetailRow
          label="계산식"
          value={formatPayrollFormula({
            payType: row.payType,
            quantity: formulaQuantity,
            rate: row.rate,
          })}
        />
        <DetailRow label="계산 금액" value={formatCurrency(calculated)} />

        <SectionTitle title="필요 시 조정" />
        {!locked ? (
          <>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                조정 금액 (가감, 음수 가능)
              </label>
              <input
                type="number"
                step={1000}
                value={draftAdjustment}
                onChange={(e) => onAdjustmentChange(Number(e.target.value) || 0)}
                className="w-full px-3 py-2.5 text-sm font-bold border border-slate-200 rounded-xl min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">조정 사유</label>
              <input
                type="text"
                value={draftReason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="예: 보너스, 결근 차감 등"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl min-h-[44px]"
              />
            </div>
          </>
        ) : (
          (row.adjustmentAmount !== 0 || row.adjustmentReason) && (
            <>
              <DetailRow
                label="조정 금액"
                value={`${row.adjustmentAmount > 0 ? '+' : ''}${formatCurrency(row.adjustmentAmount)}`}
              />
              {row.adjustmentReason ? (
                <DetailRow label="조정 사유" value={row.adjustmentReason} />
              ) : null}
            </>
          )
        )}
        {locked && row.adjustmentAmount === 0 && !row.adjustmentReason ? (
          <p className="text-[11px] text-slate-400">조정 없이 확정된 정산입니다.</p>
        ) : null}

        <div className="rounded-xl bg-slate-900 text-white px-4 py-3">
          <p className="text-[11px] font-bold text-slate-300">최종 정산 금액</p>
          <p className="text-lg font-black tabular-nums mt-0.5">{formatCurrency(finalAmount)}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {row.settlementStatus === 'pending'
              ? '아직 확정 전(계산만 반영)'
              : row.settlementStatus === 'confirmed'
                ? '정산 확정됨 · 지출 미등록'
                : '정산 확정 · 지출 등록 완료'}
          </p>
        </div>

        <SectionTitle title="정산 확정 → 지출 등록" />
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 space-y-2">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-700">정산 확정</span> = 지급액 확정·저장 /{' '}
            <span className="font-bold text-slate-700">지출 등록</span> = 지출 장부 반영 (서로 다른
            동작)
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {row.settlementStatus === 'pending' && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={finalAmount <= 0 || row.payType === 'none'}
                className="flex-1 min-h-[44px] px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5"
              >
                <ClipboardCheck className="w-4 h-4" />
                정산 확정 (금액 확정)
              </button>
            )}
            {row.settlementStatus === 'confirmed' && (
              <button
                type="button"
                onClick={onRegisterExpense}
                className="flex-1 min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-4 h-4" />
                지출 등록 (장부 반영)
              </button>
            )}
            {row.settlementStatus === 'expensed' && (
              <p className="flex-1 text-xs text-emerald-800 font-bold flex items-center gap-1.5 justify-center min-h-[44px] rounded-xl bg-emerald-50 border border-emerald-100 px-3">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                지출 등록됨 · 재등록 불가
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="pt-1 border-t border-slate-100">
      <h3 className="text-xs font-black text-slate-800">{title}</h3>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-white border border-slate-100 px-2.5 py-2">
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <p
        className={`text-xs font-black mt-0.5 truncate ${
          emphasize ? 'text-indigo-700 tabular-nums' : 'text-slate-900'
        }`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <div>
        <p className="text-[11px] font-bold text-slate-500">{label}</p>
        {hint ? <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p> : null}
      </div>
      <p className="font-bold text-slate-900 text-right">{value}</p>
    </div>
  );
}
