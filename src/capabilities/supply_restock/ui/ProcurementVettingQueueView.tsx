import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Search,
  MessageSquare,
  FileCheck2,
  Archive,
} from 'lucide-react';
import {
  checkInternalInventoryAvailability,
  vetPurchaseRequisition,
  type PurchaseRequisition,
  type StockInventoryItem,
} from '../domain/procurementPipelineEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

interface ProcurementVettingQueueViewProps {
  requisitions: PurchaseRequisition[];
  inventoryStock: StockInventoryItem[];
  onRequisitionUpdated: (updated: PurchaseRequisition) => void;
  onProceedToContract: (selectedPrs: PurchaseRequisition[]) => void;
}

export const ProcurementVettingQueueView: React.FC<ProcurementVettingQueueViewProps> = ({
  requisitions,
  inventoryStock,
  onRequisitionUpdated,
  onProceedToContract,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'submitted' | 'vetted_approved' | 'rejected'>('submitted');
  const [rejectingPr, setRejectingPr] = useState<PurchaseRequisition | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedForContractIds, setSelectedForContractIds] = useState<string[]>([]);

  // 필터링된 PR 목록
  const filteredList = requisitions.filter((pr) => {
    if (selectedFilter === 'all') return true;
    return pr.status === selectedFilter;
  });

  // 1. 구매 승인 (적합)
  const handleApprove = (pr: PurchaseRequisition) => {
    const updated = vetPurchaseRequisition(pr, 'approve', {
      name: '이구매',
      department: '구매자재팀',
    });
    onRequisitionUpdated(updated);
    showToast(`'${pr.prNumber}' 타당성 검수가 승인되었습니다.`, 'success');
  };

  // 2. 반려 모달 오픈
  const handleOpenRejectModal = (pr: PurchaseRequisition) => {
    setRejectingPr(pr);
    setRejectionReason('사내 창고 내 대체 가용 재고가 충분하여 불필요한 신규 구매를 방지하고자 반려함.');
  };

  // 3. 반려 확정
  const handleConfirmReject = () => {
    if (!rejectingPr) return;
    if (!rejectionReason.trim()) {
      showToast('반려 사유를 입력해야 합니다.', 'error');
      return;
    }

    try {
      const updated = vetPurchaseRequisition(
        rejectingPr,
        'reject',
        { name: '이구매', department: '구매자재팀' },
        rejectionReason
      );
      onRequisitionUpdated(updated);
      setRejectingPr(null);
      setRejectionReason('');
      showToast(`'${rejectingPr.prNumber}'가 반려 처리되었습니다.`, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // 계약 패키징 대상 토글
  const handleToggleSelectContract = (prId: string) => {
    setSelectedForContractIds((prev) =>
      prev.includes(prId) ? prev.filter((id) => id !== prId) : [...prev, prId]
    );
  };

  const handleStartContractPackage = () => {
    const selectedPrs = requisitions.filter((pr) => selectedForContractIds.includes(pr.id));
    if (selectedPrs.length === 0) {
      showToast('계약으로 묶을 검수 승인 품목을 선택하세요.', 'info');
      return;
    }
    onProceedToContract(selectedPrs);
  };

  return (
    <div className="space-y-5">
      {/* 큐 상단 안내 바 및 필터 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">구매부서 타당성 검수 큐 (Procurement Vetting)</h2>
            <p className="text-xs text-slate-400">
              각 부서의 구매 사유(Justification) 검토 및 사내 창고 중복 재고 자동 대조
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedFilter('submitted')}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedFilter === 'submitted'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              검수 대기 ({requisitions.filter((p) => p.status === 'submitted').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('vetted_approved')}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedFilter === 'vetted_approved'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              검수 승인 ({requisitions.filter((p) => p.status === 'vetted_approved').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('rejected')}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedFilter === 'rejected'
                  ? 'bg-rose-500 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              반려 ({requisitions.filter((p) => p.status === 'rejected').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedFilter === 'all'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              전체 ({requisitions.length})
            </button>
          </div>

          {selectedForContractIds.length > 0 && (
            <button
              type="button"
              onClick={handleStartContractPackage}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-500 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <FileCheck2 className="w-4 h-4" />
              선택 건 계약 묶음 진행 ({selectedForContractIds.length}건)
            </button>
          )}
        </div>
      </div>

      {/* PR 목록 카드 */}
      <div className="space-y-4">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Archive className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">현재 조건에 해당하는 구매 요청서가 없습니다.</p>
          </div>
        ) : (
          filteredList.map((pr) => {
            const stockChecks = checkInternalInventoryAvailability(pr.items, inventoryStock);
            const isApproved = pr.status === 'vetted_approved';
            const isRejected = pr.status === 'rejected';
            const isSubmitted = pr.status === 'submitted';

            return (
              <div
                key={pr.id}
                className={`bg-white rounded-2xl border transition-all ${
                  isApproved
                    ? 'border-emerald-200 shadow-xs'
                    : isRejected
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-slate-200 shadow-xs hover:border-indigo-300'
                } p-5 space-y-4`}
              >
                {/* 상단 메타 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    {isApproved && (
                      <input
                        type="checkbox"
                        checked={selectedForContractIds.includes(pr.id)}
                        onChange={() => handleToggleSelectContract(pr.id)}
                        className="w-4 h-4 rounded text-slate-800 focus:ring-slate-900"
                        title="계약 묶음 패키지 선택"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {pr.prNumber}
                        </span>
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded-md">
                          {pr.department} · {pr.requesterName}
                        </span>
                        {isSubmitted && (
                          <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-md">
                            검수 대기중
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            타당성 승인 완료
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-100 text-rose-800 rounded-md flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            검수 반려됨
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400">총 추정 소요 예산:</span>{' '}
                    <strong className="text-sm font-black text-slate-900">
                      {pr.totalEstimatedAmount.toLocaleString()}원
                    </strong>
                  </div>
                </div>

                {/* ★ 구매 사유 (Justification) 강조 박스 */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                    <span>신청 부서 구매 사유 (Justification)</span>
                  </div>
                  <p className="text-xs text-amber-950 leading-relaxed font-medium">
                    "{pr.justification}"
                  </p>
                </div>

                {/* 반려 사유 노출 */}
                {isRejected && pr.rejectionReason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                    <span className="text-[11px] font-bold text-rose-800">구매부서 반려 사유:</span>
                    <p className="text-xs text-rose-900">{pr.rejectionReason}</p>
                  </div>
                )}

                {/* 요청 품목 및 사내 재고 중복 확인 대사표 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="py-2 px-3">품목번호(SKU)</th>
                        <th className="py-2 px-3">품목명 / 규격</th>
                        <th className="py-2 px-3 text-right">요청수량</th>
                        <th className="py-2 px-3 text-right">추정단가</th>
                        <th className="py-2 px-3 text-right">소계</th>
                        <th className="py-2 px-3">사내 창고 가용 재고 중복 확인 (시스템 자동)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pr.items.map((item, idx) => {
                        const check = stockChecks[idx];
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                              {item.sku || '-'}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {item.itemName}
                              {item.specification && (
                                <span className="block text-[11px] font-normal text-slate-400">
                                  {item.specification}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-medium">
                              {item.estimatedUnitPrice.toLocaleString()}원
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-800">
                              {item.estimatedSubtotal.toLocaleString()}원
                            </td>
                            <td className="py-2 px-3">
                              {/* ★ 사내 재고 중복 확인 배지 */}
                              {check.hasEnoughStock ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 font-bold text-[11px] rounded-lg border border-amber-300">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  창고 내 대체 재고 충분 ({check.inStockQuantity}개 보유)
                                </span>
                              ) : check.hasPartialStock ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-indigo-800 text-[11px] rounded-lg border border-slate-200">
                                  일부 재고 보유 ({check.inStockQuantity}개 보유)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] rounded-md">
                                  창고 재고 없음 (신규 구매 타당)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 하단 검수 액션 버튼 */}
                {isSubmitted && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenRejectModal(pr)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      반려 (부적합)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(pr)}
                      className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      구매 승인 (적합)
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 반려 사유 입력 모달 */}
      {rejectingPr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <XCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900">
                구매 요청 반려 사유 입력 ({rejectingPr.prNumber})
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              신청 부서에 전달될 반려 사유를 구체적으로 서술하세요.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="예: 사내 창고에 가용 재고가 충분하여 신규 구매 반려함 / 예산 초과"
              className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingPr(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                반려 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
