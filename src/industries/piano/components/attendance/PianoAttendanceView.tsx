import { type FC, useMemo } from 'react';
import {
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  EmptyState,
  FilterBar,
  PageHeader,
  SearchField,
} from '@/shared/components';
import { AbsentReasonModal } from './AbsentReasonModal';
import { PianoAttendanceTimelineGroup } from './PianoAttendanceTimelineGroup';
import { usePianoAttendanceView } from './usePianoAttendanceView';
import {
  groupAttendanceRowsByTime,
  shiftDateIso,
  todayIsoLocal,
  type StatusFilter,
} from './pianoAttendanceHelpers';
import type { Student } from '@/types';

type StatChip = {
  value: StatusFilter;
  label: string;
  count: number;
  activeClass: string;
};

/**
 * 피아노 출결 — 시간대별(14:00, 15:00 등) 타임라인 그룹화 및 당일 등원·지각·결석 처리
 */
export const PianoAttendanceView: FC = () => {
  const { setActiveTab } = useApp();
  const {
    selectedDate,
    setSelectedDate,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    absentTarget,
    setAbsentTarget,
    pinCheckInIds,
    expectedCount,
    rosterCount,
    rows,
    stats,
    isToday,
    handleSetStatus,
    handleAbsentConfirm,
    openStudent,
  } = usePianoAttendanceView();

  const statChips: StatChip[] = [
    {
      value: 'ALL',
      label: isToday ? '오늘 예정' : '예정',
      count: stats.expected,
      activeClass: 'bg-indigo-600 text-white border-indigo-600',
    },
    {
      value: 'unchecked',
      label: '미등원',
      count: stats.unchecked,
      activeClass: 'bg-slate-700 text-white border-slate-700',
    },
    {
      value: 'present',
      label: '등원',
      count: stats.present,
      activeClass: 'bg-emerald-600 text-white border-emerald-600',
    },
    {
      value: 'late',
      label: '지각',
      count: stats.late,
      activeClass: 'bg-amber-500 text-white border-amber-500',
    },
    {
      value: 'absent',
      label: '결석',
      count: stats.absent,
      activeClass: 'bg-rose-600 text-white border-rose-600',
    },
  ];

  // 시간대별 타임라인 그룹화
  const timelineGroups = useMemo(() => {
    return groupAttendanceRowsByTime(rows, { isToday });
  }, [rows, isToday]);

  // 시간대 미등원 학생 일괄 등원 처리
  const handleBatchCheckIn = async (students: Student[]) => {
    for (const st of students) {
      await handleSetStatus(st, 'present');
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-6">
      <PageHeader
        density="compact"
        icon={<CheckSquare className="w-6 h-6 text-indigo-600" />}
        title="출결"
      />

      {/* 요약 = 필터 (모바일 스와이프 칩 / 태블릿 이상 5열 그리드) */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar sm:grid sm:grid-cols-5 pb-0.5">
        {statChips.map((chip) => {
          const active = statusFilter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => setStatusFilter(chip.value)}
              className={`min-w-[68px] sm:min-w-0 flex-1 min-h-[52px] rounded-xl border px-2 sm:px-1 py-1.5 sm:py-2 text-center transition-colors shrink-0 ${
                active
                  ? chip.activeClass
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span
                className={`block text-[11px] font-bold whitespace-nowrap ${
                  active ? 'text-white/90' : 'text-slate-500'
                }`}
              >
                {chip.label}
              </span>
              <span className="block text-base sm:text-lg font-black tabular-nums mt-0.5">
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 날짜 네비게이션 및 검색 바 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <FilterBar className="border-0 shadow-none rounded-none flex-col sm:flex-row gap-2 sm:gap-3 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftDateIso(d, -1))}
              className="p-2 min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center shrink-0 transition-colors"
              aria-label="이전 날짜"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 sm:flex-none min-w-0 px-3 py-2 min-h-[44px] text-sm font-bold border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftDateIso(d, 1))}
              className="p-2 min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center shrink-0 transition-colors"
              aria-label="다음 날짜"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
            {!isToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayIsoLocal())}
                className="px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold text-indigo-600 border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 shrink-0 transition-colors"
              >
                오늘
              </button>
            )}
          </div>
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="학생 이름 검색"
            className="w-full sm:flex-1 sm:max-w-xs"
          />
        </FilterBar>
      </div>

      {/* 학생 목록 영역 — 시간대별 타임라인 그룹 */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <EmptyState
            icon={<Users className="w-10 h-10 text-slate-400" />}
            title={
              expectedCount === 0 && rosterCount === 0
                ? '이 날 예정된 학생이 없습니다'
                : '조건에 맞는 학생이 없습니다'
            }
            description={
              expectedCount === 0 && rosterCount === 0
                ? '일정(시간표)에서 학생을 배치하면 출결 목록에 나타납니다.'
                : statusFilter !== 'ALL'
                  ? '다른 상태 칩을 눌러 보세요.'
                  : '검색어를 바꿔 보세요.'
            }
            action={
              expectedCount === 0 && rosterCount === 0
                ? {
                    label: '시간표로 이동',
                    onClick: () => setActiveTab('timetable'),
                    icon: <Calendar className="w-4 h-4" />,
                  }
                : undefined
            }
            className="border-0 shadow-none rounded-none py-12"
          />
        </div>
      ) : (
        <div className="space-y-3.5">
          {timelineGroups.map((group) => (
            <PianoAttendanceTimelineGroup
              key={group.timeKey}
              group={group}
              pinCheckInIds={pinCheckInIds}
              onOpenStudent={openStudent}
              onSetStatus={handleSetStatus}
              onBatchCheckIn={handleBatchCheckIn}
            />
          ))}
        </div>
      )}

      {/* 결석 사유 모달 */}
      <AbsentReasonModal
        isOpen={!!absentTarget}
        student={absentTarget}
        onClose={() => setAbsentTarget(null)}
        onConfirm={handleAbsentConfirm}
      />
    </div>
  );
};
