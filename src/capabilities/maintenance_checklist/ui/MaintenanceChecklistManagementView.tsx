import React, { useMemo, useState } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  ShieldAlert,
  X,
  Sliders,
  Printer,
  Wrench,
  FileCheck2,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { useOpsTable } from '@/hooks/useOpsTable';
import {
  calculateChecklistProgress,
  evaluateChecklistUrgency,
  evaluateToleranceResult,
  generateCapaTicketFromInspectionFail,
  type ChecklistItem,
  type CapaTicketDraft,
} from '../domain/maintenanceChecklistEngine';

type MaintenanceRow = {
  id: string;
  title: string;
  items: Array<Record<string, unknown>>;
  status: string;
  department_id?: string | null;
};

function rowToItem(row: MaintenanceRow): ChecklistItem {
  const meta = row.items?.[0] ?? {};
  return {
    id: row.id,
    title: row.title,
    isRequired: (meta.is_required as boolean) ?? true,
    isCompleted: row.status === 'done' || Boolean(meta.is_completed),
    completedAt: meta.completed_at as string | undefined,
    completedBy: meta.completed_by as string | undefined,
    numericValue: meta.numeric_value as number | undefined,
    minThreshold: meta.min_threshold as number | undefined,
    maxThreshold: meta.max_threshold as number | undefined,
  };
}

