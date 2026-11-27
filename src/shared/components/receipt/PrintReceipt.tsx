import React from 'react';

const PRINT_RECEIPT_STYLES = `
.receipt-screen-container {
  max-width: 380px;
  margin: 0 auto;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #1e293b;
}

@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  body * {
    visibility: hidden;
  }

  .no-print,
  nav,
  header,
  footer,
  aside,
  button {
    display: none !important;
  }

  .receipt-screen-container,
  .receipt-screen-container * {
    visibility: visible;
  }

  .receipt-screen-container {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 76mm !important;
    max-width: 76mm !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 2mm !important;
    margin: 0 !important;
    font-size: 11px !important;
    line-height: 1.3 !important;
    box-shadow: none !important;
  }

  @page {
    size: 80mm auto;
    margin: 2mm;
  }
}
`;

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface ReceiptProps {
  organizationName: string;
  businessNumber?: string;
  phoneNumber?: string;
  address?: string;
  receiptNumber: string;
  transactionDate: string;
  customerName?: string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount?: number;
  pointsUsed?: number;
  totalPaid: number;
  paymentMethod?: string; // 카드, 현금, 계좌이체 등
  cardInfo?: {
    cardCompany?: string;
    cardNumberMasked?: string;
    approvalNumber?: string;
  };
  footerNote?: string;
  onClose?: () => void;
}

export const PrintReceipt: React.FC<ReceiptProps> = ({
  organizationName,
  businessNumber,
  phoneNumber,
  address,
  receiptNumber,
  transactionDate,
  customerName,
  items,
  subtotal,
  discountAmount = 0,
  pointsUsed = 0,
  totalPaid,
  paymentMethod = '신용카드',
  cardInfo,
  footerNote,
  onClose,
}) => {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="flex flex-col items-center">
      <style dangerouslySetInnerHTML={{ __html: PRINT_RECEIPT_STYLES }} />
      {/* 화면 상단 조작 버튼 (인쇄 시 자동 숨김) */}
      <div className="no-print mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition shadow-xs"
        >
          영수증 인쇄 (Ctrl+P)
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition"
          >
            닫기
          </button>
        )}
      </div>

      {/* 80mm/58mm 감열 영수증 본체 */}
      <div className="receipt-screen-container text-slate-800 text-xs">
        {/* 매장 헤더 */}
        <div className="text-center pb-2 border-b border-dashed border-slate-300">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">{organizationName}</h2>
          {businessNumber && <p className="text-[11px] text-slate-500 mt-0.5">사업자등록번호: {businessNumber}</p>}
          {phoneNumber && <p className="text-[11px] text-slate-500">전화번호: {phoneNumber}</p>}
          {address && <p className="text-[11px] text-slate-500">{address}</p>}
        </div>

        {/* 거래 기본 정보 */}
        <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
          <div className="flex justify-between">
            <span className="text-slate-500">영수증 번호:</span>
            <span className="font-mono">{receiptNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">발행 일시:</span>
            <span>{transactionDate}</span>
          </div>
          {customerName && (
            <div className="flex justify-between">
              <span className="text-slate-500">고객명:</span>
              <span className="font-medium">{customerName}</span>
            </div>
          )}
        </div>

        {/* 품목 리스트 */}
        <div className="py-2 border-b border-dashed border-slate-300">
          <div className="flex justify-between text-slate-400 font-semibold mb-1 text-[11px]">
            <span>품목</span>
            <span>수량 / 금액</span>
          </div>
          <div className="space-y-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <span className="truncate pr-2 font-medium">{item.name}</span>
                <span className="whitespace-nowrap font-mono">
                  {item.quantity > 1 ? `${item.quantity} x ` : ''}
                  {item.amount.toLocaleString()}원
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 결제 금액 집계 */}
        <div className="py-2 border-b border-slate-800 text-[11px] space-y-1">
          <div className="flex justify-between text-slate-600">
            <span>주문 금액</span>
            <span className="font-mono">{subtotal.toLocaleString()}원</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>할인 금액</span>
              <span className="font-mono">-{discountAmount.toLocaleString()}원</span>
            </div>
          )}
          {pointsUsed > 0 && (
            <div className="flex justify-between text-blue-600">
              <span>포인트 사용</span>
              <span className="font-mono">-{pointsUsed.toLocaleString()}P</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 text-sm font-bold text-slate-900">
            <span>총 결제금액</span>
            <span className="font-mono text-base">{totalPaid.toLocaleString()}원</span>
          </div>
        </div>

        {/* 결제 수단 정보 */}
        <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
          <div className="flex justify-between">
            <span className="text-slate-500">결제 수단:</span>
            <span>{paymentMethod}</span>
          </div>
          {cardInfo && (
            <>
              {cardInfo.cardCompany && (
                <div className="flex justify-between">
                  <span className="text-slate-500">카드사:</span>
                  <span>{cardInfo.cardCompany}</span>
                </div>
              )}
              {cardInfo.cardNumberMasked && (
                <div className="flex justify-between">
                  <span className="text-slate-500">카드번호:</span>
                  <span className="font-mono">{cardInfo.cardNumberMasked}</span>
                </div>
              )}
              {cardInfo.approvalNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">승인번호:</span>
                  <span className="font-mono">{cardInfo.approvalNumber}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="pt-3 text-center text-[10px] text-slate-400">
          {footerNote ? <p>{footerNote}</p> : <p>이용해 주셔서 감사합니다.</p>}
        </div>
      </div>
    </div>
  );
};
