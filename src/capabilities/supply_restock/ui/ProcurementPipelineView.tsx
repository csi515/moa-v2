import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  FileSpreadsheet,
  FileCheck2,
  Plus,
  Package,
  Layers,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Printer,
} from 'lucide-react';
import { PurchaseRequisitionFormModal } from './PurchaseRequisitionFormModal';
import { ProcurementVettingQueueView } from './ProcurementVettingQueueView';
import { PurchaseContractPackageModal } from './PurchaseContractPackageModal';
import { PurchaseOrderDocumentView } from './PurchaseOrderDocumentView';
import {
  issueContractPurchaseOrder,
  syncPurchaseOrderToInventoryReceipt,
  type PurchaseRequisition,
  type StockInventoryItem,
  type ContractPackage,
  type ContractPurchaseOrder,
} from '../domain/procurementPipelineEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

// 샘플 사내 창고 재고 현황
const INITIAL_INVENTORY_STOCK: StockInventoryItem[] = [
  { sku: 'BOLT-M8-SUS', itemName: '고장력 육각볼트 M8', availableQuantity: 50, location: 'A-01-02' },
  { sku: 'OIL-VG46-20L', itemName: '유압 작동유 VG46', availableQuantity: 1, location: 'C-04-01' },
  { sku: 'GLOVE-NBR-M', itemName: '산업용 니트릴 장갑 (M)', availableQuantity: 15, location: 'B-02-03' },
  { sku: 'FILTER-AIR-01', itemName: '에어컴프레셔 흡기 필터', availableQuantity: 0, location: 'A-05-01' },
];

