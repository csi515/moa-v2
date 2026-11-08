import React from 'react';
import type { TuitionInvoice } from '@/capabilities/billing/finance/billingLedgerTypes';
import type { PaymentMethod } from '@/capabilities/billing/finance/paymentMethod';
import { formatCurrency } from '@/utils/formatters';
import { ONSITE_PAYMENT_METHOD_OPTIONS } from '@/capabilities/billing/finance/paymentMethodLabels';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import { Modal } from '@/shared/components/ui/Modal';
import { MicroGuideTooltip } from '@/shared/components/ui/MicroGuideTooltip';
import {
  PIANO_INVOICE_BUNDLE_PRESETS,
  appendBundleItemToMemo,
} from '@/capabilities/billing/invoiceBundleHelpers';

interface TuitionPaymentModalProps {
  invoice: TuitionInvoice;
  payAmount: number;
  onPayAmountChange: (amount: number) => void;
  payMethod: PaymentMethod;
  onPayMethodChange: (method: PaymentMethod) => void;
  payMemo: string;
  onPayMemoChange: (memo: string) => void;
  payDate: string;
  onPayDateChange: (date: string) => void;
  cashReceiptIssued: boolean;
  onCashReceiptIssuedChange: (value: boolean) => void;
  submitting?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

/** 수기 완납 처리 — shared Modal 사용 (CODING_STANDARDS) */
export const TuitionPaymentModal: React.FC<TuitionPaymentModalProps> = ({
  invoice,
  payAmount,
  onPayAmountChange,
  payMethod,
  onPayMethodChange,
  payMemo,
  onPayMemoChange,
  payDate,
  onPayDateChange,
  cashReceiptIssued,
  onCashReceiptIssuedChange,
  submitting = false,
  onSubmit,
  onClose,
}) => (
  <Modal
    isOpen
    onClose={onClose}
    title="수강료 수납 완료 처리"
    description={`${invoice.studentName} (${invoice.yearMonth}월)`}
    maxWidth="md"
    footer={
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 min-h-[44px] text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
        >
          취소
        </button>
        <button
          type="submit"
          form="tuition-payment-form"
          disabled={submitting || payAmount <= 0}
          className="px-5 py-2.5 min-h-[44px] text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer"
        >
          {submitting ? '수납 처리 중…' : '수납 확인'}
        </button>
      </div>
    }
  >
    <form id="tuition-payment-form" onSubmit={onSubmit} className="p-6 space-y-4">
      {invoice.cashReceiptRequested && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 font-semibold">
          학부모가 현금영수증 발행을 요청했습니다.
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          수납 금액 (₩) <span className="text-rose-500">*</span>
        </label>
        <CurrencyInput
          value={payAmount}
          onChange={onPayAmountChange}
          max={invoice.unpaidAmount + 500000}
          showQuickButtons
          autoFocus
        />
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="text-[10px] text-slate-400 font-bold">원페이퍼 묶음 합산:</span>
          {PIANO_INVOICE_BUNDLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                onPayAmountChange((payAmount || 0) + preset.amount);
                onPayMemoChange(appendBundleItemToMemo(payMemo, preset.label, preset.amount));
              }}
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              +{preset.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          기본 미납금: {formatCurrency(invoice.unpaidAmount)} (교재비·행사비 묶음 수납 가능)
        </p>
        {payAmount <= 0 && (
          <p className="text-[11px] text-rose-600 font-semibold mt-1" data-testid="pay-amount-invalid">
            0원 이하는 수납할 수 없습니다. 금액을 입력해 주세요.
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">수납 수단</label>
        <div className="grid grid-cols-2 gap-2">
          {ONSITE_PAYMENT_METHOD_OPTIONS.map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => onPayMethodChange(m.id)}
              className={`py-2.5 min-h-[44px] text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                payMethod === m.id
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">수납 일자</label>
        <input
          type="date"
          value={payDate}
          onChange={(e) => onPayDateChange(e.target.value)}
          className="w-full px-3 py-2.5 min-h-[44px] text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">수납 메모</label>
        <input
          type="text"
          placeholder="예: 지역사랑상품권 / 계좌이체 확인 완료"
          value={payMemo}
          onChange={(e) => onPayMemoChange(e.target.value)}
          className="w-full px-3 py-2.5 min-h-[44px] text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
        />
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 min-h-[44px] cursor-pointer">
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-slate-300 text-emerald-600"
          checked={cashReceiptIssued}
          onChange={(e) => onCashReceiptIssuedChange(e.target.checked)}
        />
        <span className="text-xs font-semibold text-slate-700">
          현장에서 현금영수증을 발행함 (기록용) <MicroGuideTooltip guideKey="cash_receipt" />
        </span>
      </label>
      <p className="text-[10px] text-slate-400 -mt-2">
        국세청·PG 자동 발행이 아닙니다. 학원에서 직접 발행한 경우만 체크하세요.
      </p>

      </form>
  </Modal>
);
