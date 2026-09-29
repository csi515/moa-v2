import React from 'react';
import { TuitionInvoice, StudentMonthlyBillingSummary, TextbookSale, PaymentMethod } from '@/types';
import { formatCurrency, getInvoiceStatusBadge } from '@/utils/formatters';
import { ONSITE_PAYMENT_METHOD_OPTIONS } from '@/core/finance/paymentMethodLabels';
import { resolveInvoiceBaseFee } from '@/core/finance/invoiceModel';
import {
  getLatestTuitionPaymentForInvoice,
  lastTuitionPaymentSummaryText,
} from '@/core/finance/latestTuitionPayment';
import { TuitionService } from '@/core/finance';
import { BookOpen, Plus } from 'lucide-react';

interface StudentDetailTuitionTabProps {
  allInvoices: TuitionInvoice[];
  billingSummary?: StudentMonthlyBillingSummary;
  studentSales?: TextbookSale[];
  payInvoiceId: string | null;
  setPayInvoiceId: (id: string | null) => void;
  payAmount: number;
  setPayAmount: (amount: number) => void;
  payMethod: PaymentMethod;
  setPayMethod: (method: PaymentMethod) => void;
  payMemo: string;
  setPayMemo: (memo: string) => void;
  onOpenPayModal: (inv: TuitionInvoice) => void;
  onProcessPayment: (e: React.FormEvent) => void;
  /** 일회성 교재 수납 등록 */
  onOpenTextbookSale?: () => void;
  onOpenTextbookTab?: () => void;
  onOpenTextbookPayment?: (sale: TextbookSale) => void;
}

