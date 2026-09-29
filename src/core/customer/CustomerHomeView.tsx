import React, { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { formatCurrency, getInvoiceStatusBadge } from '@/utils/formatters';
import { lastTuitionPaymentSummaryText, TuitionService } from '@/core/finance';
import {
  formatBankAccountText,
  isInvoiceVisibleToParent,
} from '@/core/finance/paymentMethodLabels';
import { Modal } from '@/shared/components/ui/Modal';
import { useParentAttendanceSessions } from '@/core/parent/hooks/useParentAttendanceSessions';
import {
  formatSessionTime,
  getSessionStatusLabel,
} from '@/core/attendance/services/attendanceService';
import type { TuitionInvoice } from '@/types';
import { CustomerNoticesView } from './CustomerNoticesView';
import type { getMyPassSummary } from './services/studentPortalService';

type PassSummary = ReturnType<typeof getMyPassSummary>;

export function CustomerHomeView({
  customerId,
  studentId,
  organizationId,
  passSummary,
  onOpenAttendance,
  displayName,
}: {
  customerId: string;
  /** CRM customer와 구분 — 출석·청구 키는 student/customer CRM id */
  studentId: string;
  organizationId: string;
  passSummary: PassSummary;
  onOpenAttendance?: () => void;
  displayName?: string;
}) {
  void customerId;

  const [detailInvoice, setDetailInvoice] = useState<TuitionInvoice | null>(null);
  const [copied, setCopied] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState(false);

  const { todaySession, sessions } = useParentAttendanceSessions(organizationId, studentId, 8);

  const invoices = useMemo(
    () =>
      TuitionService.getInvoicesByStudent(studentId)
        .filter(isInvoiceVisibleToParent)
        .filter((inv) => inv.status !== 'cancelled')
        .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth)),
    [studentId]
  );

  const unpaidTotal = useMemo(
    () => invoices.reduce((sum, inv) => sum + Math.max(0, inv.unpaidAmount || 0), 0),
    [invoices]
  );

  const latestArrived = invoices.find(
    (inv) => inv.unpaidAmount > 0 && inv.invoiceSent === true
  );

  const lastPaymentText = detailInvoice
    ? lastTuitionPaymentSummaryText(
        TuitionService.getLatestTuitionPaymentForInvoice(detailInvoice.id)
      )
    : null;
  const settings = TuitionService.getSettings();
  const bankAccountText = formatBankAccountText(settings.bankAccount);
  const lowPass = passSummary.remaining > 0 && passSummary.remaining <= 2;

  const handleCopyBank = async () => {
    if (!bankAccountText) return;
    try {
      await navigator.clipboard.writeText(bankAccountText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleRequestCashReceipt = async () => {
    if (!detailInvoice) return;
    setReceiptBusy(true);
    try {
      const updated = await TuitionService.requestCashReceipt(detailInvoice.id);
      if (updated) setDetailInvoice(updated);
    } finally {
      setReceiptBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {(latestArrived || lowPass) && (
        <section className="space-y-2">
          {latestArrived && (
            <button
              type="button"
              onClick={() => setDetailInvoice(latestArrived)}
              className="w-full text-left rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 min-h-[44px]"
            >
              <p className="text-xs font-black text-indigo-800">청구서 도착</p>
              <p className="text-sm text-indigo-900 mt-0.5">
                {(latestArrived.yearMonth.split('-')[1] || '') + '월'} 청구 · 미납{' '}
                {formatCurrency(latestArrived.unpaidAmount)}
              </p>
            </button>
          )}
          {lowPass && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-black text-amber-800">이용권 잔여 부족</p>
              <p className="text-sm text-amber-900 mt-0.5">
                잔여 {passSummary.remaining}회 — 사업장에 문의해 주세요
              </p>
            </div>
          )}
        </section>
      )}

      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white border border-slate-200 p-3">
          <p className="text-[10px] font-bold text-slate-500">잔여 이용권</p>
          <p className="text-xl font-black text-indigo-700 mt-1">{passSummary.remaining}회</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-3">
          <p className="text-[10px] font-bold text-slate-500">미납 (발송 청구)</p>
          <p className="text-xl font-black text-rose-600 mt-1">{formatCurrency(unpaidTotal)}</p>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900">오늘 출결</h2>
          {onOpenAttendance && (
            <button
              type="button"
              onClick={onOpenAttendance}
              className="text-[11px] font-bold text-indigo-600 min-h-[44px] px-1"
            >
              전체 보기
            </button>
          )}
        </div>
        {todaySession ? (
          <p className="text-sm font-bold text-emerald-700">
            {getSessionStatusLabel(todaySession).label}
            {todaySession.checkInAt ? ` · ${formatSessionTime(todaySession.checkInAt)}` : ''}
          </p>
        ) : (
          <p className="text-xs text-slate-400 py-1">오늘 출결 기록이 없습니다.</p>
        )}
        {sessions.slice(0, 3).map((s) => (
          <div key={s.id} className="flex justify-between text-xs py-1.5 border-b border-slate-50">
            <span className="font-mono text-slate-600">{s.sessionDate}</span>
            <span className="font-bold text-slate-800">{getSessionStatusLabel(s).label}</span>
          </div>
        ))}
      </section>

      <CustomerNoticesView
        customerId={studentId}
        organizationId={organizationId}
        displayName={displayName || '나'}
        compact
      />

      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-black text-slate-900">청구서</h2>
        <p className="text-[11px] text-slate-400">사업장이 발송한 청구서만 표시됩니다.</p>
        {invoices.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">도착한 청구서가 없습니다.</p>
        ) : (
          invoices.slice(0, 8).map((inv) => {
            const badge = getInvoiceStatusBadge(inv.status);
            return (
              <button
                key={inv.id}
                type="button"
                onClick={() => setDetailInvoice(inv)}
                className="w-full flex justify-between items-center py-2.5 border-b border-slate-50 text-sm text-left min-h-[44px]"
              >
                <div>
                  <p className="font-bold text-slate-800">
                    {inv.title || `${inv.yearMonth} 수강료`}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    납기 {inv.dueDate} · 미납 {formatCurrency(inv.unpaidAmount)}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${badge.bg}`}>
                  {badge.label}
                </span>
              </button>
            );
          })
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-black text-slate-900">이용권</h2>
        {passSummary.passes.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">등록된 이용권이 없습니다.</p>
        ) : (
          passSummary.passes.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-center py-2 border-b border-slate-50 text-sm"
            >
              <div>
                <p className="font-bold text-slate-800">{p.label}</p>
                {p.expiresAt && (
                  <p className="text-[10px] text-slate-400">~{p.expiresAt.slice(0, 10)}</p>
                )}
              </div>
              <span className="font-black text-indigo-700">
                {p.remaining}/{p.total}
              </span>
            </div>
          ))
        )}
      </section>

      <Modal
        isOpen={!!detailInvoice}
        onClose={() => setDetailInvoice(null)}
        title={
          detailInvoice
            ? `${detailInvoice.yearMonth.includes('-') ? detailInvoice.yearMonth.split('-')[1] + '월' : detailInvoice.yearMonth} 청구서`
            : '청구서'
        }
        maxWidth="md"
      >
        {detailInvoice && (
          <div className="p-5 space-y-4">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">청구 금액</span>
                <span className="font-black text-slate-900">
                  {formatCurrency(detailInvoice.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">미납</span>
                <span className="font-bold text-rose-600">
                  {formatCurrency(detailInvoice.unpaidAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">납부 기한</span>
                <span className="font-mono font-bold text-slate-800">{detailInvoice.dueDate}</span>
              </div>
              {lastPaymentText ? (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">최근 수납</span>
                  <span className="font-bold text-slate-800">{lastPaymentText}</span>
                </div>
              ) : null}
            </div>

            {bankAccountText ? (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-2">
                <p className="text-xs font-bold text-indigo-800">사업장 계좌번호</p>
                <p className="text-sm font-semibold text-slate-900 break-all">{bankAccountText}</p>
                <button
                  type="button"
                  onClick={() => void handleCopyBank()}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-xl bg-white border border-indigo-200 text-xs font-bold text-indigo-700"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? '복사됨' : '계좌번호 복사'}
                </button>
              </div>
            ) : null}

            <p className="text-[12px] leading-relaxed text-slate-600 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
              지역사랑상품권 및 현장 카드는 사업장 방문 시 결제 가능합니다.
            </p>

            {detailInvoice.unpaidAmount > 0 && (
              <button
                type="button"
                onClick={() => void handleRequestCashReceipt()}
                disabled={receiptBusy || detailInvoice.cashReceiptRequested === true}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 disabled:opacity-60"
              >
                {detailInvoice.cashReceiptRequested
                  ? '현금영수증 발행을 요청했습니다'
                  : receiptBusy
                    ? '요청 중...'
                    : '현금영수증 발행 요청'}
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
