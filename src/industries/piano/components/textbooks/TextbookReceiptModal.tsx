import React from 'react';
import { TextbookSale, TextbookPayment } from '@/types';
import { useApp } from '@/context/AppContext';
import { Printer, X, CheckCircle2, FileText, Building2, Calendar, User, BookOpen, CreditCard } from 'lucide-react';

interface TextbookReceiptModalProps {
  sale: TextbookSale;
  payment?: TextbookPayment;
  onClose: () => void;
}

export const TextbookReceiptModal: React.FC<TextbookReceiptModalProps> = ({
  sale,
  payment,
  onClose
}) => {
  const { academySettings } = useApp() as any;

  const handlePrint = () => {
    window.print();
  };

  const receiptNo = payment?.receiptNumber || `RCP-TB-${sale.id.replace('ts-', '')}`;
  const receiptDate = payment?.paymentDate || sale.saleDate;
  const paymentMethodLabel: Record<string, string> = {
    card: '신용/체크카드',
    transfer: '계좌이체',
    cash: '현금',
    other: '기타'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header (No print) */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">교재비 납부 영수증</h3>
              <p className="text-xs text-slate-500">영수증 번호: {receiptNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              인쇄 / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 printable-area">
          {/* Academy Info Header */}
          <div className="text-center pb-4 border-b-2 border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {academySettings.name || '하모니 피아노 음악학원'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">교재비 수납 영수증 (간이)</p>
          </div>

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400">발행일자:</span>{' '}
              <span className="font-medium text-slate-700">{receiptDate}</span>
            </div>
            <div>
              <span className="text-slate-400">영수증 번호:</span>{' '}
              <span className="font-medium text-slate-700">{receiptNo}</span>
            </div>
            <div>
              <span className="text-slate-400">학생명:</span>{' '}
              <span className="font-bold text-slate-900">{sale.studentName}</span>
            </div>
            <div>
              <span className="text-slate-400">학부모:</span>{' '}
              <span className="font-medium text-slate-700">{sale.parentName || '학부모'} ({sale.parentPhone || '-'})</span>
            </div>
            <div>
              <span className="text-slate-400">담당 선생님:</span>{' '}
              <span className="font-medium text-slate-700">{sale.teacherName || '담당 선생님'}</span>
            </div>
            <div>
              <span className="text-slate-400">결제 방법:</span>{' '}
              <span className="font-medium text-slate-700">
                {paymentMethodLabel[payment?.paymentMethod || sale.paymentMethod || 'card'] || '신용카드'}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">품목 (교재명)</th>
                  <th className="py-2.5 px-2 text-center">수량</th>
                  <th className="py-2.5 px-2 text-right">단가</th>
                  <th className="py-2.5 px-2 text-right">할인</th>
                  <th className="py-2.5 px-3 text-right">합계</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-3">
                    <p className="font-medium text-slate-900">{sale.textbookTitle}</p>
                    <p className="text-[11px] text-slate-400">판매일: {sale.saleDate}</p>
                  </td>
                  <td className="py-3 px-2 text-center text-slate-700">{sale.quantity}권</td>
                  <td className="py-3 px-2 text-right text-slate-700">₩{sale.unitPrice.toLocaleString()}</td>
                  <td className="py-3 px-2 text-right text-slate-500">
                    {sale.discount > 0 ? `-₩${sale.discount.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    ₩{sale.totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Breakdown Calculation */}
          <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs border border-slate-100">
            <div className="flex justify-between text-slate-600">
              <span>교재 총 판매금액</span>
              <span className="font-medium">₩{sale.totalAmount.toLocaleString()}</span>
            </div>
            {payment && (
              <div className="flex justify-between text-indigo-600 font-semibold">
                <span>금회 납부 금액</span>
                <span>₩{payment.amount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>총 누적 수납액</span>
              <span className="font-medium text-emerald-600">₩{sale.paidAmount.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-800 text-sm">미납 잔액</span>
              <span className={`text-base font-black ${sale.unpaidAmount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                ₩{sale.unpaidAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Academy Stamp & Verification */}
          <div className="pt-2 text-center text-xs text-slate-500 space-y-1">
            <p>위 금액을 정히 영수(청구)합니다.</p>
            <p className="font-medium text-slate-700">
              {academySettings.name || '하모니 피아노 음악학원'} 대표 {academySettings.representative || '이세진'} (인)
            </p>
            <p className="text-[11px] text-slate-400">
              사업자등록번호: {academySettings.businessNumber || '214-88-99432'} | 전화: {academySettings.phone || '02-588-7723'}
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
