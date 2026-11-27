import React from 'react';
import {
  Target,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
} from 'lucide-react';
import {
  calculateWeightedObjectiveProgress,
  type MboStatus,
  type MboLevel,
} from '../domain/mboEngine';

export interface ObjectiveNode {
  id: string;
  parentId: string | null;
  level: MboLevel;
  departmentName: string;
  ownerName: string;
  title: string;
  description: string;
  successCriteria: string;
  status: MboStatus;
  startDate: string;
  targetDate: string;
  weight: number;
  progressRate: number;
  revision: number;
  isRevised?: boolean;
  revisionCount?: number;
  targetValue?: number | null;
  rejectionReason?: string;
}

interface MboObjectiveTreeViewerProps {
  objectives: ObjectiveNode[];
  selectedObjectiveId: string;
  onSelectObjective: (id: string) => void;
  onOpenCreateModal: () => void;
  onRequestApproval: (id: string) => void;
  onApprove: (id: string) => void;
  onOpenRejectModal: (id: string) => void;
  onOpenRevisionHistory?: (id: string) => void;
  onOpenRevise?: (id: string) => void;
}

export const MboObjectiveTreeViewer: React.FC<MboObjectiveTreeViewerProps> = ({
  objectives,
  selectedObjectiveId,
  onSelectObjective,
  onOpenCreateModal,
  onRequestApproval,
  onApprove,
  onOpenRejectModal,
  onOpenRevisionHistory,
  onOpenRevise,
}) => {
  // 전사 가중 진척률
  const overallProgress = calculateWeightedObjectiveProgress(
    objectives.map((o) => ({ weight: o.weight, progressRate: o.progressRate }))
  );

  const getStatusBadge = (status: MboStatus) => {
    switch (status) {
      case 'draft':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">작성 중</span>;
      case 'submitted':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">승인 요청</span>;
      case 'approved':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">승인 완료</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">반려됨</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">실행 중</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-700">목표 달성</span>;
      default:
        return null;
    }
  };

  const getLevelBadge = (level: MboLevel) => {
    switch (level) {
      case 'company':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-50 text-slate-700">전사 목표</span>;
      case 'department':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">부서 목표</span>;
      case 'individual':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700">개인 KPI</span>;
      case 'project':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">프로젝트</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 전사 종합 요약 카드 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-800" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">MBO 목표 달성 진척률</h2>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-900">{overallProgress}%</span>
            <span className="text-xs text-slate-400 font-semibold">(전사 가중 평균)</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-48 bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-900 transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>신규 목표 등록</span>
          </button>
        </div>
      </div>

      {/* 목표 계층 트리 카드 목록 */}
      <div className="space-y-3">
        {objectives.map((obj) => {
          const isSelected = obj.id === selectedObjectiveId;
          const isChild = obj.parentId !== null;

          return (
            <div
              key={obj.id}
              onClick={() => onSelectObjective(obj.id)}
              className={`rounded-2xl border transition-all cursor-pointer p-4.5 bg-white shadow-xs ${
                isSelected
                  ? 'border-slate-400 ring-2 ring-slate-900'
                  : 'border-slate-200 hover:border-slate-300'
              } ${isChild ? 'ml-6 sm:ml-10 border-l-4 border-l-indigo-300' : ''}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {getLevelBadge(obj.level)}
                  <span className="text-xs font-bold text-slate-500">{obj.departmentName}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs font-semibold text-slate-700">{obj.ownerName}</span>
                  <span className="text-[11px] font-bold text-slate-800 bg-slate-50/50 px-2 py-0.5 rounded-full">
                    가중치 {obj.weight}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {(obj.isRevised || (obj.revisionCount ?? obj.revision) > 1) && (
                    <button
                      type="button"
                      className="min-h-12 rounded-full bg-amber-50 px-3 text-[11px] font-bold text-amber-800"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenRevisionHistory?.(obj.id);
                      }}
                    >
                      ⚠️ {(obj.revisionCount ?? obj.revision)}회 수정됨
                    </button>
                  )}
                  {getStatusBadge(obj.status)}
                  <span className="text-[10px] text-slate-400 font-mono">v{obj.revision}</span>
                </div>
              </div>

              <h3 className="text-sm font-extrabold text-slate-900 mb-1">{obj.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{obj.description}</p>

              {/* 핵심 성공 지표 (KPI) */}
              <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold truncate mr-2">
                  <span className="font-bold text-slate-700">핵심 성공 기준:</span> {obj.successCriteria}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-slate-900">{obj.progressRate}%</span>
                  <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${obj.progressRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 반려 사유 표시 */}
              {obj.status === 'rejected' && obj.rejectionReason && (
                <div className="mt-2.5 p-2 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>반려 사유: {obj.rejectionReason}</span>
                </div>
              )}

              {/* 워크플로 액션 버튼 */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  기한: {obj.startDate} ~ {obj.targetDate}
                </span>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {obj.status !== 'completed' && obj.status !== 'canceled' && (
                    <button
                      type="button"
                      onClick={() => onOpenRevise?.(obj.id)}
                      className="min-h-12 rounded-lg bg-amber-50 px-2.5 text-[11px] font-bold text-amber-800"
                    >
                      월별 점검·수정
                    </button>
                  )}
                  {obj.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => onRequestApproval(obj.id)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      승인 요청
                    </button>
                  )}

                  {obj.status === 'submitted' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onApprove(obj.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        승인
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenRejectModal(obj.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-bold flex items-center gap-1"
                      >
                        반려
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
