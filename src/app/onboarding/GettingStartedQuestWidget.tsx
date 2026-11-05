import React, { useState, useEffect, useMemo, FC } from 'react';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Ticket,
  Calendar,
  Building2,
  Package,
  Clock,
  FileText,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  getPresetQuests,
  calculateQuestProgress,
  getQuestStorageKey,
  type QuestItem,
  type QuestIconType,
} from './questEngine';
import {
  detectCompletedQuestIds,
  isQuestWidgetDismissed,
  mergeQuestCompletion,
  setQuestWidgetDismissed,
} from './questCompletion';
import { EDUCATION_ROLE_BLURB } from '@/core/help/educationCopy';

interface GettingStartedQuestWidgetProps {
  onNavigate: (tab: string) => void;
  organizationId?: string;
  industryType?: string;
  customerWord?: string;
  placeWord?: string;
  onOpenCustomerModal?: () => void;
  /** true면 미완료일 때만 강조(홈 밀도 완화). 기본 false */
  compactWhenComplete?: boolean;
}

const ICON_MAP: Record<QuestIconType, React.ReactNode> = {
  user: <UserPlus className="w-5 h-5 text-indigo-600" />,
  ticket: <Ticket className="w-5 h-5 text-emerald-600" />,
  calendar: <Calendar className="w-5 h-5 text-amber-600" />,
  building: <Building2 className="w-5 h-5 text-blue-600" />,
  package: <Package className="w-5 h-5 text-purple-600" />,
  clock: <Clock className="w-5 h-5 text-orange-600" />,
  file: <FileText className="w-5 h-5 text-teal-600" />,
  sparkles: <Sparkles className="w-5 h-5 text-rose-600" />,
};

