import React, { useState } from 'react';
import { Student, PaymentMethod } from '@/types';
import { TuitionService } from '@/core/finance';
import { useCombinedPaymentSubmit } from '@/core/finance/application/useCombinedPaymentSubmit';
import {
  buildCombinedPaymentRequest,
  clampPayableAmount,
  sumSelectedPayable,
  unpaidCombinedBillingLines,
} from '@/core/finance/application/combinedPaymentSelection';
import { usePermissions } from '@/core/auth/usePermissions';
import { getCustomerLabel } from '@/core/industry/industryUi';
import { useModuleLabels } from '@/core/labels';
import { Modal } from '@/shared/components/ui/Modal';
import { CreditCard, CheckSquare, Square, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { ONSITE_PAYMENT_METHOD_OPTIONS } from '@/core/finance/paymentMethodLabels';
import { todayIsoLocal } from '@/shared/utils/localDate';

interface CombinedPaymentModalProps {
  student: Student;
  yearMonth?: string;
  customerLabel?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const CombinedPaymentModal: React.FC<CombinedPaymentModalProps> = ({
  student,
  yearMonth,
  customerLabel: customerLabelProp,
  onSuccess,
  onClose,
}) => {
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const customerLabel = customerLabelProp || labels.customer.singular || getCustomerLabel(industry);
  const { submit, submitting } = useCombinedPaymentSubmit({
    studentName: student.name,
    customerLabel,
    onSuccess,
  });

  const billingSummary = TuitionService.getStudentBillingSummary(student.id, yearMonth);
  const { invoices: unpaidInvoices, sales: unpaidSales } = unpaidCombinedBillingLines(billingSummary);

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>(
    unpaidInvoices.map((i) => i.id)
  );
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>(unpaidSales.map((s) => s.id));
  const [invoiceAmounts, setInvoiceAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(unpaidInvoices.map((i) => [i.id, i.unpaidAmount]))
  );
  const [saleAmounts, setSaleAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(unpaidSales.map((s) => [s.id, s.unpaidAmount]))
  );

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('onsite_card');
  const [paymentDate, setPaymentDate] = useState(todayIsoLocal);
  const [memo, setMemo] = useState('');

  const selectedInvoiceTotal = sumSelectedPayable(unpaidInvoices, selectedInvoiceIds, invoiceAmounts);
  const selectedSaleTotal = sumSelectedPayable(unpaidSales, selectedSaleIds, saleAmounts);
  const grandSelectedTotal = selectedInvoiceTotal + selectedSaleTotal;

  const toggleInvoice = (id: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSale = (id: string) => {
    setSelectedSaleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      buildCombinedPaymentRequest({
        studentId: student.id,
        yearMonth,
        invoices: unpaidInvoices,
        sales: unpaidSales,
        selectedInvoiceIds,
        selectedSaleIds,
        invoiceAmounts,
        saleAmounts,
        paymentMethod,
        paymentDate,
        memo,
      })
    );
  };

  return (
    <Modal isOpen onClose={onClose} title={`${student.name} · 통합 수납`} maxWidth="xl">
      <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
        <p className="text-xs text-slate-500 -mt-2 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-600" />
          항목별 납부 금액을 지정합니다. 자동 배분은 하지 않습니다.
        </p>

        <div className="space-y-2">
          <span className="font-bold text-slate-800">미납 수강료 ({unpaidInvoices.length})</span>
          {unpaidInvoices.length === 0 ? (
            <p className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center">미납 수강료 없음</p>
          ) : (
            unpaidInvoices.map((inv) => {
              const isChecked = selectedInvoiceIds.includes(inv.id);
              return (
                <div
                  key={inv.id}
                  className={`p-3 rounded-xl border space-y-2 ${
                    isChecked ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleInvoice(inv.id)}
                    className="w-full flex items-center justify-between gap-2 text-left min-h-[44px]"
                  >
                    <span className="flex items-center gap-2">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="font-bold text-slate-900">{inv.yearMonth} 수강료</span>
                    </span>
                    <span className="text-rose-600 font-black">
                      잔액 {formatCurrency(inv.unpaidAmount)}
                    </span>
                  </button>
                  {isChecked && (
                    <label className="block">
                      <span className="text-[11px] text-slate-500">이번 납부액</span>
                      <input
                        type="number"
                        min={0}
                        max={inv.unpaidAmount}
                        value={invoiceAmounts[inv.id] ?? 0}
                        onChange={(e) =>
                          setInvoiceAmounts((prev) => ({
                            ...prev,
                            [inv.id]: clampPayableAmount(Number(e.target.value) || 0, inv.unpaidAmount),
                          }))
                        }
                        className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold min-h-[44px]"
                      />
                    </label>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <span className="font-bold text-slate-800">미납 교재비 ({unpaidSales.length})</span>
          {unpaidSales.length === 0 ? (
            <p className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center">미납 교재비 없음</p>
          ) : (
            unpaidSales.map((sale) => {
              const isChecked = selectedSaleIds.includes(sale.id);
              return (
                <div
                  key={sale.id}
                  className={`p-3 rounded-xl border space-y-2 ${
                    isChecked ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSale(sale.id)}
                    className="w-full flex items-center justify-between gap-2 text-left min-h-[44px]"
                  >
                    <span className="flex items-center gap-2">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="font-bold text-slate-900">{sale.textbookTitle}</span>
                    </span>
                    <span className="text-rose-600 font-black">
                      잔액 {formatCurrency(sale.unpaidAmount)}
                    </span>
                  </button>
                  {isChecked && (
                    <label className="block">
                      <span className="text-[11px] text-slate-500">이번 납부액</span>
                      <input
                        type="number"
                        min={0}
                        max={sale.unpaidAmount}
                        value={saleAmounts[sale.id] ?? 0}
                        onChange={(e) =>
                          setSaleAmounts((prev) => ({
                            ...prev,
                            [sale.id]: clampPayableAmount(Number(e.target.value) || 0, sale.unpaidAmount),
                          }))
                        }
                        className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold min-h-[44px]"
                      />
                    </label>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">결제 방법</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white min-h-[44px]"
            >
              {ONSITE_PAYMENT_METHOD_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
              <option value="card">신용/체크카드</option>
              <option value="other">기타</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1">수납 일자</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white min-h-[44px]"
            />
          </div>
        </div>

        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="수납 메모 (선택)"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white min-h-[44px]"
        />

        <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[11px]">이번 납부 합계</span>
            <span className="text-xs text-slate-300">
              수강료 {formatCurrency(selectedInvoiceTotal)} + 교재{' '}
              {formatCurrency(selectedSaleTotal)}
            </span>
          </div>
          <span className="text-xl font-black text-emerald-400">
            {formatCurrency(grandSelectedTotal)}
          </span>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-xl min-h-[44px]"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={grandSelectedTotal <= 0 || submitting}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 text-white disabled:opacity-50 min-h-[44px]"
          >
            <CheckCircle2 className="w-4 h-4" />
            수납 · 수입 반영 ({formatCurrency(grandSelectedTotal)})
          </button>
        </div>
      </form>
    </Modal>
  );
};
