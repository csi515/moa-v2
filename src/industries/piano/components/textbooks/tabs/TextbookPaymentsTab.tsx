import React from 'react';
import { TextbookSale, TextbookPayment } from '@/types';
import { CreditCard } from 'lucide-react';

interface TextbookPaymentsTabProps {
  sales: TextbookSale[];
  payments: TextbookPayment[];
  onOpenPaymentModal: (sale: TextbookSale) => void;
  onOpenReceiptModal: (sale: TextbookSale, payment?: TextbookPayment) => void;
}

export const TextbookPaymentsTab: React.FC<TextbookPaymentsTabProps> = ({
  sales,
  payments,
  onOpenPaymentModal,
  onOpenReceiptModal
}) => {
  const unpaidSales = sales.filter((s) => s.unpaidAmount > 0 && !s.billingInvoiceId);

  return (
    <div className="space-y-6">
      {/* Section 1: 미납/일부납부 대상 집중 처리 목록 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">교재비 미납 및 분할 수납 대상</h3>
              <p className="text-xs text-slate-500">현재 미납 잔액이 남아있는 교재 판매 건입니다.</p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
            총 {unpaidSales.length}건 미납
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {unpaidSales.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400">
              🎉 현재 미납된 교재비가 없습니다! 모든 교재비가 완납되었습니다.
            </div>
          ) : (
            unpaidSales.map((sale) => (
              <div
                key={sale.id}
                className="p-4 rounded-xl border border-rose-100 bg-rose-50/20 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{sale.studentName}</span>
                      <span className="text-xs text-slate-500 block">
                        학부모: {sale.parentName} ({sale.parentPhone})
                      </span>
                    </div>
                    <span className="text-xs font-bold text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-md">
                      {sale.status === 'partial' ? '일부납부' : '미납'}
                    </span>
                  </div>

                  <div className="mt-2 text-xs space-y-1">
                    <p className="text-slate-700 font-medium">교재: {sale.textbookTitle} ({sale.quantity}권)</p>
                    <p className="text-slate-500">판매일: {sale.saleDate} | 총액: ₩{sale.totalAmount.toLocaleString()}</p>
                    <p className="text-slate-500">기수납액: ₩{sale.paidAmount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-rose-100/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">미납 잔액</span>
                    <span className="font-black text-rose-600 text-sm">
                      ₩{sale.unpaidAmount.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => onOpenPaymentModal(sale)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    분할/완납 수납
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section 2: 전체 교재비 납부 이력 (Payment Receipts Log) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">교재비 수납 이력 내역서</h3>
            <p className="text-xs text-slate-500">학생별 교재비 납부 일자 및 영수증 내역입니다.</p>
          </div>
          <span className="text-xs font-medium text-slate-500">총 {payments.length}건 수납 기록</span>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">납부일자</th>
                <th className="py-2.5 px-3">영수증 번호</th>
                <th className="py-2.5 px-3">학생명</th>
                <th className="py-2.5 px-3">교재명</th>
                <th className="py-2.5 px-3 text-right">수납 금액</th>
                <th className="py-2.5 px-3 text-center">결제수단</th>
                <th className="py-2.5 px-3">메모</th>
                <th className="py-2.5 px-3 text-center">영수증</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    수납 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const relatedSale = sales.find((s) => s.id === p.textbookSaleId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-600 font-medium">{p.paymentDate}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{p.receiptNumber}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{p.studentName}</td>
                      <td className="py-2.5 px-3 text-slate-700">{p.textbookTitle}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                        ₩{p.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">
                        {p.paymentMethod === 'card'
                          ? '카드'
                          : p.paymentMethod === 'transfer'
                          ? '계좌이체'
                          : p.paymentMethod === 'cash'
                          ? '현금'
                          : '기타'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{p.memo || '-'}</td>
                      <td className="py-2.5 px-3 text-center">
                        {relatedSale && (
                          <button
                            onClick={() => onOpenReceiptModal(relatedSale, p)}
                            className="px-2 py-0.5 text-[11px] rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            인쇄
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {payments.length === 0 ? (
            <p className="py-8 text-center text-slate-400 text-sm">수납 내역이 없습니다.</p>
          ) : (
            payments.map((p) => {
              const relatedSale = sales.find((s) => s.id === p.textbookSaleId);
              const methodLabel =
                p.paymentMethod === 'card'
                  ? '카드'
                  : p.paymentMethod === 'transfer'
                  ? '계좌이체'
                  : p.paymentMethod === 'cash'
                  ? '현금'
                  : '기타';

              return (
                <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{p.studentName}</p>
                      <p className="text-[11px] text-slate-500">{p.paymentDate} · {methodLabel}</p>
                    </div>
                    <p className="font-black text-emerald-600 text-sm">₩{p.amount.toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-slate-600">{p.textbookTitle}</p>
                  {p.memo && <p className="text-[11px] text-slate-400">{p.memo}</p>}
                  {relatedSale && (
                    <button
                      onClick={() => onOpenReceiptModal(relatedSale, p)}
                      className="w-full py-2.5 min-h-[44px] text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      영수증 인쇄
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
