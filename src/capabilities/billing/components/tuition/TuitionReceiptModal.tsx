import React, { useEffect } from 'react';
import type { TuitionInvoice } from '@/capabilities/billing/finance/billingLedgerTypes';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { formatCurrency } from '@/utils/formatters';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';
import {
  getLatestTuitionPaymentForInvoice,
} from '@/capabilities/billing/finance/latestTuitionPayment';
import { TuitionService } from '@/capabilities/billing/finance';

interface TuitionReceiptModalProps {
  invoice: TuitionInvoice;
  onClose: () => void;
}

export const TuitionReceiptModal: React.FC<TuitionReceiptModalProps> = ({
  invoice,
  onClose,
}) => {
  const { currentOrganization } = useOrganization();
  const tuitionPayments = TuitionService.getTuitionPayments();
  const latestPayment = getLatestTuitionPaymentForInvoice(tuitionPayments, invoice.id);

  const orgSettings = (currentOrganization?.settings ?? {}) as Record<string, any>;
  const orgName = currentOrganization?.name || '음악학원';
  const representative = orgSettings.representative || orgSettings.ownerName || '원장';
  const businessNumber = orgSettings.businessNumber || orgSettings.biz_number || '등록번호 미등록';
  const phone = orgSettings.phone || orgSettings.contactPhone || '-';
  const address = orgSettings.address || orgSettings.roadAddress || '';
  const sealUrl = orgSettings.sealUrl || orgSettings.stampImageUrl || null;

  const receiptNo = latestPayment?.receiptNumber || `RCP-TUI-${invoice.id.slice(0, 8).toUpperCase()}`;
  const paymentDate = latestPayment?.paymentDate
    ? latestPayment.paymentDate.slice(0, 10)
    : latestPayment?.createdAt
    ? latestPayment.createdAt.slice(0, 10)
    : invoice.paidDate
    ? invoice.paidDate.slice(0, 10)
    : invoice.paidAt
    ? invoice.paidAt.slice(0, 10)
    : invoice.dueDate;

  const paymentMethodLabel: Record<string, string> = {
    card: '신용/체크카드',
    transfer: '계좌이체',
    cash: '현금',
    other: '기타 결제',
  };

  const methodText = latestPayment?.paymentMethod
    ? paymentMethodLabel[latestPayment.paymentMethod] || latestPayment.paymentMethod
    : '수납 확인';

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer print:p-0 print:bg-white print:static"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] cursor-default print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none"
      >
        {/* 상단 툴바 (인쇄 시 숨김) */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">교육비 수강료 납입증명서</h3>
              <p className="text-[11px] text-slate-400 font-mono">영수번호: {receiptNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              인쇄 / PDF 저장
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 인쇄 본문 영역 */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-700 printable-area print:p-6">
          {/* 헤더 타이틀 */}
          <div className="text-center pb-4 border-b-2 border-slate-900">
            <span className="text-[11px] font-bold tracking-widest text-indigo-600 uppercase">
              Official Tuition Receipt
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              수강료 납입 증명서 (영수증)
            </h2>
            <p className="text-xs text-slate-500 mt-1">소득공제 증빙 및 학부모 제출용</p>
          </div>

          {/* 메타 정보 테이블 */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100 print:bg-white print:border-slate-300">
            <div>
              <span className="text-slate-400">발행일자:</span>{' '}
              <span className="font-semibold text-slate-800 font-mono">{paymentDate}</span>
            </div>
            <div>
              <span className="text-slate-400">영수증 번호:</span>{' '}
              <span className="font-semibold text-slate-800 font-mono">{receiptNo}</span>
            </div>
            <div>
              <span className="text-slate-400">원생(학생)명:</span>{' '}
              <span className="font-bold text-slate-900 text-sm">{invoice.studentName}</span>
            </div>
            <div>
              <span className="text-slate-400">수강 대상월:</span>{' '}
              <span className="font-semibold text-slate-800">{invoice.yearMonth}월분</span>
            </div>
            <div>
              <span className="text-slate-400">결제 수단:</span>{' '}
              <span className="font-semibold text-indigo-700">{methodText}</span>
            </div>
            <div>
              <span className="text-slate-400">납부 상태:</span>{' '}
              <span className="font-bold text-emerald-600">
                {invoice.status === 'paid' ? '완납 영수' : '부분 납부'}
              </span>
            </div>
          </div>

          {/* 내역 명세 테이블 */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-slate-400">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 print:bg-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">수강 항목</th>
                  <th className="py-2.5 px-3 text-right">기본 수강료</th>
                  <th className="py-2.5 px-3 text-right">할인·감면</th>
                  <th className="py-2.5 px-3.5 text-right">실 청구액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                <tr>
                  <td className="py-3.5 px-3.5 font-medium text-slate-900">
                    <p className="font-bold">{invoice.yearMonth} 정기 음악 수강료</p>
                    {((invoice.textbookFee || 0) > 0 || (invoice.extraFee || 0) > 0) && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {(invoice.textbookFee || 0) > 0 ? `교재비 ₩${Number(invoice.textbookFee).toLocaleString()} 포함` : ''}
                        {(invoice.extraFee || 0) > 0 ? ` / 부가비 ₩${Number(invoice.extraFee).toLocaleString()} 포함` : ''}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right text-slate-600 font-mono">
                    {formatCurrency(invoice.baseFee || invoice.totalAmount)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-rose-500 font-mono">
                    {(invoice.discountAmount ?? invoice.discount ?? 0) > 0
                      ? `-${formatCurrency(invoice.discountAmount ?? invoice.discount ?? 0)}`
                      : '-'}
                  </td>
                  <td className="py-3.5 px-3.5 text-right font-black text-slate-900 font-mono">
                    {formatCurrency(invoice.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 수납 요약 박스 */}
          <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs border border-slate-100 print:bg-white print:border-slate-300">
            <div className="flex justify-between text-slate-600">
              <span>총 청구 금액</span>
              <span className="font-bold text-slate-800">{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-indigo-700 font-bold">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                실제 수납 납입액 (금회)
              </span>
              <span className="text-sm font-black text-indigo-800">
                {formatCurrency(invoice.paidAmount)}
              </span>
            </div>
            {invoice.unpaidAmount > 0 && (
              <div className="flex justify-between text-rose-600 pt-1 border-t border-slate-200">
                <span>미납 잔액</span>
                <span className="font-bold">{formatCurrency(invoice.unpaidAmount)}</span>
              </div>
            )}
          </div>

          {/* 직인 및 사업장 서명란 */}
          <div className="pt-4 text-center text-xs text-slate-600 space-y-2 border-t border-slate-200 print:border-slate-400">
            <p className="font-semibold text-slate-700">위 금액을 정히 영수·확인합니다.</p>
            <div className="relative inline-flex items-center justify-center gap-2 py-2">
              <span className="text-base font-black text-slate-900 tracking-tight">
                {orgName} 대표 {representative}
              </span>
              {sealUrl ? (
                <img
                  src={sealUrl}
                  alt="학원 직인"
                  className="w-12 h-12 object-contain inline-block ml-1"
                />
              ) : (
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-rose-600 text-rose-600 font-black text-xs tracking-tighter ml-1 rotate-[-8deg] select-none">
                  (인)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              사업자등록번호: {businessNumber} | 전화: {phone}
              {address && ` | 소재지: ${address}`}
            </p>
          </div>
        </div>

        {/* 하단 닫기 (인쇄 시 숨김) */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
