import React, { useState, useEffect, useMemo } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  Workflow,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  X,
  Search,
  Filter,
  Package,
  Users,
  Flame,
  BarChart3,
  Calendar,
  Layers,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { LocalStorageNoticeBanner } from '@/shared/components';
import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import {
  transitionTaskPipelineStage,
  evaluateStageSla,
  calculateStaffWorkload,
  detectStageBottlenecks,
  type PipelineStage,
  type TaskOrder,
} from '../domain/taskPipelineEngine';

const STORAGE_KEY_PIPELINES = 'moa_task_pipeline_orders';

export interface TaskPipelineKanbanViewProps {
  defaultOrderType?: 'custom_order' | 'repair' | 'manufacturing' | 'maintenance' | 'inspection';
  title?: string;
  subtitle?: string;
}

const KANBAN_STAGES: { stage: PipelineStage; label: string; color: string }[] = [
  { stage: 'RECEIVED', label: '의뢰 접수', color: 'border-slate-300 bg-slate-50/50' },
  { stage: 'IN_PROGRESS', label: '작업 진행 중', color: 'border-blue-200 bg-blue-50/20' },
  { stage: 'PARTS_WAITING', label: '부품·자재 대기', color: 'border-amber-200 bg-amber-50/20' },
  { stage: 'INSPECTION', label: '품질 검수', color: 'border-slate-200 bg-slate-50/20' },
  { stage: 'READY_FOR_PICKUP', label: '출고·픽업 대기', color: 'border-emerald-200 bg-emerald-50/20' },
  { stage: 'COMPLETED', label: '최종 완료', color: 'border-slate-200 bg-slate-50/20' },
];

