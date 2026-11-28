import React from 'react';
import type { TuitionInvoice } from '@/capabilities/billing/finance/billingLedgerTypes';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { formatCurrency } from '@/utils/formatters';
import { Printer, Download, X, FileText, CheckCircle2 } from 'lucide-react';
import {
  getLatestTuitionPaymentForInvoice,
} from '@/capabilities/billing/finance/latestTuitionPayment';
import { TuitionService } from '@/capabilities/billing/finance';
import { useEscapeKey } from '@/shared/hooks/useMoaHotkeys';
import { useAsyncLock } from '@/shared/hooks/useAsyncLock';
import { generateReceiptPdfBlob } from '@/shared/components/receipt/PdfReceiptGenerator';
import { formatIssuerLabel } from '@/shared/utils/formatIssuerLabel';

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

  const orgSettings = (currentOrganization?.settings ?? {}) as Record<string, unknown>;
  const orgName = currentOrganization?.name || '모아 센터';
  const representativeRaw =
    (typeof orgSettings.representative === 'string' && orgSettings.representative) ||
    (typeof orgSettings.ownerName === 'string' && orgSettings.ownerName) ||
    (typeof orgSettings.directorName === 'string' && orgSettings.directorName) ||
    '';
  const issuerLabel = formatIssuerLabel({
    organizationName: orgName,
    representative: representativeRaw,
    title: '대표',
  });
  const businessNumber =
    (typeof orgSettings.businessNumber === 'string' && orgSettings.businessNumber) ||
    (typeof orgSettings.biz_number === 'string' && orgSettings.biz_number) ||
    '등록번호 미등록';
  const phone =
    (typeof orgSettings.phone === 'string' && orgSettings.phone) ||
    (typeof orgSettings.contactPhone === 'string' && orgSettings.contactPhone) ||
    '-';
  const address =
    (typeof orgSettings.address === 'string' && orgSettings.address) ||
    (typeof orgSettings.roadAddress === 'string' && orgSettings.roadAddress) ||
    '';
  const sealUrl =
    (typeof orgSettings.sealUrl === 'string' && orgSettings.sealUrl) ||
    (typeof orgSettings.stampImageUrl === 'string' && orgSettings.stampImageUrl) ||
    (typeof orgSettings.seal_image_url === 'string' && orgSettings.seal_image_url) ||
    null;

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

  const { isLocked: isPdfGenerating, runWithLock } = useAsyncLock();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    runWithLock(async () => {
      try {
        const blob = await generateReceiptPdfBlob({
          organizationName: orgName,
          receiptNumber: receiptNo,
          transactionDate: paymentDate,
          customerName: invoice.studentName || '고객',
          subtotal: invoice.totalAmount,
          totalPaid: invoice.paidAmount || invoice.totalAmount,
          paymentMethod: methodText,
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt_${receiptNo}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('PDF receipt generation failed:', err);
      }
    });
  };

  useEscapeKey(onClose);

  const itemTitle = `${invoice.yearMonth} 정기 음악 수강료`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer print:p-0 print:bg-white print:static"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] cursor-default print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none"
      >
        {/* 상단 제목 + 닫기 */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50 no-print min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-800 flex items-center justify-center font-bold shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 text-sm truncate">교육비 수강료 납입증명서</h3>
              <p className="text-[11px] text-slate-400 font-mono truncate">영수번호: {receiptNo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 독립 버튼 바 — 모바일 줄바꿈 방지 */}
        <div className="no-print px-4 sm:px-6 py-2.5 border-b border-slate-100 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isPdfGenerating}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer min-h-[44px] whitespace-nowrap disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="whitespace-nowrap">{isPdfGenerating ? 'PDF 생성 중...' : 'PDF 다운로드'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer min-h-[44px] whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">인쇄</span>
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-700 printable-area print:p-6">
          <div className="text-center pb-4 border-b-2 border-slate-900">
            <span className="text-[11px] font-bold tracking-widest text-slate-800 uppercase">
              Official Tuition Receipt
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              수강료 납입 증명서 (영수증)
            </h2>
            <p className="text-xs text-slate-500 mt-1">소득공제 증빙 및 학부모 제출용</p>
          </div>

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
              <span className="text-slate-400">성명:</span>{' '}
              <span className="font-bold text-slate-900 text-sm">{invoice.studentName}</span>
            </div>
            <div>
              <span className="text-slate-400">수강 대상월:</span>{' '}
              <span className="font-semibold text-slate-800">{invoice.yearMonth}월분</span>
            </div>
            <div>
              <span className="text-slate-400">결제 수단:</span>{' '}
              <span className="font-semibold text-slate-700">{methodText}</span>
            </div>
            <div>
              <span className="text-slate-400">납부 상태:</span>{' '}
              <span className="font-bold text-emerald-600">
                {invoice.status === 'paid' ? '완납 영수' : '부분 납부'}
              </span>
            </div>
          </div>

          {/* 품목명 1줄 전체폭 + 금액 하단 분리 */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-slate-400">
            <div className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 px-3.5 py-2.5 text-xs">
              수강 항목 내역
            </div>
            <div className="p-3.5 space-y-3">
              <p className="w-full text-sm font-bold text-slate-900 leading-snug">{itemTitle}</p>
              {((invoice.textbookFee || 0) > 0 || (invoice.extraFee || 0) > 0) && (
                <p className="text-[11px] text-slate-400">
                  {(invoice.textbookFee || 0) > 0
                    ? `교재비 ₩${Number(invoice.textbookFee).toLocaleString()} 포함`
                    : ''}
                  {(invoice.extraFee || 0) > 0
                    ? ` / 부가비 ₩${Number(invoice.extraFee).toLocaleString()} 포함`
                    : ''}
                </p>
              )}
              <div className="grid grid-cols-3 gap-2 text-xs border-t border-slate-100 pt-3">
                <div className="text-center">
                  <p className="text-slate-400 mb-1 whitespace-nowrap">청구금액</p>
                  <p className="font-mono font-semibold text-slate-700 tabular-nums">
                    {formatCurrency(invoice.baseFee || invoice.totalAmount)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 mb-1 whitespace-nowrap">할인·감면</p>
                  <p className="font-mono font-semibold text-rose-500 tabular-nums">
                    {(invoice.discountAmount ?? invoice.discount ?? 0) > 0
                      ? `-${formatCurrency(invoice.discountAmount ?? invoice.discount ?? 0)}`
                      : '-'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 mb-1 whitespace-nowrap">실수납액</p>
                  <p className="font-mono font-black text-slate-900 tabular-nums">
                    {formatCurrency(invoice.paidAmount || invoice.totalAmount)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs border border-slate-100 print:bg-white print:border-slate-300">
            <div className="flex justify-between text-slate-600">
              <span>총 청구 금액</span>
              <span className="font-bold text-slate-800 tabular-nums">{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-700 font-bold">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-800" />
                실제 수납 납입액 (금회)
              </span>
              <span className="text-sm font-black text-slate-800 tabular-nums">
                {formatCurrency(invoice.paidAmount)}
              </span>
            </div>
            {invoice.unpaidAmount > 0 && (
              <div className="flex justify-between text-rose-600 pt-1 border-t border-slate-200">
                <span>미납 잔액</span>
                <span className="font-bold tabular-nums">{formatCurrency(invoice.unpaidAmount)}</span>
              </div>
            )}
          </div>

          <div className="pt-4 text-center text-xs text-slate-600 space-y-2 border-t border-slate-200 print:border-slate-400">
            <p className="font-semibold text-slate-700">위 금액을 정히 영수·확인합니다.</p>
            <div className="relative inline-flex items-center justify-center gap-2 py-2">
              <span className="text-base font-black text-slate-900 tracking-tight whitespace-nowrap">
                {issuerLabel}
              </span>
              {sealUrl ? (
                <img
                  src={sealUrl}
                  alt="직인"
                  className="w-12 h-12 sm:w-14 sm:h-14 object-contain inline-block ml-1"
                />
              ) : (
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-rose-600 text-rose-600 font-black text-xs tracking-tighter ml-1 rotate-[-8deg] select-none">
                  (인)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono break-keep">
              사업자등록번호: {businessNumber} | 전화: {phone}
              {address && ` | 소재지: ${address}`}
            </p>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