// 초기 시연용 PR 데이터
const INITIAL_REQUISITIONS: PurchaseRequisition[] = [
  {
    id: 'pr-demo-1',
    prNumber: 'PR-20261018-001',
    department: '생산1팀',
    requesterName: '김생산 반장',
    targetDeliveryDate: '2026-10-25',
    justification: '3호 가공설비 메인 스핀들 긴급 누유 수리용 니트릴 실링 및 고장력 볼트 소진',
    items: [
      {
        id: 'pri-1',
        sku: 'BOLT-M8-SUS',
        itemName: '고장력 육각볼트 M8',
        specification: 'SUS304, 30mm',
        quantity: 200,
        unit: 'EA',
        estimatedUnitPrice: 450,
        estimatedSubtotal: 90000,
        lastVendor: '한국정밀화스너',
      },
    ],
    totalEstimatedAmount: 90000,
    status: 'submitted',
    auditTrail: [
      {
        timestamp: new Date().toISOString(),
        actor: '김생산 반장',
        role: '생산1팀 신청자',
        action: 'SUBMIT_PR',
        comment: '3호기 긴급 수리용 자재 요청',
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pr-demo-2',
    prNumber: 'PR-20261018-002',
    department: '설비보전팀',
    requesterName: '박보전 대리',
    targetDeliveryDate: '2026-10-28',
    justification: '공장 전체 공압 컴프레셔 동절기 예방보전용 흡기 필터 전수 교체',
    items: [
      {
        id: 'pri-2',
        sku: 'FILTER-AIR-01',
        itemName: '에어컴프레셔 흡기 필터',
        specification: '10마력용 원형',
        quantity: 10,
        unit: 'EA',
        estimatedUnitPrice: 18000,
        estimatedSubtotal: 180000,
        lastVendor: '삼원공조필터',
      },
    ],
    totalEstimatedAmount: 180000,
    status: 'submitted',
    auditTrail: [
      {
        timestamp: new Date().toISOString(),
        actor: '박보전 대리',
        role: '설비보전팀 신청자',
        action: 'SUBMIT_PR',
        comment: '동절기 컴프레셔 필터 교체 품목',
      },
    ],
    createdAt: new Date().toISOString(),
  },
];

export const ProcurementPipelineView: React.FC = () => {
  // 상태 관리
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>(INITIAL_REQUISITIONS);
  const [inventoryStock] = useState<StockInventoryItem[]>(INITIAL_INVENTORY_STOCK);
  const [packages, setPackages] = useState<ContractPackage[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<ContractPurchaseOrder[]>([]);

  // 모달 제어 상태
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [selectedPrsForContract, setSelectedPrsForContract] = useState<PurchaseRequisition[]>([]);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [activePoDocument, setActivePoDocument] = useState<ContractPurchaseOrder | null>(null);

  // 1단계: PR 신규 등록 완료 콜백
  const handlePrCreated = (newPr: PurchaseRequisition) => {
    setRequisitions((prev) => [newPr, ...prev]);
    showToast(`구매 요청서 '${newPr.prNumber}'가 정상 등록되었습니다.`, 'success');
  };

  // 2단계: PR 검수 업데이트 콜백
  const handleRequisitionUpdated = (updated: PurchaseRequisition) => {
    setRequisitions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  // 3단계: 계약 패키징 모달 오픈
  const handleProceedToContract = (selectedPrs: PurchaseRequisition[]) => {
    setSelectedPrsForContract(selectedPrs);
    setIsPackageModalOpen(true);
  };

  // 3단계: 계약 패키지 생성 완료 및 자동 전자결재 발주서(PO) 발행
  const handlePackageCreated = (pkg: ContractPackage) => {
    setPackages((prev) => [pkg, ...prev]);

    // 해당 PR 상태를 'contract_packaged'로 변경
    setRequisitions((prev) =>
      prev.map((pr) =>
        pkg.auditEvidence.prNumbers.includes(pr.prNumber)
          ? { ...pr, status: 'contract_packaged' }
          : pr
      )
    );

    // 4단계: 발주서(PO) 일괄 발행 처리
    const po = issueContractPurchaseOrder({
      contractPackage: pkg,
      approvers: [
        { name: '이구매', role: '구매관리팀장' },
        { name: '김대표', role: '대표이사' },
      ],
      orderSequence: purchaseOrders.length + 1,
    });

    setPurchaseOrders((prev) => [po, ...prev]);
    setActivePoDocument(po);
    showToast(`계약 패키지가 확정되고 공식 발주서 '${po.poNumber}'가 발행되었습니다!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* 4단계 파이프라인 시각화 진행 바 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
              1단계: 구매 요청
            </span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <p className="font-bold text-sm text-slate-900 mt-2">부서별 구매 사유(PR)</p>
          <p className="text-xs text-slate-500 mt-0.5">
            등록 요청: <strong>{requisitions.length}건</strong>
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md">
              2단계: 필요성 검수
            </span>
            <ShieldCheck className="w-4 h-4 text-slate-700" />
          </div>
          <p className="font-bold text-sm text-slate-900 mt-2">사내 창고 재고 대조</p>
          <p className="text-xs text-slate-500 mt-0.5">
            검수 승인: <strong>{requisitions.filter((p) => p.status === 'vetted_approved').length}건</strong>
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              3단계: 묶음 계약
            </span>
            <FileSpreadsheet className="w-4 h-4 text-blue-500" />
          </div>
          <p className="font-bold text-sm text-slate-900 mt-2">경쟁입찰 vs 수의계약</p>
          <p className="text-xs text-slate-500 mt-0.5">
            체결 패키지: <strong>{packages.length}건</strong>
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              4단계: 발주서 발행
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="font-bold text-sm text-slate-900 mt-2">전자결재 및 입고연동</p>
          <p className="text-xs text-slate-500 mt-0.5">
            발행 PO: <strong>{purchaseOrders.length}건</strong>
          </p>
        </div>
      </div>

      {/* 조달 액션 버튼 및 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-sm font-bold text-slate-900">전문 조달·구매 관리 파이프라인</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            사내 감사 및 ISO 9001(공급자 관리) 불변 증빙이 보존되는 전주기 구매 절차
          </p>
        </div>

        <div className="flex items-center gap-2">
          {purchaseOrders.length > 0 && (
            <button
              type="button"
              onClick={() => setActivePoDocument(purchaseOrders[0])}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              <Printer className="w-3.5 h-3.5" />
              최근 발행 발주서 보기 ({purchaseOrders[0].poNumber})
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPrModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            신규 구매 요청(PR) 기안
          </button>
        </div>
      </div>

      {/* 메인: 구매부서 검수 큐 화면 */}
      <ProcurementVettingQueueView
        requisitions={requisitions}
        inventoryStock={inventoryStock}
        onRequisitionUpdated={handleRequisitionUpdated}
        onProceedToContract={handleProceedToContract}
      />

      {/* 1단계 모달: PR 작성 */}
      <PurchaseRequisitionFormModal
        isOpen={isPrModalOpen}
        onClose={() => setIsPrModalOpen(false)}
        onSubmitSuccess={handlePrCreated}
      />

      {/* 3단계 모달: 다품목 묶음 계약 및 사유서 작성 */}
      <PurchaseContractPackageModal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        selectedRequisitions={selectedPrsForContract}
        onPackageCreated={handlePackageCreated}
      />

      {/* 4단계 모달: 공식 발주서(PO) 및 감사 증빙 문서 뷰 */}
      {activePoDocument && (
        <PurchaseOrderDocumentView
          po={activePoDocument}
          onClose={() => setActivePoDocument(null)}
        />
      )}
    </div>
  );
};
