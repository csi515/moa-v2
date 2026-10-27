import { useCallback, useMemo, useState, type FC } from 'react';
import { UserCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { Student } from '@/types';
import {
  mapExpectedWithDayStatus,
  type PianoExpectedDay,
} from '../../attendance/usePianoExpectedDay';
import {
  STATUS_META,
  countDayStatuses,
  markDayPresent,
  type DayStatus,
} from '../../attendance/pianoAttendanceHelpers';
import { DirectorSectionEmpty } from './DirectorSectionEmpty';

interface DirectorTodayAttendanceSectionProps {
  today: string;
  expectedDay: PianoExpectedDay;
  onOpenAttendance?: () => void;
}

function homeAttendanceRank(st: DayStatus): number {
  if (st === 'unchecked') return 0;
  if (st === 'late') return 1;
  if (st === 'absent') return 2;
  return 3;
}

/** 원장 홈 — 오늘 출결 요약 + 미등원 빠른 처리 */
export const DirectorTodayAttendanceSection: FC<DirectorTodayAttendanceSectionProps> = ({
  today,
  expectedDay,
  onOpenAttendance,
}) => {
  const { showToast, triggerRefresh, currentUser } = useApp();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { expected, dayRecordMap, pinCheckInIds } = expectedDay;

  const rows = useMemo(() => {
    return mapExpectedWithDayStatus(expected, dayRecordMap, pinCheckInIds).sort((a, b) => {
      const d = homeAttendanceRank(a.status) - homeAttendanceRank(b.status);
      if (d !== 0) return d;
      return a.student.name.localeCompare(b.student.name, 'ko');
    });
  }, [expected, dayRecordMap, pinCheckInIds]);

  const counts = useMemo(() => countDayStatuses(rows.map((r) => r.status)), [rows]);

  const uncheckedRows = useMemo(
    () => rows.filter((r) => r.status === 'unchecked').slice(0, 6),
    [rows]
  );

  const markPresent = useCallback(
    async (student: Student) => {
      setBusyId(student.id);
      try {
        const result = await markDayPresent({
          student,
          date: today,
          createdBy: currentUser.name,
          existing: dayRecordMap.get(student.id) || null,
        });
        if (result.ok === false) {
          showToast(result.warning, 'warning');
          return;
        }
        showToast(`${student.name} 등원 처리되었습니다.`, 'success');
        triggerRefresh();
      } finally {
        setBusyId(null);
      }
    },
    [dayRecordMap, today, currentUser.name, showToast, triggerRefresh]
  );

  const metrics: { key: string; label: string; value: number; tone: string }[] = [
    {
      key: 'expected',
      label: '예정',
      value: counts.total,
      tone: 'bg-slate-100 text-slate-700',
    },
    {
      key: 'present',
      label: '완료',
      value: counts.present,
      tone: STATUS_META.present.tone,
    },
    {
      key: 'unchecked',
      label: '미등원',
      value: counts.unchecked,
      tone: 'bg-amber-50 text-amber-800',
    },
    {
      key: 'late',
      label: '지각',
      value: counts.late,
      tone: STATUS_META.late.tone,
    },
  ];

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            오늘 출결
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {counts.total === 0
              ? '오늘 수업 배정 학생 없음'
              : counts.unchecked > 0
                ? `미등원 ${counts.unchecked}명 · 예정 ${counts.total}명`
                : counts.absent > 0
                  ? `결석 ${counts.absent}명 · 예정 ${counts.total}명`
                  : `출결 완료 · 예정 ${counts.total}명`}
          </p>
        </div>
        {onOpenAttendance && (
          <button
            type="button"
            onClick={onOpenAttendance}
            className="text-xs font-bold text-indigo-600 min-h-[44px] px-1 shrink-0"
          >
            출결 전체
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {metrics.map((m) => (
          <div
            key={m.key}
            className={`rounded-xl px-1.5 py-2.5 sm:px-2 text-center ${m.tone}`}
          >
            <p className="text-base sm:text-lg font-black tabular-nums leading-none">{m.value}</p>
            <p className="text-[10px] sm:text-[11px] font-bold mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {counts.total === 0 ? (
        <DirectorSectionEmpty>
          오늘 일정에 배정된 학생이 없습니다. 시간표에서 배치하세요.
        </DirectorSectionEmpty>
      ) : uncheckedRows.length === 0 ? (
        <p className="text-xs text-emerald-700 font-semibold text-center py-3 bg-emerald-50/60 rounded-xl">
          미등원 학생이 없습니다.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {uncheckedRows.map(({ student, status, scheduleLabel }) => (
            <li
              key={student.id}
              className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border border-slate-100 bg-slate-50/60 min-h-[52px]"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{student.name}</p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {scheduleLabel || STATUS_META[status].label}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === student.id}
                onClick={() => markPresent(student)}
                className="shrink-0 min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
              >
                등원
              </button>
            </li>
          ))}
          {counts.unchecked > uncheckedRows.length && onOpenAttendance && (
            <li>
              <button
                type="button"
                onClick={onOpenAttendance}
                className="w-full text-center text-xs font-bold text-indigo-600 py-2 min-h-[44px]"
              >
                미등원 {counts.unchecked - uncheckedRows.length}명 더보기
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
};
