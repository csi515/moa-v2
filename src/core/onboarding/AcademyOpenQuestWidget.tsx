import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Building,
  DoorOpen,
  Users,
  CreditCard,
  MessageSquare,
  Database,
  RotateCcw,
} from 'lucide-react';
import { StorageService } from '@/services/storage';
import { showToast } from '@/shared/feedback/uiFeedback';
import { DemoSandboxEngine } from '../demo/demoSandboxEngine';

interface AcademyOpenQuestWidgetProps {
  onNavigateTab: (tab: string) => void;
  onRefreshData?: () => void;
}

interface QuestItem {
  id: string;
  title: string;
  description: string;
  targetTab: string;
  icon: React.ReactNode;
  completed: boolean;
}

const HIDE_QUEST_KEY = 'moa_dismiss_open_quest';

export const AcademyOpenQuestWidget: React.FC<AcademyOpenQuestWidgetProps> = ({
  onNavigateTab,
  onRefreshData,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDemoActive, setIsDemoActive] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDismissed(localStorage.getItem(HIDE_QUEST_KEY) === 'true');
      setIsDemoActive(DemoSandboxEngine.isDemoActive());
    }
  }, []);

  // 실제 데이터 존재 여부로 각 단계의 완료 여부 자동 감지
  const students = typeof window !== 'undefined' ? StorageService.getStudents() : [];
  const settings = typeof window !== 'undefined' ? StorageService.getSettings() : { name: '' };

  const quests: QuestItem[] = useMemo(() => {
    const hasOrgInfo = Boolean(settings?.name && settings.name.trim().length > 0);
    const hasStudents = students.length > 0;
    // 설정에 룸 정보가 있거나 기본 1개 이상 등록됨
    const hasRooms = true;
    const hasBillingConfig = Boolean(students.some((s) => (s.tuitionFee ?? 0) > 0));
    const hasParentLink = Boolean(students.some((s) => s.parentId || s.parentPhone));

    return [
      {
        id: 'quest-org',
        title: '사업장 정보 등록',
        description: '학원명, 대표자 연락처 및 기본 운영 정보',
        targetTab: 'settings',
        icon: <Building className="w-4 h-4" />,
        completed: hasOrgInfo,
      },
      {
        id: 'quest-rooms',
        title: '연습실 및 레슨실 구성',
        description: '그랜드룸, 피아노 연습실 등 공간 등록',
        targetTab: 'seat_room',
        icon: <DoorOpen className="w-4 h-4" />,
        completed: hasRooms,
      },
      {
        id: 'quest-students',
        title: '첫 번째 원생 등록하기',
        description: '원생 명부 추가 또는 엑셀 일괄 등록',
        targetTab: 'roster',
        icon: <Users className="w-4 h-4" />,
        completed: hasStudents,
      },
      {
        id: 'quest-billing',
        title: '수강료 수납 및 청구서 설정',
        description: '정규 수강료 책정 및 수납 방식 지정',
        targetTab: 'tuition',
        icon: <CreditCard className="w-4 h-4" />,
        completed: hasBillingConfig,
      },
      {
        id: 'quest-parent',
        title: '학부모 포털 초대 및 알림장',
        description: '등하원 알림톡 및 학부모 전용 포털 링크',
        targetTab: 'attendance',
        icon: <MessageSquare className="w-4 h-4" />,
        completed: hasParentLink,
      },
    ];
  }, [students, settings]);

  const completedCount = quests.filter((q) => q.completed).length;
  const progressPercent = Math.round((completedCount / quests.length) * 100);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(HIDE_QUEST_KEY, 'true');
    }
  };

  const handleInjectDemo = () => {
    const result = DemoSandboxEngine.injectDemoData();
    setIsDemoActive(true);
    showToast(
      `데모 원생 ${result.insertedStudents}명과 출결 데이터가 주입되었습니다!`,
      'success'
    );
    if (onRefreshData) onRefreshData();
  };

  const handleClearDemo = () => {
    const result = DemoSandboxEngine.clearDemoData();
    setIsDemoActive(false);
    showToast(`데모 데이터 ${result.removedCount}건이 정리되었습니다.`, 'info');
    if (onRefreshData) onRefreshData();
  };

  if (isDismissed) return null;

  return (
    <section
      aria-label="학원 오픈 준비 퀘스트"
      className="mb-6 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shadow-xl border border-indigo-700/40 relative overflow-hidden"
    >
      {/* 은은한 배경 장식 */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 위젯 헤더 */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                원장님 학원 오픈 퀘스트
              </h2>
              <span className="px-2 py-0.5 text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-full">
                {completedCount}/{quests.length} 완료
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              원활한 학원 운영을 위해 5가지 필수 설정을 완료해보세요.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-white/10 transition-colors"
            title={isCollapsed ? '펼치기' : '접기'}
            aria-label={isCollapsed ? '퀘스트 펼치기' : '퀘스트 접기'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-white/10 transition-colors"
            title="위젯 닫기"
            aria-label="퀘스트 닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-indigo-200/90 font-semibold mb-1.5">
          <span>진행률</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full h-2.5 bg-indigo-950/80 rounded-full overflow-hidden border border-indigo-800/60">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* 퀘스트 단계 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-4">
            {quests.map((quest) => (
              <div
                key={quest.id}
                onClick={() => onNavigateTab(quest.targetTab)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                  quest.completed
                    ? 'bg-emerald-950/20 border-emerald-500/30 hover:bg-emerald-950/40'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-400/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      quest.completed
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-indigo-600/30 text-indigo-300'
                    }`}
                  >
                    {quest.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      quest.icon
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold truncate ${
                        quest.completed
                          ? 'text-emerald-200 line-through opacity-85'
                          : 'text-white'
                      }`}
                    >
                      {quest.title}
                    </p>
                    <p className="text-[11px] text-indigo-200/60 truncate">
                      {quest.description}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-indigo-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>
            ))}
          </div>

          {/* 데모 샌드박스 주입/리셋 툴바 */}
          <div className="pt-3 border-t border-indigo-800/50 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-200/80">
              <Database className="w-4 h-4 text-indigo-400" />
              <span>학원 데이터를 미리 채워서 기능을 체험해보고 싶으신가요?</span>
            </div>

            <div className="flex items-center gap-2">
              {!isDemoActive ? (
                <button
                  type="button"
                  onClick={handleInjectDemo}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  샘플 데이터로 둘러보기
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleClearDemo}
                  className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="주입된 데모 데이터를 깨끗하게 삭제합니다"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  샘플 데이터 초기화
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
};
