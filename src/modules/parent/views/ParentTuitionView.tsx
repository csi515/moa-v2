import React, { useMemo, useState } from 'react';
import { StorageService } from '@/services/storage';
import {
  lastTuitionPaymentSummaryText,
  TuitionService,
} from '@/core/finance';
import { ScheduleService } from '@/core/services/scheduleService';
import { getPassRemaining } from '@/core/schedules/sessionPassUtils';
import {
  formatCurrency,
  formatDate,
  getInvoiceStatusBadge,
} from '@/utils/formatters';
import {
  formatBankAccountText,
  isInvoiceVisibleToParent,
} from '@/core/finance/paymentMethodLabels';
import { normalizeIndustryType, type IndustryType } from '@/core/industry/types';
import { getPlaceLabel } from '@/core/industry/industryUi';
import type { Student, TuitionInvoice } from '@/types';
import { Copy, X } from 'lucide-react';
import { Section } from './shared';
import { buildYearMonthOptions } from '@/core/finance/categories';

function statusLabel(status: 'paid' | 'partial' | 'unpaid'): string {
  if (status === 'paid') return '완납';
  if (status === 'partial') return '일부 납부';
  return '미납';
}

function ParentInvoiceDetailModal({
  invoice,
  bankAccountText,
  placeLabel = '사업장',
  onClose,
  onRequestCashReceipt,
}: {
  invoice: TuitionInvoice;
  bankAccountText: string;
  placeLabel?: string;
  onClose: () => void;
  onRequestCashReceipt: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const monthLabel = invoice.yearMonth.includes('-')
    ? `${invoice.yearMonth.split('-')[1]}월`
    : invoice.yearMonth;
  const lastPaymentText = lastTuitionPaymentSummaryText(
    TuitionService.getLatestTuitionPaymentForInvoice(invoice.id)
  );

  const handleCopy = async () => {
    if (!bankAccountText) return;
    try {
      await navigator.clipboard.writeText(bankAccountText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h3 className="font-bold text-slate-900 text-base">{monthLabel} 수강료 청구서</h3>
            <p className="text-xs text-slate-500">{invoice.title || `${invoice.yearMonth} 수강료`}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">청구 금액</span>
              <span className="font-black text-slate-900">{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">미납</span>
              <span className="font-bold text-rose-600">{formatCurrency(invoice.unpaidAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">납부 기한</span>
              <span className="font-mono font-bold text-slate-800">{invoice.dueDate}</span>
            </div>
            {lastPaymentText && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">최근 수납</span>
                <span className="font-bold text-slate-800">{lastPaymentText}</span>
              </div>
            )}
          </div>

          {bankAccountText ? (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-2">
              <p className="text-xs font-bold text-indigo-800">{placeLabel} 계좌번호</p>
              <p className="text-sm font-semibold text-slate-900 break-all">{bankAccountText}</p>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-xl bg-white border border-indigo-200 text-xs font-bold text-indigo-700"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? '복사됨' : '계좌번호 복사'}
              </button>
            </div>
          ) : null}

          <p className="text-[12px] leading-relaxed text-slate-600 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
            지역사랑상품권 및 현장 카드는 {placeLabel} 방문 시 결제 가능합니다.
          </p>

          {invoice.unpaidAmount > 0 && (
            <button
              type="button"
              onClick={onRequestCashReceipt}
              disabled={invoice.cashReceiptRequested === true}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 disabled:opacity-60"
            >
              {invoice.cashReceiptRequested
                ? '현금영수증 발행을 요청했습니다'
                : '현금영수증 발행 요청'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ParentTuitionView({
  student,
  industryType = 'piano',
}: {
  student: Student;
  industryType?: IndustryType | string;
}) {
  const industry = normalizeIndustryType(industryType);
  const showTextbooks = industry === 'piano';
  const settings = TuitionService.getSettings();
  const bankAccountText = formatBankAccountText(settings.bankAccount);

  const allSummary = TuitionService.getStudentBillingSummary(student.id);
  const invoices = TuitionService.getInvoicesByStudent(student.id).filter(isInvoiceVisibleToParent);
  const sales = showTextbooks ? StorageService.getTextbookSalesByStudentId(student.id) : [];
  const payments = showTextbooks
    ? StorageService.getTextbookPayments().filter((p) => p.studentId === student.id)
    : [];

  const monthOptions = useMemo(
    () =>
      buildYearMonthOptions({
        dataYearMonths: [
          ...invoices.map((i) => i.yearMonth),
          ...sales.map((s) => s.saleDate?.slice(0, 7)),
        ],
        pastMonths: 0,
        futureMonths: 0,
      }).map((m) => m.value),
    [invoices, sales]
  );

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]);
  const [detailInvoice, setDetailInvoice] = useState<TuitionInvoice | null>(null);
  const monthSummary = TuitionService.getStudentBillingSummary(student.id, selectedMonth);
  const monthInvoices = invoices.filter((i) => i.yearMonth === selectedMonth);
  const monthSales = sales.filter((s) => s.saleDate.startsWith(selectedMonth));

  const feeTitle =
    industry === 'daycare'
      ? '보육료'
      : industry === 'pilates'
        ? '수강료'
        : industry === 'skin_clinic'
        ? '이용료'
        : '월회비';

  const grandUnpaid = allSummary.grandUnpaid ?? allSummary.totalUnpaid;
  const isPassStudent = student.billingMode === 'session_pass';
  const sessionPasses = isPassStudent
    ? ScheduleService.getCustomerSessionPasses(student.id)
    : [];
  const passRemaining = isPassStudent
    ? ScheduleService.getCustomerRemainingSessions(student.id)
    : 0;

  const latestArrived = invoices.find(
    (inv) => inv.unpaidAmount > 0 && inv.status !== 'cancelled' && inv.invoiceSent === true
  );

  return (
    <div className="space-y-4">
      {latestArrived && (
        <button
          type="button"
          onClick={() => setDetailInvoice(latestArrived)}
          className="w-full text-left rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 min-h-[44px]"
        >
          <p className="text-xs font-bold text-rose-700">
            {latestArrived.yearMonth.split('-')[1] || ''}월 수강료 청구서가 도착했습니다
          </p>
          <p className="text-sm font-black text-slate-900 mt-0.5">
            {formatCurrency(latestArrived.unpaidAmount)} · 납기 {latestArrived.dueDate}
          </p>
        </button>
      )}

      {isPassStudent && (
        <Section title="회차권">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 mb-3">
            <p className="text-xs text-indigo-600 font-bold">잔여 합계</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{passRemaining}회</p>
          </div>
          {sessionPasses.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">등록된 회차권이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {sessionPasses.map((pass) => (
                <li
                  key={pass.id}
                  className="rounded-xl border border-slate-100 bg-white p-3"
                >
                  <p className="text-sm font-bold text-slate-900">{pass.label}</p>
                  <p className="text-xs text-indigo-700 font-semibold mt-1">
                    잔여 {getPassRemaining(pass)}회 / 전체 {pass.totalSessions}회
                  </p>
                  {pass.expiresAt && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ~{pass.expiresAt.slice(0, 10)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
        <div>
          <p className="text-xs text-slate-500">전체 미납</p>
          <p
            className={`text-2xl font-black ${
              grandUnpaid > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {formatCurrency(grandUnpaid)}
          </p>
        </div>
        {showTextbooks && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold text-slate-500">{feeTitle} 미납</p>
              <p
                className={`text-sm font-black ${
                  allSummary.tuitionUnpaid > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {formatCurrency(allSummary.tuitionUnpaid)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold text-slate-500">교재비 미납</p>
              <p
                className={`text-sm font-black ${
                  allSummary.textbookUnpaid > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {formatCurrency(allSummary.textbookUnpaid)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black text-slate-900">월별 내역</h3>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl min-h-[44px]"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-slate-100 overflow-hidden text-sm">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 bg-slate-50 text-[10px] font-bold text-slate-500">
            <span>항목</span>
            <span className="text-right">청구</span>
            <span className="text-right">납부</span>
            <span className="text-right">미납</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2.5 border-t border-slate-50 items-center">
            <span className="font-bold text-slate-900">{feeTitle}</span>
            <span className="font-mono text-right text-slate-700">
              {formatCurrency(monthSummary.tuitionBilled)}
            </span>
            <span className="font-mono text-right text-slate-700">
              {formatCurrency(monthSummary.tuitionPaid)}
            </span>
            <span
              className={`font-mono text-right font-bold ${
                monthSummary.tuitionUnpaid > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {formatCurrency(monthSummary.tuitionUnpaid)}
            </span>
          </div>
          {showTextbooks && (
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2.5 border-t border-slate-50 items-center">
              <span className="font-bold text-slate-900">교재비</span>
              <span className="font-mono text-right text-slate-700">
                {formatCurrency(monthSummary.textbookBilled)}
              </span>
              <span className="font-mono text-right text-slate-700">
                {formatCurrency(monthSummary.textbookPaid)}
              </span>
              <span
                className={`font-mono text-right font-bold ${
                  monthSummary.textbookUnpaid > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {formatCurrency(monthSummary.textbookUnpaid)}
              </span>
            </div>
          )}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2.5 border-t border-slate-200 bg-slate-50/80 items-center font-bold">
            <span>합계</span>
            <span className="font-mono text-right">
              {formatCurrency(monthSummary.tuitionBilled + monthSummary.textbookBilled)}
            </span>
            <span className="font-mono text-right">
              {formatCurrency(monthSummary.tuitionPaid + monthSummary.textbookPaid)}
            </span>
            <span
              className={`font-mono text-right ${
                (monthSummary.grandUnpaid ?? monthSummary.totalUnpaid) > 0
                  ? 'text-rose-600'
                  : 'text-emerald-600'
              }`}
            >
              {formatCurrency(monthSummary.grandUnpaid ?? monthSummary.totalUnpaid)}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          {selectedMonth} · {feeTitle} {statusLabel(monthSummary.tuitionStatus as 'paid' | 'partial' | 'unpaid')}
          {showTextbooks
            ? ` · 교재 ${statusLabel(monthSummary.textbookStatus as 'paid' | 'partial' | 'unpaid')}`
            : ''}
        </p>
      </div>

      <Section title={`${feeTitle} 청구서`}>
        {monthInvoices.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">해당 월 청구가 없습니다.</p>
        ) : (
          monthInvoices.map((inv) => (
            <button
              type="button"
              key={inv.id}
              onClick={() => setDetailInvoice(inv)}
              className="w-full flex justify-between items-center py-2.5 min-h-[44px] border-b border-slate-50 text-sm text-left"
            >
              <div>
                <p className="font-bold">{inv.yearMonth}월</p>
                <p className="text-xs text-slate-400">
                  청구 {formatCurrency(inv.totalAmount)} · 미납{' '}
                  {formatCurrency(inv.unpaidAmount)}
                </p>
                {((inv.textbookFee || 0) > 0 || (inv.extraFee || 0) > 0) && (
                  <p className="text-[10px] text-indigo-600 mt-0.5">
                    {(inv.textbookFee || 0) > 0 && `교재 ${formatCurrency(inv.textbookFee || 0)}`}
                    {(inv.textbookFee || 0) > 0 && (inv.extraFee || 0) > 0 ? ' · ' : ''}
                    {(inv.extraFee || 0) > 0 &&
                      `${inv.extraFeeLabel || '행사비'} ${formatCurrency(inv.extraFee || 0)}`}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${getInvoiceStatusBadge(inv.status).bg}`}
                >
                  {getInvoiceStatusBadge(inv.status).label}
                </span>
                {inv.receiptNumber && (
                  <p className="text-[10px] text-slate-400 mt-1">영수증 {inv.receiptNumber}</p>
                )}
              </div>
            </button>
          ))
        )}
      </Section>

      {showTextbooks && monthSales.length > 0 && (
        <Section title="교재비 상세">
          {monthSales.map((s) => (
            <div key={s.id} className="flex justify-between py-2 text-sm border-b border-slate-50">
              <div>
                <span className="font-medium">{s.textbookTitle}</span>
                <p className="text-[10px] text-slate-400">
                  {s.saleDate}
                  {s.billingInvoiceId ? ' · 월회비 합산' : ''}
                </p>
              </div>
              <span
                className={
                  s.billingInvoiceId
                    ? 'text-slate-500'
                    : s.unpaidAmount > 0
                      ? 'text-rose-600 font-bold'
                      : 'text-emerald-600'
                }
              >
                {s.billingInvoiceId
                  ? '월회비에 포함'
                  : s.unpaidAmount > 0
                    ? `미납 ${formatCurrency(s.unpaidAmount)}`
                    : formatCurrency(s.paidAmount)}
              </span>
            </div>
          ))}
        </Section>
      )}

      {payments.length > 0 && (
        <Section title="납부 영수증">
          {payments.slice(0, 12).map((p) => (
            <div key={p.id} className="py-2 text-sm border-b border-slate-50">
              <div className="flex justify-between">
                <span>{formatDate(p.paymentDate)}</span>
                <span className="font-bold">{formatCurrency(p.amount)}</span>
              </div>
              {p.receiptNumber && <p className="text-xs text-slate-400">No. {p.receiptNumber}</p>}
            </div>
          ))}
        </Section>
      )}

      {detailInvoice && (
        <ParentInvoiceDetailModal
          invoice={detailInvoice}
          bankAccountText={bankAccountText}
          placeLabel={getPlaceLabel(industry)}
          onClose={() => setDetailInvoice(null)}
          onRequestCashReceipt={() => {
            void TuitionService.requestCashReceipt(detailInvoice.id).then((updated) => {
              if (updated) setDetailInvoice(updated);
            });
          }}
        />
      )}
    </div>
  );
}
