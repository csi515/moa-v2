import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  evaluateChangeOrderReadiness,
  formatChangeNumber,
  type FourMCategory,
  type RiskLevel,
  type EvaluatorRole,
  type ChangeOrderEvaluation,
} from '../domain/changeManagementEngine';

export interface ChangeOrderRecord {
  id: string;
  organization_id: string;
  change_number: string;
  title: string;
  category: FourMCategory;
  reason: string;
  before_description: string;
  after_description: string;
  risk_level: RiskLevel;
  status: 'draft' | 'reviewing' | 'approved' | 'applied' | 'rejected' | 'cancelled';
  effective_date: string | null;
  requester_name: string;
  approval_request_id: string | null;
  applied_at: string | null;
  applied_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface EvaluationRecord extends ChangeOrderEvaluation {
  id: string;
  change_order_id: string;
  created_at: string;
}

export const ChangeManagementView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState<boolean>(false);

  // 1. ECN 변경 통지서 목록 페칭
  const { query: ordersQuery } = useList<ChangeOrderRecord>({
    resource: 'change_orders',
    pagination: { pageSize: 50 },
  });
  const orders = ordersQuery?.data?.data || [];

  // 2. 부서별 영향도 평가 목록 페칭
  const { query: evaluationsQuery } = useList<EvaluationRecord>({
    resource: 'change_order_evaluations',
    pagination: { pageSize: 100 },
  });
  const allEvaluations = evaluationsQuery?.data?.data || [];

  const { mutate: createOrder, mutation: createOrderMutation } = useCreate();
  const { mutate: updateOrder, mutation: updateOrderMutation } = useUpdate();
  const { mutate: createEvaluation, mutation: createEvaluationMutation } = useCreate();
  const { mutate: createApprovalRequest, mutation: createApprovalMutation } = useCreate();

  const isCreatingOrder = createOrderMutation.isPending;
  const isUpdatingOrder = updateOrderMutation.isPending;
  const isCreatingEvaluation = createEvaluationMutation.isPending;
  const isSubmittingApproval = createApprovalMutation.isPending;

  // 신규 ECN 폼 상태
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<FourMCategory>('material');
  const [newReason, setNewReason] = useState('');
  const [newBefore, setNewBefore] = useState('');
  const [newAfter, setNewAfter] = useState('');
  const [newRisk, setNewRisk] = useState<RiskLevel>('medium');
  const [newEffectiveDate, setNewEffectiveDate] = useState('');
  const [newRequesterName, setNewRequesterName] = useState('홍길동 (엔지니어)');

