import { type FC } from 'react';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  Users,
} from 'lucide-react';
import {
  EmptyState,
  FilterBar,
  PageHeader,
  SearchField,
} from '@/shared/components';
import { AbsentReasonModal } from './AbsentReasonModal';
import { PianoAttendanceRow } from './PianoAttendanceRow';
import { usePianoAttendanceView } from './usePianoAttendanceView';
import { shiftDateIso, todayIsoLocal, type StatusFilter } from './pianoAttendanceHelpers';

type StatChip = {
  value: StatusFilter;
  label: string;
  count: number;
  activeClass: string;
};

/**
 * 피아노 출결 — 일정에 배정된 「오늘 예정」학생의 등원·지각·결석만 처리.
 * 하원 없음. 시간표 변경은 classIds만 바꾸고 DAY_ATTENDANCE 기록은 건드리지 않음.
 */
export const PianoAttendanceView: FC = () => {
  const {
    pinEnabled,
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
    goPinCheckIn,
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

  return (
    <div className="space-y-3 sm:space-y-4 pb-4">
      <PageHeader
        density="compact"
        icon={<CheckSquare className="w-6 h-6" />}
        title="출결"
        description="오늘 예정 학생이 실제로 왔는지 기록합니다."
        actions={
          pinEnabled ? (
            <button
              type="button"
              onClick={goPinCheckIn}
              className="inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Fingerprint className="w-4 h-4 text-indigo-600" />
              PIN 출석
            </button>
          ) : undefined
        }
      />

      {/* 요약 = 필터 (한 줄로 상태 확인·전환) */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {statChips.map((chip) => {
          const active = statusFilter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => setStatusFilter(chip.value)}
              className={`min-h-[56px] sm:min-h-[52px] rounded-xl border px-1 py-2 text-center transition-colors ${
                active
                  ? chip.activeClass
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span
                className={`block text-[10px] sm:text-[11px] font-bold ${
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

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <FilterBar className="border-0 shadow-none rounded-none border-b border-slate-100 gap-2">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftDateIso(d, -1))}
              className="p-2 min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 hover:bg-slate-50"
              aria-label="이전 날짜"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 sm:flex-none min-w-0 px-2.5 py-2 min-h-[44px] text-sm font-bold border border-slate-200 rounded-xl"
            />
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftDateIso(d, 1))}
              className="p-2 min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 hover:bg-slate-50"
              aria-label="다음 날짜"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {!isToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayIsoLocal())}
                className="px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold text-indigo-600 border border-indigo-100 bg-indigo-50 shrink-0"
              >
                오늘
              </button>
            )}
          </div>
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="이름 검색"
            className="w-full sm:flex-1 sm:max-w-xs"
          />
        </FilterBar>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Users className="w-10 h-10" />}
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
            className="border-0 shadow-none rounded-none"
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map(({ student, status, record, scheduleTime, scheduleDetail }) => (
              <PianoAttendanceRow
                key={student.id}
                student={student}
                status={status}
                pinCheckedIn={pinCheckInIds.has(student.id)}
                hasDayRecord={Boolean(record)}
                scheduleTime={scheduleTime || undefined}
                scheduleDetail={scheduleDetail || undefined}
                onOpenStudent={() => openStudent(student.id)}
                onSetStatus={(next) => handleSetStatus(student, next)}
              />
            ))}
          </ul>
        )}
      </div>

      <AbsentReasonModal
        isOpen={!!absentTarget}
        student={absentTarget}
        onClose={() => setAbsentTarget(null)}
        onConfirm={handleAbsentConfirm}
      />
    </div>
  );
};