export const GettingStartedQuestWidget: FC<GettingStartedQuestWidgetProps> = ({
  onNavigate,
  organizationId,
  industryType,
  customerWord = '고객',
  placeWord = '사업장',
  onOpenCustomerModal,
  compactWhenComplete = true,
}) => {
  const quests = useMemo(
    () => getPresetQuests(industryType, customerWord, placeWord),
    [industryType, customerWord, placeWord]
  );

  const storageKey = useMemo(() => getQuestStorageKey(organizationId), [organizationId]);

  const [manualIds, setManualIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved) as string[];
    } catch {
      // fallback
    }
    return [];
  });

  const [detectedIds, setDetectedIds] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(() => isQuestWidgetDismissed(organizationId));
  const [userExpandedAfterComplete, setUserExpandedAfterComplete] = useState(false);

  const completedIds = useMemo(
    () => mergeQuestCompletion(manualIds, detectedIds),
    [manualIds, detectedIds]
  );

  // 실데이터 자동 완료 감지
  useEffect(() => {
    try {
      const detected = detectCompletedQuestIds(quests);
      setDetectedIds(detected);
      if (detected.length === 0) return;
      setManualIds((prev) => {
        const merged = mergeQuestCompletion(prev, detected);
        if (merged.length === prev.length && merged.every((id, i) => id === prev[i])) return prev;
        try {
          localStorage.setItem(storageKey, JSON.stringify(merged));
        } catch {
          // noop
        }
        return merged;
      });
    } catch {
      // noop
    }
  }, [quests, storageKey]);

  const progress = useMemo(
    () => calculateQuestProgress(quests, completedIds),
    [quests, completedIds]
  );

  // 100% 완료 시 기본 접힘
  useEffect(() => {
    if (progress.isAllCompleted && compactWhenComplete && !userExpandedAfterComplete) {
      setIsCollapsed(true);
    }
  }, [progress.isAllCompleted, compactWhenComplete, userExpandedAfterComplete]);

  const persistManual = (next: string[]) => {
    setManualIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // noop
    }
  };

  const toggleQuest = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    persistManual(
      completedIds.includes(id)
        ? completedIds.filter((item) => item !== id)
        : [...completedIds, id]
    );
  };

  const handleAction = (quest: QuestItem) => {
    if (
      (quest.id.includes('first') || quest.id.includes('member') || quest.id.includes('entity')) &&
      quest.targetTab === 'students' &&
      onOpenCustomerModal
    ) {
      onOpenCustomerModal();
      return;
    }
    onNavigate(quest.targetTab);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    persistManual([]);
    setDetectedIds([]);
    setQuestWidgetDismissed(organizationId, false);
    setDismissed(false);
    setUserExpandedAfterComplete(true);
    setIsCollapsed(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // noop
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuestWidgetDismissed(organizationId, true);
    setDismissed(true);
  };

  const handleShowAgain = () => {
    setQuestWidgetDismissed(organizationId, false);
    setDismissed(false);
    setUserExpandedAfterComplete(true);
    setIsCollapsed(false);
  };

  const handleToggleCollapse = () => {
    if (isCollapsed && progress.isAllCompleted) {
      setUserExpandedAfterComplete(true);
    }
    setIsCollapsed((v) => !v);
  };

  if (quests.length === 0) return null;

  if (dismissed) {
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
        data-testid="getting-started-quest-widget-dismissed"
      >
        <p className="text-xs text-slate-500">첫걸음 가이드를 숨겼습니다.</p>
        <button
          type="button"
          onClick={handleShowAgain}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-50"
        >
          <Eye className="w-3.5 h-3.5" />
          다시 보기
        </button>
      </div>
    );
  }

  return (
    <div
      className="bg-gradient-to-br from-white via-indigo-50/20 to-slate-50/80 rounded-3xl border border-indigo-100/80 p-5 sm:p-7 shadow-xs relative overflow-hidden transition-all duration-300"
      data-testid="getting-started-quest-widget"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-50">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>사업장 맞춤형 첫걸음 퀘스트</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            대표님을 위한 {placeWord} 첫 세팅 가이드
          </h2>
          <p className="text-xs text-slate-500">{EDUCATION_ROLE_BLURB.quest}</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200/80 shadow-2xs min-w-[140px]">
            <div className="flex justify-between items-center text-xs font-black mb-1.5">
              <span className="text-slate-600">진척도</span>
              <span className={progress.isAllCompleted ? 'text-emerald-600' : 'text-indigo-600'}>
                {progress.completedCount}/{progress.totalQuests} 완료 ({progress.progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress.isAllCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
          </div>

          {progress.isAllCompleted && (
            <button
              type="button"
              onClick={handleDismiss}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="가이드 숨기기"
              data-testid="quest-widget-dismiss"
            >
              <EyeOff className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleCollapse}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={isCollapsed ? '펼치기' : '접기'}
          >
            {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {progress.isAllCompleted && !isCollapsed && (
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-sm sm:text-base">
                축하합니다! 모든 첫걸음 퀘스트를 완수하셨습니다!
              </p>
              <p className="text-xs text-emerald-100 mt-0.5">
                이제 {placeWord} 운영이 준비되었습니다. 본격적으로 {customerWord}을 맞이해보세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-white/80 hover:text-white flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-lg bg-black/10 hover:bg-black/20 transition-colors"
            title="퀘스트 초기화"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>다시하기</span>
          </button>
        </div>
      )}

      {!isCollapsed && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {quests.map((quest) => {
            const isDone = completedIds.includes(quest.id);

            return (
              <div
                key={quest.id}
                className={`relative rounded-2xl p-4 transition-all duration-200 border flex flex-col justify-between ${
                  isDone
                    ? 'bg-emerald-50/40 border-emerald-200/60 shadow-2xs'
                    : 'bg-white border-slate-200/90 hover:border-indigo-200 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {quest.stepNumber}단계
                    </span>
                    <button
                      type="button"
                      onClick={(e) => toggleQuest(quest.id, e)}
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-600 transition-colors"
                      title={isDone ? '완료 취소' : '완료로 표시'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-start gap-2.5 mb-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 border border-slate-100'
                      }`}
                    >
                      {ICON_MAP[quest.icon] || <Sparkles className="w-5 h-5 text-indigo-600" />}
                    </div>
                    <div className="min-w-0">
                      <h3
                        className={`text-sm font-bold leading-tight ${
                          isDone ? 'text-slate-500 line-through' : 'text-slate-900'
                        }`}
                      >
                        {quest.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                        {quest.description}
                      </p>
                    </div>
                  </div>

                  {quest.helpTip && !isDone && (
                    <div className="mt-2.5 p-2 bg-indigo-50/60 rounded-xl text-[11px] text-indigo-800 leading-relaxed border border-indigo-100/50">
                      팁: {quest.helpTip}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleAction(quest)}
                    className={`inline-flex items-center gap-1.5 text-xs font-bold transition-colors ${
                      isDone
                        ? 'text-slate-400 hover:text-slate-600'
                        : 'text-indigo-600 hover:text-indigo-800'
                    }`}
                  >
                    <span>{quest.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