export const MaintenanceChecklistManagementView: React.FC = () => {
  const { rows, loading: isLoading, create, update, reload: refetch } = useOpsTable<MaintenanceRow>('maintenance_checklists');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isHaccpPrintOpen, setIsHaccpPrintOpen] = useState(false);
  const [selectedCapaTicket, setSelectedCapaTicket] = useState<CapaTicketDraft | null>(null);

  const items: ChecklistItem[] = useMemo(() => rows.map(rowToItem), [rows]);

  const saveLocalItems = (next: ChecklistItem[]) => {
    void Promise.all(
      next.map((item) =>
        update(item.id, {
          title: item.title,
          status: item.isCompleted ? 'done' : 'open',
          items: [
            {
              is_required: item.isRequired,
              is_completed: item.isCompleted,
              completed_at: item.completedAt,
              completed_by: item.completedBy,
              numeric_value: item.numericValue,
              min_threshold: item.minThreshold,
              max_threshold: item.maxThreshold,
            },
          ],
        }),
      ),
    ).then(() => refetch());
  };

  const toggleComplete = (item: ChecklistItem) => {
    const nextCompleted = !item.isCompleted;
    const completedAt = nextCompleted ? new Date().toISOString() : undefined;
    const completedBy = nextCompleted ? '현재 사용자' : undefined;

    const next = items.map((i) =>
      i.id === item.id ? { ...i, isCompleted: nextCompleted, completedAt, completedBy } : i
    );
    saveLocalItems(next);
      showToast(nextCompleted ? '점검 완료 처리되었습니다.' : '점검 상태가 취소되었습니다.', 'success');
  };

  const updateNumericValue = (item: ChecklistItem, value: number) => {
    const next = items.map((i) => (i.id === item.id ? { ...i, numericValue: value, isCompleted: true } : i));
    saveLocalItems(next);
  };

  // 진행률 산출
  const progress = useMemo(() => calculateChecklistProgress(items), [items]);

  // 긴급도 평가 (마감 시각: 당일 22:00 기준)
  const urgency = useMemo(() => {
    const currentHHMM = new Date().toTimeString().slice(0, 5);
    return evaluateChecklistUrgency({
      items,
      deadlineTime: '22:00',
      currentTime: currentHHMM,
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    return items.filter((i) => i.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [items, searchTerm]);

  // CAPA 긴급 정비 티켓 발행 처리
  const handleTriggerCapa = (item: ChecklistItem) => {
    const ticket = generateCapaTicketFromInspectionFail(
      {
        itemId: item.id,
        itemTitle: item.title,
        numericValue: item.numericValue || 0,
        minAllowed: item.minThreshold,
        maxAllowed: item.maxThreshold,
        unit: '℃/bar',
      },
      '시설 관리자'
    );
    setSelectedCapaTicket(ticket);
    showToast(`[${ticket.ticketNumber}] 시정조치(CAPA) 긴급 티켓이 발행되었습니다.`, 'warning');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-2 pb-12">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-semibold mb-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>시설 안전, 공차(Tolerance) 및 CAPA 연계 관제</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">시설 점검 체크리스트</h1>
          <p className="text-xs text-slate-500 mt-1">
            정량 수치 공차 판정, 이상치 발생 시 CAPA 티켓 자동 연계 및 식약처 HACCP 법정 서식 인쇄
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>HACCP/소방 법정 서식 인쇄</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>점검 항목 추가</span>
          </button>
        </div>
      </div>

      {/* 진행률 & 긴급도 지표 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 진행률 바 */}
        <div className="sm:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">오늘의 점검 완료율</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{progress.ratePercent}%</span>
                <span className="text-xs text-slate-500 font-semibold">
                  ({progress.completedCount}/{progress.totalCount}건 완료)
                </span>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                progress.isRequiredFulfilled
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {progress.isRequiredFulfilled ? '필수 점검 완료' : '필수 점검 미완료'}
            </span>
          </div>

          {/* 프로그레스 바 */}
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress.ratePercent === 100
                  ? 'bg-emerald-500'
                  : progress.ratePercent >= 50
                  ? 'bg-teal-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${progress.ratePercent}%` }}
            />
          </div>
        </div>

        {/* 상태 경고 레벨 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <p className="text-xs font-bold uppercase text-slate-400">점검 상태 알림</p>
          <div className="flex items-center gap-2 mt-2">
            {urgency.alertLevel === 'CRITICAL' ? (
              <ShieldAlert className="w-6 h-6 text-rose-500" />
            ) : urgency.alertLevel === 'WARNING' ? (
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            )}
            <span
              className={`text-base font-extrabold ${
                urgency.alertLevel === 'CRITICAL'
                  ? 'text-rose-600'
                  : urgency.alertLevel === 'WARNING'
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {urgency.alertLevel === 'CRITICAL'
                ? '긴급 조치 필요'
                : urgency.alertLevel === 'WARNING'
                ? '주의 (마감 임박/미완료)'
                : '정상 운영 중'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">일일 마감 기준: 매일 22:00</p>
        </div>
      </div>

      {/* 점검 항목 리스트 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="점검 항목명 검색"
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors ${
                item.isCompleted ? 'bg-slate-50/30' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleComplete(item)}
                  className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                    item.isCompleted
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'border-slate-300 hover:border-teal-500 bg-white'
                  }`}
                >
                  {item.isCompleted && <CheckCircle2 className="w-4 h-4" />}
                </button>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold ${
                        item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'
                      }`}
                    >
                      {item.title}
                    </span>
                    {item.isRequired && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600">
                        필수
                      </span>
                    )}
                  </div>

                  {item.isCompleted && item.completedAt && (
                    <p className="text-[11px] text-slate-400">
                      점검 완료: {new Date(item.completedAt).toLocaleTimeString('ko-KR')} ({item.completedBy})
                    </p>
                  )}
                </div>
              </div>

              {/* 수치 입력형 점검 (있을 경우) */}
              {item.minThreshold !== undefined && item.maxThreshold !== undefined && (() => {
                const tol = item.numericValue !== undefined
                  ? evaluateToleranceResult({
                      itemId: item.id,
                      itemTitle: item.title,
                      numericValue: item.numericValue,
                      minAllowed: item.minThreshold,
                      maxAllowed: item.maxThreshold,
                      unit: '℃/bar',
                    })
                  : null;

                const isFail = tol && !tol.isPassed;

                return (
                  <div className="flex flex-wrap items-center gap-2 pl-8 sm:pl-0">
                    <span className="text-[11px] text-slate-500 font-medium">측정값:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={item.numericValue ?? ''}
                      onChange={(e) => updateNumericValue(item, parseFloat(e.target.value) || 0)}
                      placeholder="수치"
                      className="w-20 px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-800 font-bold focus:ring-2 focus:ring-teal-500"
                    />
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isFail ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {isFail ? `공차 이탈 (FAIL: ${tol.deviation > 0 ? `+${tol.deviation}` : tol.deviation})` : '공차 합격 (PASS)'}
                    </span>

                    {isFail && (
                      <button
                        type="button"
                        onClick={() => handleTriggerCapa(item)}
                        className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] inline-flex items-center gap-1 shadow-xs"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>CAPA 티켓 발행</span>
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>

      {/* CAPA 티켓 확인 모달 */}
      {selectedCapaTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-100 text-rose-700 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-[11px] font-mono font-bold text-rose-600">{selectedCapaTicket.ticketNumber}</span>
                  <h3 className="text-base font-bold text-slate-900">시정조치(CAPA) 긴급 발행 티켓</h3>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedCapaTicket(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-slate-400 block font-medium">대상 점검 설비</span>
                <span className="font-bold text-slate-900 block">{selectedCapaTicket.checklistItemTitle}</span>
                <span className="text-rose-600 font-semibold block">{selectedCapaTicket.failureReason}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">우선순위</span>
                  <span className="font-bold text-rose-700">{selectedCapaTicket.priority}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">배정 조직</span>
                  <span className="font-bold text-slate-800">{selectedCapaTicket.assignedTeam}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900">
                <span className="font-bold block mb-1">시정 계획 (CAPA Plan)</span>
                <p className="text-[11px] leading-relaxed">{selectedCapaTicket.correctiveActionPlan}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCapaTicket(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                확인 및 관제 등록 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 신규 항목 등록 모달 */}
      {isNewModalOpen && (
        <NewChecklistItemModal
          onClose={() => setIsNewModalOpen(false)}
          onCreated={(newItem) => {
            void create({
              title: newItem.title,
              status: 'open',
              department_id: null,
              items: [
                {
                  is_required: newItem.isRequired,
                  is_completed: false,
                  min_threshold: newItem.minThreshold,
                  max_threshold: newItem.maxThreshold,
                },
              ],
            }).then(() => {
              setIsNewModalOpen(false);
              showToast('신규 점검 항목이 등록되었습니다.', 'success');
            }).catch((cause) => {
              showToast.error(cause, '등록 실패');
            });
          }}
        />
      )}
    </div>
  );
};

const NewChecklistItemModal: React.FC<{
  onClose: () => void;
  onCreated: (item: ChecklistItem) => void;
}> = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [isNumeric, setIsNumeric] = useState(false);
  const [minThreshold, setMinThreshold] = useState('');
  const [maxThreshold, setMaxThreshold] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      title: title.trim(),
      isRequired,
      isCompleted: false,
      minThreshold: isNumeric && minThreshold ? parseFloat(minThreshold) : undefined,
      maxThreshold: isNumeric && maxThreshold ? parseFloat(maxThreshold) : undefined,
    };
    onCreated(newItem);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
        <h3 className="text-base font-extrabold text-slate-900">신규 점검 항목 추가</h3>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">점검 항목명</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 공기청정기 필터 먼지 상태 점검"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              required
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded"
            />
            <span className="text-xs font-bold text-slate-700">매일 필수 점검 여부</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isNumeric}
              onChange={(e) => setIsNumeric(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded"
            />
            <span className="text-xs font-bold text-slate-700">수치 측정값 임계치 설정 (온도/수질 등)</span>
          </label>

          {isNumeric && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">최소 허용치</label>
                <input
                  type="number"
                  step="0.1"
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(e.target.value)}
                  placeholder="예: 40.0"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">최대 허용치</label>
                <input
                  type="number"
                  step="0.1"
                  value={maxThreshold}
                  onChange={(e) => setMaxThreshold(e.target.value)}
                  placeholder="예: 43.0"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-xs font-semibold text-slate-500">
              취소
            </button>
            <button type="submit" className="px-4 py-2 bg-teal-600 text-white font-bold rounded-xl text-xs hover:bg-teal-700">
              항목 추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
