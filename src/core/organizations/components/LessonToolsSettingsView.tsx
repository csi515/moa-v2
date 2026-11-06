import { type FC } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import type { NavTab } from '@/shared/navigation/navigationTypes';
import {
  DoorOpen,
  Music,
  ClipboardList,
  Users,
  Clock,
  BookOpen,
  GraduationCap,
  FolderOpen,
  Sparkles,
  Trophy,
  Medal,
  BarChart3,
  BellRing,
  Bus,
  Network,
  Package,
  ChevronRight,
  LucideIcon,
  Layers,
} from 'lucide-react';

interface ToolTileItem {
  tab: NavTab;
  label: string;
  description: string;
  icon: LucideIcon;
  badgeTone?: string;
  iconColor?: string;
  iconBg?: string;
}

const LESSON_MANAGEMENT_TOOLS: ToolTileItem[] = [
  {
    tab: 'practice-rooms',
    label: '연습실 예약',
    description: '원생 피아노 연습실 예약 현황 및 공실 확인',
    icon: DoorOpen,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
  },
  {
    tab: 'practice',
    label: '연습 기록',
    description: '원생별 자율 연습 일지 및 주간 누적 시간',
    icon: Music,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50',
  },
  {
    tab: 'assignments',
    label: '주간 과제',
    description: '이번 주 연습할 곡 배정 및 레슨 피드백',
    icon: ClipboardList,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
  },
  {
    tab: 'classes',
    label: '반 관리',
    description: '레슨 정원 및 요일·시간대별 그룹 반 편성',
    icon: Users,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
  },
  {
    tab: 'bookings',
    label: '상담 가능시간',
    description: '학부모 및 신규 원생 방문 상담 슬롯 설정',
    icon: Clock,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
  },
];

const TEXTBOOK_CURRICULUM_TOOLS: ToolTileItem[] = [
  {
    tab: 'textbooks',
    label: '교재 관리',
    description: '사용 중인 악보·피아노 교재 등록 및 판매가 관리',
    icon: BookOpen,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
  },
  {
    tab: 'curriculum',
    label: '커리큘럼·진도',
    description: '바이엘, 체르니, 작품집 등 단계별 표준 진도표',
    icon: GraduationCap,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
  },
  {
    tab: 'resources',
    label: '자료 카탈로그',
    description: '악보, 연습 음원, 동영상 학습 자료 보관함',
    icon: FolderOpen,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
  },
];

const ACHIEVEMENT_MOTIVATION_TOOLS: ToolTileItem[] = [
  {
    tab: 'song-stamps',
    label: '완곡 스탬프',
    description: '완성한 곡마다 스탬프와 칭찬 뱃지 지급',
    icon: Sparkles,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
  },
  {
    tab: 'recitals',
    label: '연주회·콩쿠르',
    description: '정기 연주회 일정 및 콩쿠르 참가 등록',
    icon: Trophy,
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-50',
  },
  {
    tab: 'achievements',
    label: '시험·등급',
    description: '급수 시험 결과 및 레벨업 인증 관리',
    icon: Medal,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
  },
  {
    tab: 'reports',
    label: '학습 리포트',
    description: '월간 학습 태도와 연주 성장 분석표',
    icon: BarChart3,
    iconColor: 'text-sky-600',
    iconBg: 'bg-sky-50',
  },
];

const EXTRA_KNOWN_TOOLS: Record<string, Omit<ToolTileItem, 'tab'>> = {
  retention: {
    label: '리텐션·만료 알림',
    description: '수강 만료 예정 원생 자동 알림 및 재등록 관리',
    icon: BellRing,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-50',
  },
  shuttle: {
    label: '통학·셔틀',
    description: '차량 운행 노선 및 승하차 시간표 안내',
    icon: Bus,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
  },
  'family-tree': {
    label: '추천·패밀리',
    description: '형제·자매 원생 및 지인 추천 네트워크',
    icon: Network,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50',
  },
  supplies: {
    label: '소모품 재고',
    description: '학원 운영 소모품 및 부교재 재고 관리',
    icon: Package,
    iconColor: 'text-teal-600',
    iconBg: 'bg-teal-50',
  },
};

