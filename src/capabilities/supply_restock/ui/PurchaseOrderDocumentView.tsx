import React from 'react';
import {
  FileText,
  Printer,
  Copy,
  CheckCircle2,
  Building2,
  Calendar,
  Layers,
  Award,
  Scale,
  ShieldCheck,
  Package,
} from 'lucide-react';
import {
  syncPurchaseOrderToInventoryReceipt,
  type ContractPurchaseOrder,
} from '../domain/procurementPipelineEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

interface PurchaseOrderDocumentViewProps {
  po: ContractPurchaseOrder;
  onSyncToInventory?: (receipts: any[]) => void;
  onClose: () => void;
}

export const PurchaseOrderDocumentView: React.FC<PurchaseOrderDocumentViewProps> = ({
  po,
  onSyncToInventory,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = async () => {
    const textLines = [
      `[공식 발주서 (PO)] ${po.poNumber}`,
      `발주처: 모아 사업장 (구매관리팀)`,
      `수신처(공급사): ${po.vendorName}`,
      `발주일자: ${po.orderDate} / 납기희망일: ${po.deliveryDueDate}`,
      `계약방식: ${po.contractType === 'sole_source' ? '수의계약' : '경쟁입찰'}`,
      `---------------------------------------`,
      ...po.items.map(
        (item, idx) =>
          `${idx + 1}. ${item.itemName} (${item.sku || '-'}) : ${item.quantity}${item.unit} x ${item.unitPrice.toLocaleString()}원 = ${item.subtotal.toLocaleString()}원`
      ),
      `---------------------------------------`,
      `총 발주금액: ${po.totalAmount.toLocaleString()}원 (VAT 포함)`,
      `결재승인: ${po.approverSignatures.map((a) => `${a.role} ${a.name}`).join(', ')}`,
      `구매사유 및 계약근거: ${po.contractRationaleSummary}`,
    ];

    await navigator.clipboard.writeText(textLines.join('\n'));
    showToast('발주서 전문이 클립보드에 복사되었습니다.', 'info');
  };

  const handleSyncInventory = () => {
    const receipts = syncPurchaseOrderToInventoryReceipt(po);
    if (onSyncToInventory) {
      onSyncToInventory(receipts);
    }
    showToast(`발주 품목 ${receipts.length}건이 창고 '입고 대기' 상태로 등록되었습니다.`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* 상단 툴바 */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white">공식 발주서 (Purchase Order) 및 감사 증빙</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
            >
              <Copy className="w-3.5 h-3.5" />
              전문 복사
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              인쇄 / PDF 저장
            </button>
            <button
              type="button"
              onClick={handleSyncInventory}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition shadow-xs"
            >
              <Package className="w-3.5 h-3.5" />
              재고(Inventory) '입고 대기' 연동
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              닫기
            </button>
          </div>
        </div>

        {/* 발주서 본문 (A4 비율 문서 스타일) */}
        <div className="p-8 md:p-12 space-y-6 bg-white text-slate-900 print:p-0">
          {/* 발주서 타이틀 & 번호 */}
          <div className="flex flex-col md:flex-row md:items-start justify-between border-b-2 border-slate-900 pb-5 gap-4">
            <div>
              <span className="px-2.5 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded-sm tracking-wider">
                PURCHASE ORDER
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                발 주 서 (계약 확정)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                패키지: <strong>{po.packageTitle}</strong>
              </p>
            </div>

            <div className="text-right space-y-1 font-mono text-xs">
              <div>
                <span className="text-slate-400">발주번호:</span>{' '}
                <strong className="text-sm font-bold text-slate-900">{po.poNumber}</strong>
              </div>
              <div>
                <span className="text-slate-400">발주일자:</span> {po.orderDate}
              </div>
              <div>
                <span className="text-slate-400">납기희망일:</span>{' '}
                <strong className="text-indigo-600">{po.deliveryDueDate}</strong>
              </div>
            </div>
          </div>

          {/* 발주처 및 공급처 정보 블록 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider">
                [발주처 (Buyer)]
              </span>
              <p className="font-bold text-sm text-slate-900">모아 사업장 구매관리팀</p>
              <p className="text-slate-600">요청 부서: {po.requesterDepartments.join(', ')}</p>
              <p className="text-slate-500">결재 완료: 전결 규정에 따른 전자서명 완료</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-bold text-indigo-500 tracking-wider">
                [공급처 (Supplier)]
              </span>
              <p className="font-bold text-sm text-indigo-950">{po.vendorName}</p>
              <p className="text-slate-600">
                계약 방식:{' '}
                <strong>
                  {po.contractType === 'sole_source' ? '단독 수의계약' : '경쟁 견적 입찰'}
                </strong>
              </p>
              <p className="text-slate-500">지불 조건: 익월 말 현금 결제 (세금계산서 발행)</p>
            </div>
          </div>

          {/* 품목 명세 테이블 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">No</th>
                  <th className="py-2.5 px-3">품목번호 (SKU)</th>
                  <th className="py-2.5 px-3">품목명 / 규격사양</th>
                  <th className="py-2.5 px-3 text-right">수량</th>
                  <th className="py-2.5 px-3 text-right">단가 (원)</th>
                  <th className="py-2.5 px-3 text-right">공급가액 (원)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {po.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{item.sku || '-'}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {item.itemName}
                      {item.specification && (
                        <span className="block text-[11px] font-normal text-slate-400">
                          {item.specification}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {item.unitPrice.toLocaleString()}원
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {item.subtotal.toLocaleString()}원
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-slate-600 text-right">
                    총 발주 금액 (VAT 포함):
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-right text-base text-slate-950 font-black">
                    {po.totalAmount.toLocaleString()}원
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ★ 불변 감사 증빙 보존 박스 (ISO 9001 공급자 선정 증빙) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>사내 감사 및 ISO 9001(공급자 관리) 불변 증빙 기록</span>
            </div>

            <div className="text-xs space-y-2 text-slate-700">
              <div>
                <strong className="text-slate-900">1. 부서별 구매 사유 (Justification):</strong>
                <p className="mt-0.5 text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                  {po.justificationSummary}
                </p>
              </div>

              <div>
                <strong className="text-slate-900">2. 계약 방식 및 선정 근거 (Rationale):</strong>
                <p className="mt-0.5 text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                  {po.contractRationaleSummary}
                </p>
              </div>
            </div>

            {/* 결재권자 서명란 */}
            <div className="flex items-center justify-end gap-4 pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-400 font-semibold">전자 결재 승인:</span>
              {po.approverSignatures.map((sig, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-bold text-slate-800">
                    [{sig.role}] {sig.name}
                  </span>
                  <span className="text-[10px] text-slate-400">{sig.signedAt.slice(0, 10)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