export const StudentDetailTuitionTab: React.FC<StudentDetailTuitionTabProps> = ({
  allInvoices,
  billingSummary,
  studentSales = [],
  payInvoiceId,
  setPayInvoiceId,
  payAmount,
  setPayAmount,
  payMethod,
  setPayMethod,
  payMemo,
  setPayMemo,
  onOpenPayModal,
  onProcessPayment,
  onOpenTextbookSale,
  onOpenTextbookTab,
  onOpenTextbookPayment,
}) => {
  const tuitionPayments = TuitionService.getTuitionPayments();
  const unpaidInvoices = allInvoices.filter((inv) => inv.status !== 'paid' && inv.unpaidAmount > 0);
  /** 월 청구에 합산된 교재는 별도 미납으로 표시하지 않음 */
  const unpaidTextbookSales = studentSales.filter(
    (s) => s.unpaidAmount > 0 && !s.billingInvoiceId
  );
  const hasLinkedTextbook = studentSales.some((s) => Boolean(s.billingInvoiceId));

  return (
    <div className="space-y-4">
      {billingSummary && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-2">
          <p className="text-xs font-bold text-indigo-800">{billingSummary.yearMonth} 수납 요약</p>
          <p className="text-[11px] text-indigo-700/80">
            월회비와 별도 교재비를 구분해 표시합니다.
            {hasLinkedTextbook
              ? ' 월 청구에 합산된 교재는 월회비에 포함되어 있습니다.'
              : ' 설정에서 「월 청구에 교재·연주회비 합산」을 켜면 청구서에 함께 넣을 수 있습니다.'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-white rounded-xl p-2 border border-slate-100">
              <p className="text-[10px] text-slate-500">월회비 청구</p>
              <p className="text-sm font-black text-slate-900">
                {formatCurrency(billingSummary.tuitionBilled)}
              </p>
              <p className="text-[10px] text-slate-400">
                납 {formatCurrency(billingSummary.tuitionPaid)} · 미{' '}
                <span className={billingSummary.tuitionUnpaid > 0 ? 'text-rose-600 font-bold' : ''}>
                  {formatCurrency(billingSummary.tuitionUnpaid)}
                </span>
              </p>
            </div>
            <div className="bg-white rounded-xl p-2 border border-slate-100">
              <p className="text-[10px] text-slate-500">교재비 (일회성)</p>
              <p className="text-sm font-black text-slate-900">
                {(billingSummary.textbookBilled || 0) > 0
                  ? formatCurrency(billingSummary.textbookBilled)
                  : '-'}
              </p>
              <p className="text-[10px] text-slate-400">
                {(billingSummary.textbookBilled || 0) > 0
                  ? `납 ${formatCurrency(billingSummary.textbookPaid)} · 미 ${formatCurrency(billingSummary.textbookUnpaid)}`
                  : '구매 없음'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-2 border border-slate-100">
              <p className="text-[10px] text-slate-500">총 납부</p>
              <p className="text-sm font-black text-emerald-700">
                {formatCurrency(billingSummary.totalPaid)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-2 border border-slate-100">
              <p className="text-[10px] text-slate-500">총 미납</p>
              <p className="text-sm font-black text-rose-600">
                {formatCurrency(billingSummary.totalUnpaid)}
              </p>
            </div>
          </div>
        </div>
      )}

      {(unpaidInvoices.length > 0 || unpaidTextbookSales.length > 0) && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3 space-y-2">
          <p className="text-xs font-bold text-rose-800">미납 항목</p>
          {unpaidInvoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-2 text-xs bg-white rounded-xl px-3 py-2 border border-rose-100"
            >
              <span className="font-semibold text-slate-800">
                월회비 {inv.yearMonth} · {formatCurrency(inv.unpaidAmount)}
              </span>
              <button
                type="button"
                onClick={() => onOpenPayModal(inv)}
                className="min-h-[36px] px-2.5 font-bold text-emerald-700"
              >
                수납
              </button>
            </div>
          ))}
          {unpaidTextbookSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between gap-2 text-xs bg-white rounded-xl px-3 py-2 border border-rose-100"
              >
                <span className="font-semibold text-slate-800 truncate">
                  교재 {sale.textbookTitle} · {formatCurrency(sale.unpaidAmount)}
                </span>
                {onOpenTextbookPayment && (
                  <button
                    type="button"
                    onClick={() => onOpenTextbookPayment(sale)}
                    className="min-h-[36px] px-2.5 font-bold text-emerald-700 shrink-0"
                  >
                    수납
                  </button>
                )}
              </div>
            ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900">월회비 청구 · 납부</h4>
          <p className="text-xs text-slate-500">납부 시 재무 수입에 자동 반영됩니다</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onOpenTextbookSale && (
            <button
              type="button"
              onClick={onOpenTextbookSale}
              className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer min-h-[44px]"
            >
              <Plus className="w-3.5 h-3.5" /> 교재 수납
            </button>
          )}
        </div>
      </div>

      {onOpenTextbookTab && (
        <button
          type="button"
          onClick={onOpenTextbookTab}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-white"
        >
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            교재 구매·미납 상세
          </span>
          <span className="text-indigo-600">
            {studentSales.length}건
            {(billingSummary?.textbookUnpaid || 0) > 0
              ? ` · 미납 ${formatCurrency(billingSummary!.textbookUnpaid)}`
              : ''}
          </span>
        </button>
      )}

      {payInvoiceId && (
        <form onSubmit={onProcessPayment} className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-3">
          <h5 className="text-xs font-bold text-emerald-900">수강료 수납 처리</h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">수납 금액 (₩)</label>
              <input
                type="number"
                step="1000"
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold min-h-[44px]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">결제 방법</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium min-h-[44px]"
              >
                {ONSITE_PAYMENT_METHOD_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">수납 메모</label>
              <input
                type="text"
                placeholder="영수증 메모..."
                value={payMemo}
                onChange={(e) => setPayMemo(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg min-h-[44px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPayInvoiceId(null)}
              className="px-3 py-2 min-h-[44px] text-xs text-slate-600 bg-white border border-slate-200 rounded-lg"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 min-h-[44px] text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
            >
              수납 완료 저장
            </button>
          </div>
        </form>
      )}

      {allInvoices.length === 0 ? (
        <p className="text-xs text-slate-500 p-8 text-center bg-slate-50 rounded-2xl">
          청구된 월회비 내역이 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {allInvoices.map((inv) => {
            const badge = getInvoiceStatusBadge(inv.status);
            const lastPaymentText = lastTuitionPaymentSummaryText(
              getLatestTuitionPaymentForInvoice(tuitionPayments, inv.id)
            );
            return (
              <div
                key={inv.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">{inv.yearMonth}월 청구서</span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${badge.bg}`}>
                      {badge.label}
                    </span>
                    {inv.receiptNumber && (
                      <span className="text-[10px] font-mono text-slate-400">#{inv.receiptNumber}</span>
                    )}
                  </div>
                  <p className="text-slate-500 mt-1">
                    납부기한: {inv.dueDate} | 총 청구: <strong>{formatCurrency(inv.totalAmount)}</strong>
                    {inv.paidAmount > 0 && ` (납부: ${formatCurrency(inv.paidAmount)})`}
                    {lastPaymentText && ` · 최근 수납 ${lastPaymentText}`}
                    {inv.unpaidAmount > 0 && (
                      <span className="text-rose-600 font-bold">
                        {' '}
                        [미납: {formatCurrency(inv.unpaidAmount)}]
                      </span>
                    )}
                  </p>
                  {((inv.textbookFee || 0) > 0 || (inv.extraFee || 0) > 0) && (
                    <p className="text-[11px] text-indigo-700 mt-1">
                      월회비 {formatCurrency(resolveInvoiceBaseFee(inv))}
                      {(inv.textbookFee || 0) > 0 && ` · 교재 ${formatCurrency(inv.textbookFee || 0)}`}
                      {(inv.extraFee || 0) > 0 &&
                        ` · ${inv.extraFeeLabel || '기타'} ${formatCurrency(inv.extraFee || 0)}`}
                    </p>
                  )}
                  {inv.notes && <p className="text-slate-600 text-[11px] mt-1 italic">{inv.notes}</p>}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {inv.status !== 'paid' && (
                    <button
                      type="button"
                      onClick={() => onOpenPayModal(inv)}
                      className="px-3 py-1.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                    >
                      수납 결제
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
