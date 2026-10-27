import React, { useMemo, useState } from 'react';
import { Copy, KeyRound, Loader2, X } from 'lucide-react';
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
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageService } from '@/services/storage';
import { showToast, showErrorToast } from '@/shared/feedback/uiFeedback';

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

  const { currentOrganization } = useOrganization();
  const [detailInvoice, setDetailInvoice] = useState<TuitionInvoice | null>(null);
  const [copied, setCopied] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState(false);

  // PIN 모달 및 상태
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinSubmitting, setPinSubmitting] = useState(false);

  const hasPinConfigured = useMemo(() => {
    return (
      StorageService.hasCustomerPin(studentId) ||
      StorageService.hasCustomerPin(customerId)
    );
  }, [studentId, customerId]);

  const isAcademy = useMemo(() => {
    const ind = currentOrganization?.industry_type || '';
    return !ind || ind === 'piano' || ind === 'academy' || ind.includes('academy');
  }, [currentOrganization]);

  const feeLabel = isAcademy ? '수강료' : '이용료/청구서';

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

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = newPin.trim();
    if (cleanPin.length < 4 || cleanPin.length > 8 || !/^\d+$/.test(cleanPin)) {
      showToast('출결 번호는 4~8자리 숫자여야 합니다.');
      return;
    }
    setPinSubmitting(true);
    try {
      const targetId = studentId || customerId;
      const res = await StorageService.setCustomerPin(
        targetId,
        cleanPin,
        organizationId
      );
      if (res && res.ok === false) {
        showToast(
          res.error === 'pin_already_used'
            ? '이미 다른 회원이 사용 중인 번호입니다. 다른 번호를 입력해 주세요.'
            : '출결 번호 설정에 실패했습니다.'
        );
        return;
      }
      showToast('출결 PIN 번호가 성공적으로 변경되었습니다.');
      setIsPinModalOpen(false);
      setNewPin('');
    } catch (err) {
      showErrorToast(err);
    } finally {
      setPinSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 키오스크 출결 PIN 번호 확인 카드 */}
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/50 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">매장 출결 번호 (PIN)</p>
              <p className="text-[11px] text-slate-500">
                {hasPinConfigured
                  ? '키오스크에 입력하여 즉시 출석 체크할 수 있습니다.'
                  : '휴대폰 번호 뒤 4자리가 기본 PIN으로 자동 연동됩니다.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewPin('');
              setIsPinModalOpen(true);
            }}
            className="inline-flex h-8 items-center rounded-lg border border-indigo-200 bg-white px-2.5 text-xs font-bold text-indigo-700 shadow-xs hover:bg-indigo-50"
          >
            {hasPinConfigured ? 'PIN 재설정' : '직접 번호 지정'}
          </button>
        </div>
      </section>

      {(latestArrived || lowPass) && (
        <section className="space-y-2">
          {latestArrived && (
            <button
              type="button"
              onClick={() => setDetailInvoice(latestArrived)}
              className="w-full text-left rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-xs min-h-[44px]"
            >
              <p className="text-xs font-bold text-amber-900">
                새 {feeLabel} 안내가 도착했습니다
              </p>
              <p className="text-sm font-semibold text-amber-950 mt-1">
                {latestArrived.yearMonth} {feeLabel} · 미납 {formatCurrency(latestArrived.unpaidAmount)}
              </p>
              <p className="text-xs text-amber-800/90 mt-1">
                납부 기한 {latestArrived.dueDate} · 터치하여 상세 및 계좌 확인
              </p>
            </button>
          )}

          {lowPass && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4 text-xs text-indigo-950">
              <span className="font-bold">이용권 잔여 {passSummary.remaining}회</span>
              <span className="text-indigo-800/90"> — 소진 전 재등록을 안내받으시려면 사업장에 문의해 주세요.</span>
            </div>
          )}
        </section>
      )}

      {/* 출결 현황 요약 */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500">오늘 출석</p>
          {onOpenAttendance && (
            <button
              type="button"
              onClick={onOpenAttendance}
              className="text-xs font-bold text-indigo-600 min-h-[44px] min-w-[44px] inline-flex items-center justify-end"
            >
              전체 출석
            </button>
          )}
        </div>
        {todaySession ? (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
            <span className="text-sm font-bold text-slate-800">
              {todaySession.sessionDate} {todaySession.checkInAt ? formatSessionTime(todaySession.checkInAt) : ''}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {getSessionStatusLabel(todaySession).label}
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-1">오늘 기록된 출석이 없습니다.</p>
        )}
        {sessions.length > 0 && (
          <p className="text-[11px] text-slate-400">
            최근 출석: {sessions[0].sessionDate} ({getSessionStatusLabel(sessions[0]).label})
          </p>
        )}
      </section>

      {/* 미납/청구 현황 */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500">{feeLabel} 안내</p>
          {unpaidTotal > 0 && (
            <span className="text-xs font-black text-rose-600">
              미납 합계 {formatCurrency(unpaidTotal)}
            </span>
          )}
        </div>

        {invoices.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">청구 내역이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {invoices.slice(0, 3).map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => setDetailInvoice(inv)}
                className="w-full text-left rounded-xl border border-slate-100 bg-slate-50/80 p-3 hover:bg-slate-100/80 transition-colors min-h-[44px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {inv.yearMonth} {feeLabel}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getInvoiceStatusBadge(inv.status)}`}
                  >
                    {inv.status === 'paid' ? '완납' : inv.status === 'partial' ? '일부납' : '미납'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-600">
                  <span>청구 {formatCurrency(inv.totalAmount)}</span>
                  {inv.unpaidAmount > 0 && (
                    <span className="font-bold text-rose-600">
                      미납 {formatCurrency(inv.unpaidAmount)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 공지사항 */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
        <CustomerNoticesView organizationId={organizationId} customerId={customerId} displayName={displayName || '회원'} />
      </section>

      {/* PIN 재설정 모달 */}
      <Modal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        title="키오스크 출결 PIN 설정"
      >
        <form onSubmit={handleUpdatePin} className="space-y-4 p-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-700">새 출결 번호 (4~8자리 숫자)</label>
            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
              매장에 비치된 태블릿/키오스크 화면에서 이 번호를 입력하면 즉시 출결 체크가 완료됩니다.
            </p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              required
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="예: 1234 또는 휴대폰 뒤 4자리"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsPinModalOpen(false)}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 min-h-[44px]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={pinSubmitting || newPin.trim().length < 4}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 min-h-[44px]"
            >
              {pinSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : '저장하기'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 청구서 상세 모달 */}
      <Modal
        isOpen={Boolean(detailInvoice)}
        onClose={() => setDetailInvoice(null)}
        title={detailInvoice ? `${detailInvoice.yearMonth} ${feeLabel} 상세` : '청구 상세'}
      >
        {detailInvoice && (
          <div className="space-y-4 p-4 text-left">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">회원 / 수강생</span>
                <span className="font-bold text-slate-900">{displayName || '회원'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">총 청구액</span>
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
