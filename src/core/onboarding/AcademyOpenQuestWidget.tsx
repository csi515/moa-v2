import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Building,
  DoorOpen,
  Users,
  CreditCard,
  MessageSquare,
  CheckSquare,
} from 'lucide-react';
import { StorageService } from '@/services/storage';

interface AcademyOpenQuestWidgetProps {
  onNavigateTab: (tab: string) => void;
  onRefreshData?: () => void; // 하위 호환용(미사용)
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
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDismissed(localStorage.getItem(HIDE_QUEST_KEY) === 'true');
    }
  }, []);

  // 실제 데이터 존재 여부로 각 단계의 완료 여부 자동 감지
  const students = typeof window !== 'undefined' ? StorageService.getStudents() : [];
  const settings = typeof window !== 'undefined' ? StorageService.getSettings() : { name: '' };

  const quests: QuestItem[] = useMemo(() => {
    const hasOrgInfo = Boolean(settings?.name && settings.name.trim().length > 0);
    const hasStudents = students.length > 0;
    const hasRooms = true;
    const hasBillingConfig = Boolean(students.some((s) => (s.tuitionFee ?? 0) > 0));
    const hasParentLink = Boolean(students.some((s) => s.parentId || s.parentPhone));

    return [
      {
        id: 'quest-org',
        title: '사업장 정보 등록',
        description: '상호명, 대표자 연락처 및 기본 운영 정보',
        targetTab: 'settings',
        icon: <Building className="w-3.5 h-3.5" strokeWidth={1.5} />,
        completed: hasOrgInfo,
      },
      {
        id: 'quest-rooms',
        title: '공간 및 시설 구성',
        description: '연습실, 레슨실, 스튜디오 등 공간 등록',
        targetTab: 'seat_room',
        icon: <DoorOpen className="w-3.5 h-3.5" strokeWidth={1.5} />,
        completed: hasRooms,
      },
      {
        id: 'quest-students',
        title: '첫 번째 고객/원생 등록',
        description: '고객 명부 등록 또는 엑셀 일괄 추가',
        targetTab: 'roster',
        icon: <Users className="w-3.5 h-3.5" strokeWidth={1.5} />,
        completed: hasStudents,
      },
      {
        id: 'quest-billing',
        title: '이용료/수강료 결제 설정',
        description: '정규 요금 책정 및 수납 방식 지정',
        targetTab: 'tuition',
        icon: <CreditCard className="w-3.5 h-3.5" strokeWidth={1.5} />,
        completed: hasBillingConfig,
      },
      {
        id: 'quest-parent',
        title: '고객/학부모 소통 채널 연결',
        description: '출결 알림톡 및 전용 포털 링크',
        targetTab: 'attendance',
        icon: <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />,
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

  if (isDismissed) return null;

  return (
    <section
      aria-label="초기 운영 설정 체크리스트"
      className="mb-4 sm:mb-5 rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs transition-colors"
    >
      {/* 위젯 헤더 */}
      <div className="flex items-start justify-between gap-4 mb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 shrink-0">
            <CheckSquare className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-900">
                초기 운영 설정
              </h2>
              <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded-md">
                {completedCount}/{quests.length} 완료
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              기본 정보를 입력하면 바로 운영 관리를 시작할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={isCollapsed ? '펼치기' : '접기'}
            aria-label={isCollapsed ? '설정 펼치기' : '설정 접기'}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
            )}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="체크리스트 닫기"
            aria-label="체크리스트 닫기"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* 프로그레스 바 (단정한 슬레이트/블루) */}
      <div className="mb-3.5">
        <div className="flex justify-between text-xs text-slate-500 font-medium mb-1">
          <span>설정 진행률</span>
          <span className="font-semibold text-slate-800">{progressPercent}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div
            className="h-full bg-slate-800 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* 체크리스트 단계 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
            {quests.map((quest) => (
              <div
                key={quest.id}
                onClick={() => onNavigateTab(quest.targetTab)}
                className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-center justify-between group ${
                  quest.completed
                    ? 'bg-slate-50/50 border-slate-200/70 text-slate-400'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                      quest.completed
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {quest.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />
                    ) : (
                      quest.icon
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold truncate ${
                        quest.completed ? 'text-slate-400 line-through' : 'text-slate-900'
                      }`}
                    >
                      {quest.title}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {quest.description}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform shrink-0" strokeWidth={1.5} />
              </div>
            ))}
          </div>

        </>
      )}
    </section>
  );
};
