import React, { useEffect, useState } from 'react';
import { useList, useCreate, useUpdate, useGetIdentity } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  detectRestockNeeded,
  groupRestockItemsByVendor,
  assemblePurchaseOrder,
  evaluateOptimalVendorQuote,
  type RestockItem,
  type GeneratedPurchaseOrder,
  type VendorQuoteItem,
} from '../domain/supplyRestockEngine';
import {
  Package,
  FileCheck,
  Plus,
  Send,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingDown,
  Building2,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  createApprovalWithChosenLine,
  listApprovalOrgMembers,
  type ApprovalMemberOption,
} from '@/capabilities/approval_workflow/services/approvalWorkflowService';

type Identity = { id?: string; name?: string };

export const SupplyRestockView: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { data: identity } = useGetIdentity<Identity>();
  const orgId = currentOrganization?.id ?? '';
  const userId = identity?.id ?? '';
  const [activeTab, setActiveTab] = useState<'restock_po' | 'pr_quotes'>('restock_po');
  const [approvalPr, setApprovalPr] = useState<any | null>(null);
  const [approvalMembers, setApprovalMembers] = useState<ApprovalMemberOption[]>([]);
  const [approvalReviewerId, setApprovalReviewerId] = useState('');
  const [approvalApproverId, setApprovalApproverId] = useState('');
  const [approvalBusy, setApprovalBusy] = useState(false);

  // 1. 소모품 목록 쿼리
  const { query: restockQuery } = useList<RestockItem>({
    resource: 'supply_restock_items',
    sorters: [{ field: 'current_quantity', order: 'asc' }],
  });
  const items = restockQuery?.data?.data ?? [];
  const isRestockLoading = restockQuery?.isLoading;

  // 2. 구매 요청서 (PR) 쿼리
  const { query: prQuery } = useList<any>({
    resource: 'purchase_requisitions',
    sorters: [{ field: 'created_at', order: 'desc' }],
  });
  const prList = prQuery?.data?.data ?? [];

  // 3. 공급업체 견적 쿼리
  const { query: quoteQuery } = useList<any>({
    resource: 'vendor_quotes',
  });
  const quotesList = quoteQuery?.data?.data ?? [];

  const { mutate: createItem } = useCreate();
  const { mutate: createPr } = useCreate();
  const { mutate: updateQuote } = useUpdate();

  useEffect(() => {
    if (!orgId || !approvalPr) return;
    void listApprovalOrgMembers(orgId)
      .then(setApprovalMembers)
      .catch(() => setApprovalMembers([]));
  }, [orgId, approvalPr]);

  // 소모품 등록 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('stationery');
  const [currentQty, setCurrentQty] = useState(3);
  const [safetyThreshold, setSafetyThreshold] = useState(5);
  const [orderQty, setOrderQty] = useState(10);
  const [unit, setUnit] = useState('BOX');
  const [unitCost, setUnitCost] = useState(15000);
  const [vendorName, setVendorName] = useState('대한문구');
  const [vendorContact, setVendorContact] = useState('010-0000-0000');

  // 신규 PR 모달 상태
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [prTitle, setPrTitle] = useState('');
  const [prAmount, setPrAmount] = useState(350000);
  const [prJustification, setPrJustification] = useState('');

  // 생성된 발주서 모달 상태
  const [activePo, setActivePo] = useState<GeneratedPurchaseOrder | null>(null);

  const neededItems = detectRestockNeeded(items);
  const vendorGroups = groupRestockItemsByVendor(neededItems);

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !vendorName) return;

    createItem(
      {
        resource: 'supply_restock_items',
        values: {
          item_name: itemName,
          category,
          current_quantity: Number(currentQty),
          safety_threshold: Number(safetyThreshold),
          optimal_order_quantity: Number(orderQty),
          unit,
          unit_cost: Number(unitCost),
          vendor_name: vendorName,
          vendor_contact: vendorContact || null,
          status: Number(currentQty) <= Number(safetyThreshold) ? 'restock_needed' : 'sufficient',
        },
      },
      {
        onSuccess: () => {
          setIsModalOpen(false);
          setItemName('');
          restockQuery?.refetch();
          showToast('소모품 품목이 등록되었습니다.', 'success');
        },
      }
    );
  };

  const handleCreatePr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prTitle.trim()) return;

    const prNumber = `PR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    createPr(
      {
        resource: 'purchase_requisitions',
        values: {
          pr_number: prNumber,
          title: prTitle.trim(),
          requester_name: '현장 담당자',
          status: 'draft',
          total_estimated_amount: Number(prAmount),
          justification: prJustification.trim(),
          items: [{ name: prTitle.trim(), amount: Number(prAmount) }],
        },
      },
      {
        onSuccess: () => {
          setIsPrModalOpen(false);
          setPrTitle('');
          prQuery?.refetch();
          showToast(`구매 요청서 '${prNumber}'가 생성되었습니다.`, 'success');
        },
      }
    );
  };

  const handleLinkToApproval = (pr: any) => {
    setApprovalPr(pr);
    setApprovalReviewerId('');
    setApprovalApproverId('');
  };

  const confirmPurchaseApproval = async () => {
    if (!approvalPr || !orgId || !userId) {
      showToast('로그인·조직 정보가 필요합니다.', 'error');
      return;
    }
    const reviewer = approvalMembers.find((m) => m.userId === approvalReviewerId);
    const approver = approvalMembers.find((m) => m.userId === approvalApproverId);
    if (!reviewer || !approver) {
      showToast('검토자와 최종 승인자를 선택해 주세요.', 'error');
      return;
    }
    if (reviewer.userId === approver.userId) {
      showToast('검토자와 최종 승인자는 서로 다른 사람이어야 합니다.', 'error');
      return;
    }
    setApprovalBusy(true);
    try {
      await createApprovalWithChosenLine({
        organizationId: orgId,
        title: `[구매 승인 요청] ${approvalPr.title} (${Number(approvalPr.total_estimated_amount).toLocaleString()}원)`,
        content: {
          pr_number: approvalPr.pr_number,
          amount: approvalPr.total_estimated_amount,
          justification: approvalPr.justification,
        },
        requesterId: userId,
        requesterName: identity?.name?.trim() || approvalPr.requester_name || '구매 담당자',
        reviewer: { userId: reviewer.userId, name: reviewer.name },
        approver: { userId: approver.userId, name: approver.name },
        entityType: 'purchase_requisition',
        entityId: String(approvalPr.id),
      });
      showToast(`'${approvalPr.pr_number}' 결재 기안이 상신되었습니다.`, 'success');
      setApprovalPr(null);
      prQuery?.refetch();
    } catch (cause) {
      showToast.error(cause, '결재 상신 실패');
    } finally {
      setApprovalBusy(false);
    }
  };

  const handleSelectQuote = (prId: string, quoteId: string) => {
    updateQuote(
      {
        resource: 'vendor_quotes',
        id: quoteId,
        values: { is_selected: true },
      },
      {
        onSuccess: () => {
          quoteQuery?.refetch();
          showToast('최적 공급업체 견적이 채택되었습니다.', 'success');
        },
      }
    );
  };

  const handleGeneratePo = (vendor: string, groupItems: RestockItem[]) => {
    const po = assemblePurchaseOrder(vendor, groupItems, '우리 매장', 1);
    setActivePo(po);
  };

  const handleShareOrCopy = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '소모품 발주서',
          text,
        });
        return;
      } catch (err) {
        // 취소 시 fallback
      }
    }
    await navigator.clipboard.writeText(text);
    showToast('발주서 내용이 클립보드에 복사되었습니다! 카카오톡이나 문자로 전송하세요.', 'info');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* 헤더 및 탭 전환 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold mb-1">
            <Package className="w-3.5 h-3.5" />
            <span>구매·자재 조달 및 견적 비교</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">자재 발주 & 구매 요청(PR) 관리</h1>
          <p className="text-xs text-slate-500 mt-1">
            안전재고 미달 품목 자동 감지 및 복수 공급업체 견적 비교, 전자결재 연동
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('restock_po')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'restock_po'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              안전재고 & 발주서
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pr_quotes')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'pr_quotes'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              간이 PR & 결재 상신
            </button>
          </div>

          {activeTab === 'restock_po' && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>품목 등록</span>
            </button>
          )}
          {activeTab === 'pr_quotes' && (
            <button
              type="button"
              onClick={() => setIsPrModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>신규 PR 기안</span>
            </button>
          )}
        </div>
      </div>

      {/* 안전재고 및 간이 발주서 (PO) */}
      {activeTab === 'restock_po' && (
        <div className="space-y-6">
          {/* 긴급 발주 알림 배너 */}
          {neededItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-amber-900">
                    안전재고 미달 품목이 총 {neededItems.length}건 감지되었습니다!
                  </h3>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    공급처별로 원터치 발주서를 조립하여 카카오톡이나 문자로 간편하게 전송할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 공급처별 묶음 발주 섹션 */}
          {Object.keys(vendorGroups).length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                공급처별 발주 대기 묶음
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(vendorGroups).map(([vendor, groupItems]) => {
                  const subtotal = groupItems.reduce(
                    (sum, i) => sum + i.optimalOrderQuantity * i.unitCost,
                    0
                  );
                  return (
                    <div
                      key={vendor}
                      className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-amber-600" />
                            {vendor}
                          </span>
                          <span className="text-xs font-extrabold text-amber-600">
                            {subtotal.toLocaleString()}원
                          </span>
                        </div>
                        <ul className="divide-y divide-slate-50 text-xs py-2">
                          {groupItems.map((item) => (
                            <li key={item.id} className="py-1 flex justify-between text-slate-600">
                              <span>
                                {item.itemName} (잔여: {item.currentQuantity}{item.unit})
                              </span>
                              <span className="font-bold text-slate-800">
                                +{item.optimalOrderQuantity}{item.unit}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGeneratePo(vendor, groupItems)}
                        className="mt-3 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>발주서 생성 및 전송</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 전체 품목 테이블 */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-800">전체 소모품 품목 ({items.length}개)</h2>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-3">품목명</th>
                  <th className="p-3">현재 재고</th>
                  <th className="p-3">안전재고 기준</th>
                  <th className="p-3">발주 권장량</th>
                  <th className="p-3">공급처</th>
                  <th className="p-3 text-right">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      등록된 소모품 품목이 없습니다.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isLow = item.currentQuantity <= item.safetyThreshold;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-900">{item.itemName}</td>
                        <td className="p-3 font-bold text-slate-800">
                          {item.currentQuantity} {item.unit}
                        </td>
                        <td className="p-3 text-slate-500">
                          {item.safetyThreshold} {item.unit}
                        </td>
                        <td className="p-3 text-slate-700">
                          {item.optimalOrderQuantity} {item.unit}
                        </td>
                        <td className="p-3 text-slate-600">{item.vendorName}</td>
                        <td className="p-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isLow
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {isLow ? '발주 필요' : '안정적'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 탭 2: 구매 요청서(PR) 및 복수 견적 대사표 */}
      {activeTab === 'pr_quotes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xs font-bold text-slate-800">구매 요청서(PR) 현황 ({prList.length}건)</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  현장 구매 요청서에 공급업체 견적을 첨부하고, 전자결재 승인 라인으로 바로 상신합니다.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {prList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  생성된 구매 요청서가 없습니다. '신규 PR 기안'을 통해 새 구매 요청서를 등록하세요.
                </div>
              ) : (
                prList.map((pr: any) => {
                  const prQuotes: VendorQuoteItem[] = quotesList
                    .filter((q: any) => q.pr_id === pr.id)
                    .map((q: any) => ({
                      id: q.id,
                      prId: q.pr_id,
                      vendorName: q.vendor_name,
                      quotedAmount: Number(q.quoted_amount),
                      leadTimeDays: q.lead_time_days || 3,
                      isSelected: q.is_selected,
                      notes: q.notes,
                    }));

                  const optimalQuote = evaluateOptimalVendorQuote(prQuotes);

                  return (
                    <div key={pr.id} className="p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {pr.pr_number}
                            </span>
                            <h3 className="text-sm font-black text-slate-900">{pr.title}</h3>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            기안자: {pr.requester_name} · 예상 총액:{' '}
                            <span className="font-bold text-slate-800">
                              {Number(pr.total_estimated_amount).toLocaleString()}원
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleLinkToApproval(pr)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>전자결재 상신</span>
                          </button>
                        </div>
                      </div>

                      {/* 복수 견적 대사표 */}
                      <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-extrabold text-slate-700">
                            공급업체 견적 비교 ({prQuotes.length}개사)
                          </span>
                          {optimalQuote && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              최적 추천: {optimalQuote.vendorName} ({optimalQuote.quotedAmount.toLocaleString()}원)
                            </span>
                          )}
                        </div>

                        {prQuotes.length === 0 ? (
                          <div className="py-2 text-[11px] text-slate-400">
                            첨부된 견적이 없습니다. 공급업체 견적서를 수취하여 등록하세요.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {prQuotes.map((q) => (
                              <div
                                key={q.id}
                                className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${
                                  q.isSelected
                                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/10'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900">{q.vendorName}</span>
                                    {q.isSelected && (
                                      <span className="text-[10px] font-black text-emerald-700">채택됨</span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-600 mt-1">
                                    견적액: <span className="font-extrabold">{q.quotedAmount.toLocaleString()}원</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    납기: {q.leadTimeDays}일 소요
                                  </div>
                                </div>

                                {!q.isSelected && (
                                  <button
                                    type="button"
                                    onClick={() => handleSelectQuote(pr.id, q.id)}
                                    className="mt-2 py-1 px-2 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded text-[10px] font-bold transition-colors"
                                  >
                                    이 견적 채택
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 발주서 미리보기 모달 */}
      {activePo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900">간이 발주서 (PO) 조립 완료</h3>
            <textarea
              readOnly
              value={activePo.orderSummaryText}
              className="w-full h-56 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono resize-none leading-relaxed"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActivePo(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => handleShareOrCopy(activePo.orderSummaryText)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>문자/카카오톡 복사 전송</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 신규 PR 모달 */}
      {isPrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900">신규 구매 요청서 (PR) 기안</h3>
            <form onSubmit={handleCreatePr} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">구매 요청 제목 *</label>
                <input
                  type="text"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder="예: 2분기 사무용품 및 세정제 정기 구매 건"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">예상 구매 총액 (원)</label>
                <input
                  type="number"
                  value={prAmount}
                  onChange={(e) => setPrAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">구매 사유 및 필요성</label>
                <textarea
                  value={prJustification}
                  onChange={(e) => setPrJustification(e.target.value)}
                  placeholder="재고 소진에 따른 필수 구매 및 업무 중단 방지"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none h-20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPrModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  요청서 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {approvalPr ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl">
            <h3 className="text-base font-bold text-slate-900">구매 결재 상신</h3>
            <p className="mt-1 text-xs text-slate-500">{approvalPr.pr_number} · {approvalPr.title}</p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                검토자
                <select
                  aria-label="검토자"
                  value={approvalReviewerId}
                  onChange={(e) => setApprovalReviewerId(e.target.value)}
                  className="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm"
                >
                  <option value="">검토자 선택</option>
                  {approvalMembers.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-700">
                최종 승인자
                <select
                  aria-label="최종 승인자"
                  value={approvalApproverId}
                  onChange={(e) => setApprovalApproverId(e.target.value)}
                  className="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm"
                >
                  <option value="">최종 승인자 선택</option>
                  {approvalMembers.map((member) => (
                    <option key={`approver-${member.userId}`} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="h-12 flex-1 rounded-xl border border-slate-200 text-sm font-semibold"
                onClick={() => setApprovalPr(null)}
                disabled={approvalBusy}
              >
                취소
              </button>
              <button
                type="button"
                className="h-12 flex-1 rounded-xl bg-indigo-600 text-sm font-bold text-white disabled:opacity-50"
                onClick={() => void confirmPurchaseApproval()}
                disabled={approvalBusy}
              >
                상신
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