  // 신규 영향도 평가 폼 상태
  const [evalRole, setEvalRole] = useState<EvaluatorRole>('quality');
  const [evalName, setEvalName] = useState('박품질 (QA팀장)');
  const [evalImpact, setEvalImpact] = useState('');
  const [evalIsApproved, setEvalIsApproved] = useState(true);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0] || null;
  const currentEvaluations = selectedOrder
    ? allEvaluations.filter((ev) => ev.change_order_id === selectedOrder.id)
    : [];

  const readiness = selectedOrder
    ? evaluateChangeOrderReadiness(selectedOrder.status, selectedOrder.risk_level, currentEvaluations)
    : null;

  // 필터링된 ECN
  const filteredOrders = selectedCategory === 'all'
    ? orders
    : orders.filter((o) => o.category === selectedCategory);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newReason.trim()) return;

    const changeNumber = formatChangeNumber('ECN', new Date(), orders.length + 1);
    createOrder(
      {
        resource: 'change_orders',
        values: {
          change_number: changeNumber,
          title: newTitle.trim(),
          category: newCategory,
          reason: newReason.trim(),
          before_description: newBefore.trim(),
          after_description: newAfter.trim(),
          risk_level: newRisk,
          status: 'draft',
          effective_date: newEffectiveDate || null,
          requester_name: newRequesterName.trim(),
        },
      },
      {
        onSuccess: (data) => {
          setShowCreateModal(false);
          setNewTitle('');
          setNewReason('');
          setNewBefore('');
          setNewAfter('');
          if (data?.data?.id) {
            setSelectedOrderId(String(data.data.id));
          }
        },
      }
    );
  };

  const handleCreateEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !evalImpact.trim()) return;

    createEvaluation(
      {
        resource: 'change_order_evaluations',
        values: {
          change_order_id: selectedOrder.id,
          evaluator_role: evalRole,
          evaluator_name: evalName.trim(),
          impact_assessment: evalImpact.trim(),
          is_approved: evalIsApproved,
        },
      },
      {
        onSuccess: () => {
          setShowEvaluationModal(false);
          setEvalImpact('');
          // 상태가 draft이면 자동으로 reviewing으로 전이
          if (selectedOrder.status === 'draft') {
            updateOrder({
              resource: 'change_orders',
              id: selectedOrder.id,
              values: { status: 'reviewing' },
            });
          }
        },
      }
    );
  };

  // Phase 1 전자결재 연계 기안
  const handleLinkApprovalWorkflow = () => {
    if (!selectedOrder) return;

    createApprovalRequest(
      {
        resource: 'approval_requests',
        values: {
          title: `[4M 변경 승인] ${selectedOrder.change_number} - ${selectedOrder.title}`,
          document_type: 'change_order',
          current_step: 1,
          status: 'pending',
          form_data: {
            change_order_id: selectedOrder.id,
            change_number: selectedOrder.change_number,
            category: selectedOrder.category,
            risk_level: selectedOrder.risk_level,
            reason: selectedOrder.reason,
            evaluations: currentEvaluations,
          },
        },
      },
      {
        onSuccess: (approvalRes) => {
          const approvalId = approvalRes?.data?.id;
          updateOrder({
            resource: 'change_orders',
            id: selectedOrder.id,
            values: {
              status: 'reviewing',
              approval_request_id: approvalId ? String(approvalId) : null,
            },
          });
        },
      }
    );
  };

  // 최종 현장 적용 처리
  const handleApplyChangeOrder = () => {
    if (!selectedOrder) return;
    updateOrder({
      resource: 'change_orders',
      id: selectedOrder.id,
      values: {
        status: 'applied',
        applied_at: new Date().toISOString(),
        applied_by: '운영 총괄 관리자',
      },
    });
  };

  // 관리자 직접 승인 (전자결재 미연동 시 간이 승인)
  const handleDirectApprove = () => {
    if (!selectedOrder) return;
    updateOrder({
      resource: 'change_orders',
      id: selectedOrder.id,
      values: {
        status: 'approved',
      },
    });
  };

  const getCategoryBadgeClass = (category: FourMCategory) => {
    switch (category) {
      case 'man':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'machine':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
      case 'material':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200';
      case 'method':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200';
      case 'spec':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getRiskBadgeClass = (risk: RiskLevel) => {
    switch (risk) {
      case 'critical':
        return 'bg-red-500 text-white font-bold animate-pulse';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200';
    }
  };

  const getStatusBadge = (status: ChangeOrderRecord['status']) => {
    switch (status) {
      case 'draft':
        return <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-600">임시저장</span>;
      case 'reviewing':
        return <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700">부서검토중</span>;
      case 'approved':
        return <span className="px-2 py-0.5 text-xs rounded bg-emerald-100 text-emerald-700 font-semibold">승인완료</span>;
      case 'applied':
        return <span className="px-2 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700 font-bold">현장적용됨</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 text-xs rounded bg-rose-100 text-rose-700">반려됨</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 헤더 & 통계 배너 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            공정 및 사양 4M 변경관리 (ECN / ECO)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            작업자(Man)·설비(Machine)·원자재(Material)·작업방법(Method) 사양 변경 시 부서별 사전 영향도 평가 및 전자결재 전결 체계
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
          >
            + 신규 ECN 기안
          </button>
        </div>
      </div>

      {/* 4M 카테고리 탭 필터 */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'all', label: '전체 보기' },
          { id: 'man', label: '작업자 (Man)' },
          { id: 'machine', label: '설비 (Machine)' },
          { id: 'material', label: '원자재 (Material)' },
          { id: 'method', label: '작업방법 (Method)' },
          { id: 'spec', label: '제품 규격 (Spec)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              selectedCategory === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 메인 2열 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 좌측: ECN 목록 */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            변경 통지서 대장 ({filteredOrders.length}건)
          </div>
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 text-sm">
              등록된 변경 통지서가 없습니다.
            </div>
          ) : (
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {filteredOrders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        {order.change_number}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="mt-1.5 font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {order.title}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getCategoryBadgeClass(order.category)}`}>
                          {order.category.toUpperCase()}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getRiskBadgeClass(order.risk_level)}`}>
                          {order.risk_level.toUpperCase()}
                        </span>
                      </div>
                      <span>{order.effective_date ? `적용: ${order.effective_date}` : '일정미정'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 우측: 선택된 ECN 상세 & 영향도 평가 & 거버넌스 액션 */}
        <div className="lg:col-span-7 space-y-5">
          {selectedOrder ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
              {/* 상세 상단 바 */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      {selectedOrder.change_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryBadgeClass(selectedOrder.category)}`}>
                      4M: {selectedOrder.category.toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRiskBadgeClass(selectedOrder.risk_level)}`}>
                      위험도: {selectedOrder.risk_level.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {selectedOrder.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    기안자: {selectedOrder.requester_name} | 등록일: {selectedOrder.created_at.slice(0, 10)}
                  </p>
                </div>
                <div>{getStatusBadge(selectedOrder.status)}</div>
              </div>

              {/* 변경 전/후 비교 카드 */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  변경 전/후 사양 대비표
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg">
                    <div className="font-bold text-red-700 dark:text-red-400 mb-1 flex items-center gap-1">
                      <span>🔻 변경 전 (Before)</span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {selectedOrder.before_description || '(내용 없음)'}
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg">
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                      <span>🔺 변경 후 (After)</span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {selectedOrder.after_description || '(내용 없음)'}
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">변경 사유: </span>
                  <span className="text-slate-700 dark:text-slate-300">{selectedOrder.reason}</span>
                </div>
              </div>

              {/* 부서별 사전 영향도 평가 목록 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    부서별 사전 영향도 평가 ({currentEvaluations.length}건)
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEvaluationModal(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + 평가 의견 등록
                  </button>
                </div>

                {currentEvaluations.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 text-xs">
                    등록된 부서 검토 의견이 없습니다. (품질 부서 검토 필수)
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentEvaluations.map((ev) => (
                      <div
                        key={ev.id || `${ev.evaluator_role}-${ev.evaluator_name}`}
                        className={`p-3 border rounded-lg text-xs ${
                          ev.is_approved
                            ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                            : 'border-rose-200 bg-rose-50/50 dark:bg-rose-950/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                              [{ev.evaluator_role}] {ev.evaluator_name}
                            </span>
                          </div>
                          {ev.is_approved ? (
                            <span className="text-emerald-600 font-semibold">✓ 승인 합의</span>
                          ) : (
                            <span className="text-rose-600 font-semibold">✕ 부적합/반려</span>
                          )}
                        </div>
                        <div className="text-slate-600 dark:text-slate-400">{ev.impact_assessment}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 거버넌스 준비도 요약 & 실행 액션 바 */}
              {readiness && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                    <span>거버넌스 검증 상태</span>
                    {readiness.requiresExecutiveApproval && (
                      <span className="text-orange-600 dark:text-orange-400">
                        ⚡ 고위험군: 대표/공장장 전결 필수
                      </span>
                    )}
                  </div>

                  {/* 누락 부서 알림 */}
                  {readiness.missingRoles.length > 0 && (
                    <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <span>⚠️ 필수 부서 평가 누락:</span>
                      <span className="font-semibold">{readiness.missingRoles.join(', ')} 부서</span>
                    </div>
                  )}

                  {/* 반려 사유 알림 */}
                  {readiness.rejectionReasons.length > 0 && (
                    <div className="text-xs text-rose-600 dark:text-rose-400">
                      <div className="font-semibold">반려 의견 존재로 승인 불가:</div>
                      {readiness.rejectionReasons.map((r, idx) => (
                        <div key={idx} className="ml-2">• {r}</div>
                      ))}
                    </div>
                  )}

                  {/* 액션 버튼 그룹 */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    {/* Phase 1 전자결재 상신 버튼 */}
                    {selectedOrder.status !== 'applied' && !selectedOrder.approval_request_id && (
                      <button
                        type="button"
                        onClick={handleLinkApprovalWorkflow}
                        disabled={isSubmittingApproval}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                      >
                        {isSubmittingApproval ? '상신 중...' : '전자결재 승인선 상신 (Approval Workflow)'}
                      </button>
                    )}

                    {selectedOrder.approval_request_id && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        🔗 전자결재 연동 진행 중 ({selectedOrder.approval_request_id.slice(0, 8)}...)
                      </span>
                    )}

                    {/* 승인 완료 처리 (단독 승인) */}
                    {readiness.canApprove && selectedOrder.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={handleDirectApprove}
                        disabled={isUpdatingOrder}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        최종 합의 승인 (Approve)
                      </button>
                    )}

                    {/* 현장 최종 적용 처리 */}
                    {readiness.canApply && (
                      <button
                        type="button"
                        onClick={handleApplyChangeOrder}
                        disabled={isUpdatingOrder}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
                      >
                        현장 최종 적용 완료 (Apply ECN)
                      </button>
                    )}

                    {selectedOrder.status === 'applied' && (
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                        ✓ {selectedOrder.applied_at?.slice(0, 10)} 현장 적용 완료됨 ({selectedOrder.applied_by})
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-sm">
              변경 통지서를 선택하세요.
            </div>
          )}
        </div>
      </div>

      {/* 신규 ECN 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              신규 4M 변경 통지서(ECN) 기안
            </h3>
            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">변경 제목</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: CNC 가공 툴 교체 및 절삭유 스펙 변경"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">4M 카테고리</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as FourMCategory)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="man">작업자 (Man)</option>
                    <option value="machine">설비 (Machine)</option>
                    <option value="material">원자재 (Material)</option>
                    <option value="method">작업방법 (Method)</option>
                    <option value="spec">제품 규격 (Spec)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">위험 수준</label>
                  <select
                    value={newRisk}
                    onChange={(e) => setNewRisk(e.target.value as RiskLevel)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="low">낮음 (Low)</option>
                    <option value="medium">중간 (Medium)</option>
                    <option value="high">높음 (High)</option>
                    <option value="critical">치명적 (Critical)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">변경 사유</label>
                <textarea
                  required
                  rows={2}
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="원가 절감, 품질 개선, 부품 단종 등 변경 사유 입력"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">변경 전 (Before)</label>
                  <textarea
                    rows={2}
                    value={newBefore}
                    onChange={(e) => setNewBefore(e.target.value)}
                    placeholder="기존 부품 번호, 기존 절삭유 모델 등"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">변경 후 (After)</label>
                  <textarea
                    rows={2}
                    value={newAfter}
                    onChange={(e) => setNewAfter(e.target.value)}
                    placeholder="신규 부품 사양, 개선된 가공 속도 등"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">적용 예정일</label>
                  <input
                    type="date"
                    value={newEffectiveDate}
                    onChange={(e) => setNewEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">기안자명</label>
                  <input
                    type="text"
                    value={newRequesterName}
                    onChange={(e) => setNewRequesterName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOrder}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow"
                >
                  {isCreatingOrder ? '등록 중...' : 'ECN 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 부서 영향도 평가 모달 */}
      {showEvaluationModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              부서별 영향도 평가 및 승인 의견
            </h3>
            <p className="text-xs text-slate-500">
              대상: {selectedOrder.change_number} - {selectedOrder.title}
            </p>
            <form onSubmit={handleCreateEvaluation} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">평가 부서/역할</label>
                  <select
                    value={evalRole}
                    onChange={(e) => setEvalRole(e.target.value as EvaluatorRole)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="quality">품질관리 (Quality)</option>
                    <option value="production">생산운영 (Production)</option>
                    <option value="safety">안전환경 (Safety)</option>
                    <option value="engineering">설계/기술 (Engineering)</option>
                    <option value="procurement">구매자재 (Procurement)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">검토자명</label>
                  <input
                    type="text"
                    required
                    value={evalName}
                    onChange={(e) => setEvalName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">영향도 평가 및 검토 소견</label>
                <textarea
                  required
                  rows={3}
                  value={evalImpact}
                  onChange={(e) => setEvalImpact(e.target.value)}
                  placeholder="품질 신뢰성, 공정 공수, 안전 위해성, 재고 폐기 영향 등 상세 기록"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">판정 결과</label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="evalApproval"
                      checked={evalIsApproved}
                      onChange={() => setEvalIsApproved(true)}
                    />
                    <span className="text-emerald-700 font-semibold">적합 / 승인 동의</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="evalApproval"
                      checked={!evalIsApproved}
                      onChange={() => setEvalIsApproved(false)}
                    />
                    <span className="text-rose-700 font-semibold">부적합 / 반려</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowEvaluationModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isCreatingEvaluation}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow"
                >
                  {isCreatingEvaluation ? '저장 중...' : '평가 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
