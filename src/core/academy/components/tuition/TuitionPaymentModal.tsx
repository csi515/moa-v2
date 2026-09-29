import React from 'react';
import { TuitionInvoice, PaymentMethod } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { ONSITE_PAYMENT_METHOD_OPTIONS } from '@/core/finance/paymentMethodLabels';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import { Modal } from '@/shared/components/ui/Modal';

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
    title="결제 완료 처리"
    maxWidth="md"
  >
    <form onSubmit={onSubmit} className="p-6 space-y-4">
      <p className="text-xs text-slate-500 -mt-2">
        {invoice.studentName} ({invoice.yearMonth}월)
      </p>

      {invoice.cashReceiptRequested && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 font-semibold">
          학부모가 현금영수증 발행을 요청했습니다.
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          결제 금액 (₩) <span className="text-rose-500">*</span>
        </label>
        <CurrencyInput
          value={payAmount}
          onChange={onPayAmountChange}
          max={invoice.unpaidAmount}
          showQuickButtons
          autoFocus
        />
        <p className="text-[11px] text-slate-500 mt-1">
          남은 미납금: {formatCurrency(invoice.unpaidAmount)}
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">결제 수단</label>
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
        <label className="block text-xs font-semibold text-slate-700 mb-1">결제 일자</label>
        <input
          type="date"
          value={payDate}
          onChange={(e) => onPayDateChange(e.target.value)}
          className="w-full px-3 py-2.5 min-h-[44px] text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">메모</label>
        <input
          type="text"
          placeholder="예: 광양사랑상품권 바코드 결제 완료"
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
        <span className="text-xs font-semibold text-slate-700">현금영수증 발행 완료</span>
      </label>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 min-h-[44px] text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 min-h-[44px] text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md disabled:opacity-50"
        >
          확인
        </button>
      </div>
    </form>
  </Modal>
);