export const LessonToolsSettingsView: FC<{
  extras?: { tab: NavTab; label: string }[];
}> = ({ extras = [] }) => {
  const { setActiveTab } = useApp();

  // 이미 3대 그룹에 포함된 탭 목록
  const coreTabSet = new Set<string>([
    ...LESSON_MANAGEMENT_TOOLS.map((t) => t.tab),
    ...TEXTBOOK_CURRICULUM_TOOLS.map((t) => t.tab),
    ...ACHIEVEMENT_MOTIVATION_TOOLS.map((t) => t.tab),
  ]);

  // extras 중에서 3대 그룹에 없는 추가 활성 도구 추출
  const additionalExtras = extras.filter((item) => !coreTabSet.has(item.tab));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h3 className="text-sm font-bold text-slate-800">수업 및 레슨 운영 도구</h3>
        <p className="text-xs text-slate-500 mt-1">
          레슨 일정, 교재, 연습실, 성취 스탬프 등 학원 수업 운영에 필요한 핵심 도구를 모아두었습니다. 원하는 카드를 클릭하면 해당 화면으로 즉시 이동합니다.
        </p>
      </div>

      {/* 카드 1: 레슨 & 연습실 관리 */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">레슨 & 연습실 관리</h4>
            <p className="text-[11px] text-slate-500">피아노 연습실 공실 관리, 자율 연습 일지, 주간 과제 및 반 일정</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LESSON_MANAGEMENT_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.tab}
                type="button"
                onClick={() => setActiveTab(tool.tab)}
                className="group flex items-start gap-3.5 p-3.5 text-left rounded-xl border border-slate-200/70 hover:border-indigo-300 hover:bg-indigo-50/30 bg-white transition-all min-h-[64px]"
              >
                <div className={`w-9 h-9 rounded-xl ${tool.iconBg} ${tool.iconColor} flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {tool.label}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    {tool.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      </section>

      {/* 카드 2: 교재 & 진도 과정 */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">교재 & 진도 과정</h4>
            <p className="text-[11px] text-slate-500">피아노 악보·교재 카탈로그, 단계별 커리큘럼 및 교육 자료실</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TEXTBOOK_CURRICULUM_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.tab}
                type="button"
                onClick={() => setActiveTab(tool.tab)}
                className="group flex items-start gap-3.5 p-3.5 text-left rounded-xl border border-slate-200/70 hover:border-emerald-300 hover:bg-emerald-50/30 bg-white transition-all min-h-[64px]"
              >
                <div className={`w-9 h-9 rounded-xl ${tool.iconBg} ${tool.iconColor} flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    {tool.label}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    {tool.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      </section>

      {/* 카드 3: 성취 & 동기부여 */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">성취 & 동기부여</h4>
            <p className="text-[11px] text-slate-500">곡 완성 스탬프 보상, 콩쿠르·정기 연주회 참가 및 월간 리포트</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACHIEVEMENT_MOTIVATION_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.tab}
                type="button"
                onClick={() => setActiveTab(tool.tab)}
                className="group flex items-start gap-3.5 p-3.5 text-left rounded-xl border border-slate-200/70 hover:border-amber-300 hover:bg-amber-50/30 bg-white transition-all min-h-[64px]"
              >
                <div className={`w-9 h-9 rounded-xl ${tool.iconBg} ${tool.iconColor} flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                    {tool.label}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    {tool.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      </section>

      {/* 활성화된 기타 부가 기능이 있는 경우 */}
      {additionalExtras.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">부가 운영 도구</h4>
              <p className="text-[11px] text-slate-500">학원에서 활성화된 추가 확장 기능 바로가기</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {additionalExtras.map((item) => {
              const known = EXTRA_KNOWN_TOOLS[item.tab];
              const Icon = known?.icon || Layers;
              const iconColor = known?.iconColor || 'text-purple-600';
              const iconBg = known?.iconBg || 'bg-purple-50';
              const label = known?.label || item.label;
              const description = known?.description || '추가 운영 편의 기능';

              return (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => setActiveTab(item.tab)}
                  className="group flex items-start gap-3.5 p-3.5 text-left rounded-xl border border-slate-200/70 hover:border-purple-300 hover:bg-purple-50/30 bg-white transition-all min-h-[64px]"
                >
                  <div className={`w-9 h-9 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                      {label}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                      {description}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
