import React, { useState } from 'react';
import { TextbookSale, PaymentMethod } from '@/types';
import { StorageService } from '@/services/storage';
import { useApp } from '@/context/AppContext';
import { X, CreditCard, CheckCircle2, Calculator, ArrowRight, FileText } from 'lucide-react';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import { todayIsoLocal } from '@/shared/utils/localDate';

interface TextbookPaymentModalProps {
  sale: TextbookSale;
  onSuccess: (paymentId: string) => void;
  onClose: () => void;
}

export const TextbookPaymentModal: React.FC<TextbookPaymentModalProps> = ({
  sale,
  onSuccess,
  onClose
}) => {
  const { showToast } = useApp();
  const [payAmount, setPayAmount] = useState<number>(sale.unpaidAmount);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [paymentDate, setPaymentDate] = useState(todayIsoLocal);
  const [memo, setMemo] = useState('');

  const validAmount = Math.min(sale.unpaidAmount, Math.max(0, payAmount));
  const remainingAfterPayment = Math.max(0, sale.unpaidAmount - validAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validAmount <= 0) {
      alert('납부 금액은 0원보다 커야 합니다.');
      return;
    }
    if (sale.billingInvoiceId) {
      showToast('월 청구에 합산된 교재입니다. 수강료 청구서에서 수납해 주세요.', 'warning');
      return;
    }

    try {
      const res = await StorageService.recordTextbookPayment(
        sale.id,
        validAmount,
        paymentMethod,
        paymentDate,
        memo.trim()
      );

      showToast(
        `₩${validAmount.toLocaleString()} 교재비 수납이 완료되었습니다! (잔액: ₩${res.updatedSale.unpaidAmount.toLocaleString()})`,
        'success'
      );
      onSuccess(res.payment.id);
    } catch (err: any) {
      alert(err.message || '교재비 납부 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">교재비 수납 (분할/완납)</h3>
              <p className="text-xs text-slate-500">학생 교재비 미납 잔액에 대한 수납을 처리합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Summary Banner */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">학생명:</span>
              <span className="font-bold text-slate-900 text-sm">{sale.studentName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">교재명 / 수량:</span>
              <span className="font-medium text-slate-800">{sale.textbookTitle} ({sale.quantity}권)</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">판매일 / 판매금액:</span>
              <span className="text-slate-700">{sale.saleDate} / ₩{sale.totalAmount.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="font-semibold text-slate-600">현재 미납 잔액:</span>
              <span className="font-black text-rose-600 text-base">₩{sale.unpaidAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-semibold">
                이번 납부할 금액 (₩) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setPayAmount(sale.unpaidAmount)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
              >
                전액 완납(₩{sale.unpaidAmount.toLocaleString()}) 적용
              </button>
            </div>
            <CurrencyInput
              value={payAmount}
              onChange={setPayAmount}
              max={sale.unpaidAmount}
              showQuickButtons
              autoFocus
            />
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">결제 방법</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="card">신용 / 체크카드</option>
                <option value="transfer">계좌이체</option>
                <option value="cash">현금</option>
                <option value="other">기타 / 간편결제</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">납부 일자</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Memo */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">수납 메모</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 2차 분할 납부, 학부모 카드 현장 결제 등"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Real-time Calculation Result */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">납부 후 잔액:</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm mt-0.5">
                <span className="text-slate-400 line-through">₩{sale.unpaidAmount.toLocaleString()}</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                <span className={remainingAfterPayment === 0 ? 'text-emerald-600' : 'text-amber-600'}>
                  ₩{remainingAfterPayment.toLocaleString()} ({remainingAfterPayment === 0 ? '완납' : '일부납부'})
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200 font-medium">
                영수증 자동 발급
              </span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              ₩{validAmount.toLocaleString()} 수납 처리
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
