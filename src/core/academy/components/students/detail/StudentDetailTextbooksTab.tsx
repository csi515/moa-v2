import React from 'react';
import { TextbookSale, StudentMonthlyBillingSummary } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { BookOpen, Plus } from 'lucide-react';

interface StudentDetailTextbooksTabProps {
  studentSales: TextbookSale[];
  billingSummary: StudentMonthlyBillingSummary;
  onOpenSaleModal: () => void;
  onOpenPaymentModal: (sale: TextbookSale) => void;
  onOpenReceiptModal: (sale: TextbookSale) => void;
}

export const StudentDetailTextbooksTab: React.FC<StudentDetailTextbooksTabProps> = ({
  studentSales,
  billingSummary,
  onOpenSaleModal,
  onOpenPaymentModal,
  onOpenReceiptModal,
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-sm font-bold text-slate-900">교재 구매 이력</h4>
        <p className="text-xs text-slate-500">
          일회성 구매만 기록됩니다. 마스터 가격이 바뀌어도 과거 거래 금액은 유지됩니다. (총{' '}
          {studentSales.length}건)
        </p>
      </div>
      <button
        onClick={onOpenSaleModal}
        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
      >
        <Plus className="w-3.5 h-3.5" /> 새 교재 판매 등록
      </button>
    </div>

    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
      <div>
        <span className="text-slate-400 block">교재 총 구매액</span>
        <span className="font-bold text-slate-900 text-sm">
          {formatCurrency(billingSummary.textbookBilled || 0)}
        </span>
      </div>
      <div>
        <span className="text-slate-400 block">교재비 수납 완료</span>
        <span className="font-bold text-emerald-600 text-sm">
          {formatCurrency(billingSummary.textbookPaid || 0)}
        </span>
      </div>
      <div>
        <span className="text-slate-400 block">교재비 미납 잔액</span>
        <span className="font-black text-rose-600 text-sm">
          {formatCurrency(billingSummary.textbookUnpaid || 0)}
        </span>
      </div>
      <div>
        <span className="text-slate-400 block">전체 총 청구합계</span>
        <span className="font-bold text-indigo-700 text-sm">
          {formatCurrency(billingSummary.totalBilled || 0)}
        </span>
      </div>
    </div>

    {studentSales.length === 0 ? (
      <div className="text-xs text-slate-500 p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
        <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="font-medium">구매한 교재 내역이 없습니다.</p>
        <button
          onClick={onOpenSaleModal}
          className="mt-2 text-indigo-600 font-bold hover:underline inline-block"
        >
          + 첫 교재 지급/판매 등록하기
        </button>
      </div>
    ) : (
      <div className="space-y-3">
        {studentSales.map((sale) => (
          <div
            key={sale.id}
            className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">{sale.textbookTitle}</span>
                <span className="text-slate-400 text-xs">({sale.quantity}권)</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    sale.status === 'paid'
                      ? 'bg-emerald-50 text-emerald-700'
                      : sale.status === 'partial'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {sale.status === 'paid' ? '완납' : sale.status === 'partial' ? '일부납부' : '미납'}
                </span>
              </div>
              <p className="text-slate-500">
                판매일: {sale.saleDate} | 판매금액: <strong>{formatCurrency(sale.totalAmount)}</strong>
                {sale.discount > 0 && ` (할인: ${formatCurrency(sale.discount)})`}
                {sale.paidAmount > 0 && ` [수납: ${formatCurrency(sale.paidAmount)}]`}
                {sale.unpaidAmount > 0 && (
                  <strong className="text-rose-600"> [미납 잔액: {formatCurrency(sale.unpaidAmount)}]</strong>
                )}
              </p>
              {sale.memo && <p className="text-slate-500 text-[11px] italic">{sale.memo}</p>}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {sale.unpaidAmount > 0 && (
                <button
                  onClick={() => onOpenPaymentModal(sale)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  교재비 수납
                </button>
              )}
              <button
                onClick={() => onOpenReceiptModal(sale)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
              >
                영수증
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