export const TaskPipelineKanbanView: React.FC<TaskPipelineKanbanViewProps> = ({
  defaultOrderType = 'custom_order',
  title = '작업 파이프라인 (칸반 보드)',
  subtitle = '자동차 정비, 공방 맞춤제작, 세탁·수선, 설비 수리 등 전사 작업 공정을 실시간 추적합니다.',
}) => {
  const [localOrders, setLocalOrders] = useState<TaskOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const storageKey = getTenantStorageKey(STORAGE_KEY_PIPELINES);

  // Refine 데이터 바인딩
  const { query } = useList<any>({
    resource: 'task_orders',
    pagination: { mode: 'off' },
  });

  const refineRows = query?.data?.data;
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: mutateCreate } = useCreate();
  const { mutate: mutateUpdate } = useUpdate();

  // 로컬은 오프라인 작성분만 보관. 빈 테넌트에 샘플 수리 주문을 심지 않는다.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setLocalOrders(JSON.parse(saved));
      } else {
        setLocalOrders([]);
      }
    } catch {
      setLocalOrders([]);
    }
  }, [storageKey]);

  // Refine 서버 데이터 우선. 로딩 중이거나 서버 행이 있으면 로컬 샘플로 채우지 않음.
  const orders: TaskOrder[] = useMemo(() => {
    if (refineRows && refineRows.length > 0) {
      return refineRows.map((row: any) => ({
        id: row.id,
        orderNumber: row.order_number || row.id,
        orderType: row.order_type,
        title: row.title,
        customerId: row.customer_id,
        customerName: row.customer_name || '고객',
        customerPhone: row.customer_phone,
        targetItemName: row.target_item_name,
        currentStage: row.current_stage as PipelineStage,
        stageEnteredAt: row.stage_entered_at || row.created_at,
        slaHours: row.sla_hours || 24,
        laborFee: row.labor_fee,
        partsCost: row.parts_cost,
        totalAmount: row.total_amount,
        diagnosis: row.diagnosis,
        holdReason: row.hold_reason,
        details: row.details,
      }));
    }
    if (isLoading) return [];
    return localOrders;
  }, [refineRows, localOrders, isLoading]);

  const saveLocalOrders = (next: TaskOrder[]) => {
    setLocalOrders(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // 무시
    }
  };

  const handleStageTransition = (order: TaskOrder, targetStage: PipelineStage) => {
    const res = transitionTaskPipelineStage(order, targetStage);
    if (!res.success) {
      showToast(res.error || '단계 이동에 실패했습니다.', 'warning');
      return;
    }

    // 서버 업데이트 시도
    if (refineRows && refineRows.length > 0) {
      mutateUpdate(
        {
          resource: 'task_orders',
          id: order.id,
          values: {
            current_stage: targetStage,
            stage_entered_at: new Date().toISOString(),
          },
        },
        {
          onSuccess: () => {
            refetch();
            showToast(`'${order.orderNumber}' 작업이 [${targetStage}] 단계로 이동했습니다.`, 'success');
          },
          onError: () => {
            // 폴백: 로컬 상태 업데이트
            const next = orders.map((o) => (o.id === order.id ? res.updatedOrder : o));
            saveLocalOrders(next);
            showToast(`'${order.orderNumber}' 작업이 [${targetStage}] 단계로 로컬 이동했습니다.`, 'info');
          },
        }
      );
    } else {
      const next = orders.map((o) => (o.id === order.id ? res.updatedOrder : o));
      saveLocalOrders(next);
      showToast(`'${order.orderNumber}' 작업이 [${targetStage}] 단계로 이동했습니다.`, 'success');
    }
  };

  const [viewMode, setViewMode] = useState<'kanban' | 'gantt'>('kanban');

  // 팀원별 업무 부하(Workload Clumping) & 공정 병목 실시간 계산
  const staffWorkloads = useMemo(() => calculateStaffWorkload(orders), [orders]);
  const stageBottlenecks = useMemo(() => detectStageBottlenecks(orders), [orders]);
  const currentBottleneck = useMemo(
    () => stageBottlenecks.find((b) => b.isBottleneck && b.activeTaskCount > 0),
    [stageBottlenecks]
  );

  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(term) ||
        o.title.toLowerCase().includes(term) ||
        (o.customerName && o.customerName.toLowerCase().includes(term)) ||
        (o.customerId && o.customerId.toLowerCase().includes(term)) ||
        (o.assignedStaffName && o.assignedStaffName.toLowerCase().includes(term))
    );
  }, [orders, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-2 pb-12">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-1.5">
            <Workflow className="w-3.5 h-3.5" />
            <span>엔터프라이즈 작업 공정 & 워크로드 관제</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* 듀얼 뷰 모드 토글 (칸반 vs 간트) */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>칸반 보드</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gantt')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'gantt'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>간트 타임라인</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>신규 작업 주문 접수</span>
          </button>
        </div>
      </div>

      <LocalStorageNoticeBanner featureName="작업 공정 칸반 파이프라인" />

      {/* 팀원별 업무 부하(Workload Clumping) & 병목 공정 위젯 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 병목 공정 안내 배너 */}
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <span>실시간 병목(Bottleneck) 공정 진단</span>
            </h4>
            {currentBottleneck ? (
              <p className="text-xs text-amber-800 mt-1">
                현재 <strong>[{currentBottleneck.stage}]</strong> 단계에{' '}
                <strong className="text-rose-600">{currentBottleneck.activeTaskCount}건</strong>의
                과업이 체류 중입니다.{' '}
                {currentBottleneck.breachedTaskCount > 0 && (
                  <span className="text-rose-600 font-bold">
                    ({currentBottleneck.breachedTaskCount}건 SLA 초과 지연)
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-amber-700 mt-1">전 공정이 지연 없이 원활하게 진행 중입니다.</p>
            )}
          </div>
        </div>

        {/* 팀원별 업무 집중도 (Workload Clumping Alert) */}
        <div className="md:col-span-2 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span>팀원별 업무 부하 집중도 (Workload Clumping)</span>
            </span>
            <span className="text-[11px] text-slate-400">주의: 4건 이상 | 위험: 5건 이상</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {staffWorkloads.length === 0 ? (
              <span className="text-xs text-slate-400">진행 중인 과업이 없습니다.</span>
            ) : (
              staffWorkloads.map((sw) => {
                const isCritical = sw.alertLevel === 'CRITICAL';
                const isWarning = sw.alertLevel === 'WARNING';

                return (
                  <div
                    key={sw.staffId}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                      isCritical
                        ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-xs'
                        : isWarning
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="font-bold">{sw.staffName}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md font-mono text-[11px] font-extrabold ${
                        isCritical
                          ? 'bg-rose-600 text-white'
                          : isWarning
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {sw.activeTaskCount}건
                    </span>
                    {isCritical && (
                      <span className="text-[10px] font-bold text-rose-600 animate-pulse">과부하</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 검색 바 */}
      <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="주문 번호, 의뢰 품목, 고객명, 담당자 검색"
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-semibold">
          전체 <span className="text-blue-600 font-bold">{orders.length}</span>건 진행 중
        </div>
      </div>

      {!isLoading && orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          등록된 작업이 없습니다. 「새 작업 등록」으로 첫 공정 주문을 추가하세요.
        </div>
      ) : null}

      {/* 뷰 모드 분기 (칸반 vs 간트 타임라인) */}
      {viewMode === 'kanban' ? (
        /* 칸반 6단 컬럼 */
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3.5 items-start">
          {KANBAN_STAGES.map((col) => {
            const colOrders = filteredOrders.filter((o) => o.currentStage === col.stage);
            return (
              <div
                key={col.stage}
                className={`rounded-2xl border ${col.color} p-3 min-h-[480px] flex flex-col space-y-3 bg-white/70 shadow-xs`}
              >
                {/* 컬럼 헤더 */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-extrabold text-slate-800">{col.label}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[11px] font-bold">
                    {colOrders.length}
                  </span>
                </div>

                {/* 주문 카드 목록 */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-0.5">
                  {colOrders.length === 0 ? (
                    <div className="py-12 text-center text-[11px] text-slate-400">진행 건 없음</div>
                  ) : (
                    colOrders.map((order) => {
                      const slaHours = order.slaHoursPerStage?.[col.stage] || order.slaHours || 24;
                      const sla = evaluateStageSla({
                        stageEnteredAt: order.stageEnteredAt,
                        slaHours,
                        currentTime: new Date().toISOString(),
                      });

                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5 shadow-xs hover:shadow-md transition-shadow"
                        >
                          {/* 주문 번호 & SLA 배지 */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[11px] font-bold text-slate-500">
                              {order.orderNumber}
                            </span>
                            {col.stage !== 'COMPLETED' && (
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                  sla.isBreached
                                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <Clock className="w-2.5 h-2.5" />
                                {sla.isBreached
                                  ? `지연 (${Math.abs(sla.remainingHours)}h)`
                                  : `${sla.remainingHours}h`}
                              </span>
                            )}
                          </div>

                          {/* 작업명 */}
                          <p className="text-xs font-bold text-slate-900 leading-snug">{order.title}</p>

                          {/* 고객 정보 및 품목 */}
                          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                            <span>{order.customerName || (order.customerId || '').replace('cust-', '')}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(order.stageEnteredAt).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {/* 단계 전이 액션 버튼들 */}
                          <div className="flex flex-col gap-1 pt-1">
                            {col.stage === 'RECEIVED' && (
                              <button
                                type="button"
                                onClick={() => handleStageTransition(order, 'IN_PROGRESS')}
                                className="w-full py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center gap-1"
                              >
                                <span>작업 착수</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}

                            {col.stage === 'IN_PROGRESS' && (
                              <div className="grid grid-cols-2 gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStageTransition(order, 'PARTS_WAITING')}
                                  className="py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center gap-0.5"
                                >
                                  <Package className="w-2.5 h-2.5" />
                                  <span>부품 대기</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStageTransition(order, 'INSPECTION')}
                                  className="py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center gap-0.5"
                                >
                                  <span>검수 요청</span>
                                  <ChevronRight className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}

                            {col.stage === 'PARTS_WAITING' && (
                              <button
                                type="button"
                                onClick={() => handleStageTransition(order, 'IN_PROGRESS')}
                                className="w-full py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center gap-1"
                              >
                                <span>작업 재개</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}

                            {col.stage === 'INSPECTION' && (
                              <div className="grid grid-cols-2 gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStageTransition(order, 'IN_PROGRESS')}
                                  className="py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center justify-center gap-0.5"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>재작업</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStageTransition(order, 'READY_FOR_PICKUP')}
                                  className="py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center gap-0.5"
                                >
                                  <span>검수 합격</span>
                                  <ChevronRight className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}

                            {col.stage === 'READY_FOR_PICKUP' && (
                              <button
                                type="button"
                                onClick={() => handleStageTransition(order, 'COMPLETED')}
                                className="w-full py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>고객 인도 완료</span>
                              </button>
                            )}

                            {col.stage === 'COMPLETED' && (
                              <span className="w-full text-center py-1 text-[11px] font-bold text-slate-400">
                                공정 마감
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 간트 타임라인 뷰 */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">
                공정별 진행 타임라인 및 마일스톤 현황
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                진행 중
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                부품 대기
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                출고 대기
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block"></span>
                완료
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">표시할 과업이 없습니다.</div>
            ) : (
              filteredOrders.map((order) => {
                const stageProgressMap: Record<PipelineStage, { pct: number; label: string; color: string }> = {
                  RECEIVED: { pct: 15, label: '접수', color: 'bg-slate-400' },
                  IN_PROGRESS: { pct: 40, label: '작업 중', color: 'bg-blue-600' },
                  PARTS_WAITING: { pct: 55, label: '부품 대기', color: 'bg-amber-500' },
                  INSPECTION: { pct: 75, label: '검수', color: 'bg-slate-900' },
                  READY_FOR_PICKUP: { pct: 90, label: '출고 대기', color: 'bg-emerald-600' },
                  COMPLETED: { pct: 100, label: '완료', color: 'bg-slate-900' },
                  ON_HOLD: { pct: 50, label: '보류', color: 'bg-amber-600' },
                  CANCELLED: { pct: 0, label: '취소', color: 'bg-rose-600' },
                };

                const currentProg = stageProgressMap[order.currentStage] || { pct: 0, label: '', color: 'bg-slate-300' };
                const slaHours = order.slaHoursPerStage?.[order.currentStage] || order.slaHours || 24;
                const sla = evaluateStageSla({
                  stageEnteredAt: order.stageEnteredAt,
                  slaHours,
                  currentTime: new Date().toISOString(),
                });

                return (
                  <div key={order.id} className="p-4 hover:bg-slate-50/50 transition-colors space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {order.orderNumber}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{order.title}</h4>
                        <span className="text-[11px] text-slate-400">|</span>
                        <span className="text-xs text-slate-600">
                          고객: <strong>{order.customerName || (order.customerId || '').replace('cust-', '')}</strong>
                        </span>
                        {order.assignedStaffName && (
                          <span className="text-xs text-slate-500">
                            (담당: {order.assignedStaffName})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {order.currentStage !== 'COMPLETED' && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              sla.isBreached
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {sla.isBreached ? `SLA 지연 (${Math.abs(sla.remainingHours)}h)` : `SLA 잔여 ${sla.remainingHours}h`}
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {currentProg.label} ({currentProg.pct}%)
                        </span>
                      </div>
                    </div>

                    {/* 간트 프로그레스 바 */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full ${currentProg.color} transition-all duration-300 rounded-full`}
                        style={{ width: `${currentProg.pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>접수일: {new Date(order.createdAt || order.stageEnteredAt).toLocaleDateString('ko-KR')}</span>
                      <span>현재 공정 진입: {new Date(order.stageEnteredAt).toLocaleString('ko-KR', { hour12: false })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 신규 작업 접수 모달 */}
      {isNewModalOpen && (
        <NewTaskOrderModal
          defaultOrderType={defaultOrderType}
          onClose={() => setIsNewModalOpen(false)}
          onCreated={(newOrder) => {
            if (refineRows) {
              mutateCreate(
                {
                  resource: 'task_orders',
                  values: {
                    order_number: newOrder.orderNumber,
                    order_type: newOrder.orderType || defaultOrderType,
                    title: newOrder.title,
                    customer_name: newOrder.customerName,
                    current_stage: 'RECEIVED',
                    sla_hours: newOrder.slaHours || 24,
                  },
                },
                {
                  onSuccess: () => {
                    refetch();
                    setIsNewModalOpen(false);
                    showToast(`신규 작업 '${newOrder.orderNumber}'이 접수되었습니다.`, 'success');
                  },
                  onError: () => {
                    saveLocalOrders([newOrder, ...orders]);
                    setIsNewModalOpen(false);
                    showToast(`신규 작업 '${newOrder.orderNumber}'이 로컬 저장되었습니다.`, 'info');
                  },
                }
              );
            } else {
              saveLocalOrders([newOrder, ...orders]);
              setIsNewModalOpen(false);
              showToast(`신규 작업 '${newOrder.orderNumber}'이 접수되었습니다.`, 'success');
            }
          }}
        />
      )}
    </div>
  );
};

interface NewModalProps {
  defaultOrderType: string;
  onClose: () => void;
  onCreated: (order: TaskOrder) => void;
}

const NewTaskOrderModal: React.FC<NewModalProps> = ({ defaultOrderType, onClose, onCreated }) => {
  const [customerName, setCustomerName] = useState('');
  const [title, setTitle] = useState('');
  const [slaHours, setSlaHours] = useState('24');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !customerName.trim()) {
      showToast('작업 품목명과 고객명을 입력해주세요.', 'warning');
      return;
    }

    const orderNumber = `RO-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const newOrder: TaskOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      orderType: defaultOrderType as any,
      title: title.trim(),
      customerId: `cust-${customerName.trim()}`,
      customerName: customerName.trim(),
      currentStage: 'RECEIVED',
      stageEnteredAt: new Date().toISOString(),
      slaHours: Number(slaHours) || 24,
      slaHoursPerStage: {
        RECEIVED: Number(slaHours) || 24,
        IN_PROGRESS: Number(slaHours) || 24,
      },
    };

    onCreated(newOrder);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-extrabold text-slate-900">신규 작업 의뢰 접수</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">고객명</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="예: 김민수"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">의뢰 작업 및 품목명</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 엔진오일 교환 및 하부 점검 / 가죽 재킷 수선"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">기본 목표 완료 시간 (SLA)</label>
            <select
              value={slaHours}
              onChange={(e) => setSlaHours(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="4">4시간 이내 (당일 특급)</option>
              <option value="12">12시간 이내</option>
              <option value="24">24시간 이내 (1일)</option>
              <option value="48">48시간 이내 (2일)</option>
              <option value="72">72시간 이내 (3일)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              접수 및 칸반 등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
