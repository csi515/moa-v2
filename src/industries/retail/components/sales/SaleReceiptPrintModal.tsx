import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/shared/components';
import { formatCurrency } from '@/utils/formatters';
import {
  formatSaleNumber,
  SALE_PAYMENT_METHOD_LABELS,
  type SaleItem,
  type SalePaymentMethod,
  type SplitPaymentDetail,
} from '../../types/sale';
import { useOrganization } from '@/core/organizations/OrganizationProvider';

export interface ReceiptData {
  id: string;
  createdAt: string;
  totalAmount: number;
  pointsUsed?: number | null;
  paymentMethod: SalePaymentMethod;
  customerName?: string | null;
  splitDetail?: SplitPaymentDetail | null;
  items: Array<{
    productNameSnapshot: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    lineAmount: number;
  }>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
}

export const SaleReceiptPrintModal: React.FC<Props> = ({ isOpen, onClose, receipt }) => {
  const { currentOrganization } = useOrganization();
  const orgName = currentOrganization?.name || '모아 스토어';

  if (!isOpen || !receipt) return null;

  // 부가세 계산 (과세 10% 분리)
  const total = receipt.totalAmount;
  const supplyAmount = Math.round(total / 1.1);
  const vatAmount = total - supplyAmount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="영수증 출력" maxWidth="sm">
      <div className="flex flex-col max-h-[85vh]">
        {/* 영수증 미리보기 영문/한글 감열지 레이아웃 (Print 시 이 영역만 최적화) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          <div
            id="moa-receipt-content"
            className="w-full max-w-[320px] bg-white p-5 shadow-sm border border-slate-200 text-slate-800 font-mono text-xs leading-relaxed space-y-4 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full"
          >
            {/* 헤더 */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-base font-bold text-slate-900 tracking-tight font-sans">
                {orgName}
              </h2>
              <p className="text-[11px] text-slate-500">영수증 (매출전표)</p>
            </div>

            {/* 영수증 정보 */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">영수증No:</span>
                <span className="font-bold">{formatSaleNumber(receipt.id)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">거래일시:</span>
                <span>{new Date(receipt.createdAt).toLocaleString('ko-KR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">고객구분:</span>
                <span>{receipt.customerName ? `${receipt.customerName} 고객님` : '일반 고객'}</span>
              </div>
            </div>

            {/* 품목 리스트 */}
            <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-slate-600 border-b border-slate-100 pb-1">
                <span>상품명 / 수량</span>
                <span>금액</span>
              </div>
              {receipt.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span className="truncate max-w-[190px]">{item.productNameSnapshot}</span>
                    <span>{formatCurrency(item.lineAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>
                      {formatCurrency(item.unitPrice)} × {item.quantity}개
                    </span>
                    {item.discountAmount > 0 && (
                      <span className="text-rose-600">할인 -{formatCurrency(item.discountAmount)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 금액 합계 및 부가세 */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>공급가액</span>
                <span>{formatCurrency(supplyAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>부가세 (10%)</span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>총 결제금액</span>
                <span className="text-teal-700">{formatCurrency(receipt.totalAmount)}</span>
              </div>
            </div>

            {/* 결제 수단 */}
            <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between font-bold">
                <span className="text-slate-600">결제방식</span>
                <span>{receipt.splitDetail ? '복합 결제 (현금+카드)' : SALE_PAYMENT_METHOD_LABELS[receipt.paymentMethod] || receipt.paymentMethod}</span>
              </div>
              {receipt.splitDetail && (
                <div className="bg-slate-50 p-1.5 rounded space-y-0.5 text-[10px] text-slate-600">
                  <div className="flex justify-between">
                    <span>· 현금 수납:</span>
                    <span className="font-bold">{formatCurrency(receipt.splitDetail.cashAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>· 카드 결제:</span>
                    <span className="font-bold">{formatCurrency(receipt.splitDetail.cardAmount)}</span>
                  </div>
                </div>
              )}
              {receipt.pointsUsed != null && receipt.pointsUsed > 0 && (
                <div className="flex justify-between text-teal-700">
                  <span>포인트 사용</span>
                  <span>-{receipt.pointsUsed.toLocaleString()}P</span>
                </div>
              )}
            </div>

            {/* 하단 푸터 안내문구 */}
            <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-dashed border-slate-300 space-y-0.5">
              <p>교환/환불은 영수증 지참 시 7일 이내 가능합니다.</p>
              <p className="font-sans font-medium text-slate-500">이용해 주셔서 감사합니다.</p>
            </div>
          </div>
        </div>

        {/* 인쇄 및 닫기 버튼 바 */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 min-h-[44px] rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            영수증 인쇄하기
          </button>
        </div>
      </div>
    </Modal>
  );
};
