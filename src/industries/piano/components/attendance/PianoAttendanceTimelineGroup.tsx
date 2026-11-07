import type { FC } from 'react';
import { Check, CheckCircle2, Clock, Users } from 'lucide-react';
import type { AttendanceRecord, Student } from '@/types';
import { PianoAttendanceRow } from './PianoAttendanceRow';
import type { DayStatus, PianoTimelineGroup } from './pianoAttendanceHelpers';

export interface PianoAttendanceRowItem {
  student: Student;
  status: DayStatus;
  record?: AttendanceRecord;
  scheduleTime: string;
  scheduleDetail: string;
  scheduleSort: string;
  fromSchedule: boolean;
}

interface PianoAttendanceTimelineGroupProps {
  group: PianoTimelineGroup<PianoAttendanceRowItem>;
  pinCheckInIds: Set<string>;
  onOpenStudent: (studentId: string) => void;
  onSetStatus: (student: Student, status: Exclude<DayStatus, 'unchecked'>) => void;
  onBatchCheckIn?: (students: Student[]) => void;
}

export const PianoAttendanceTimelineGroup: FC<PianoAttendanceTimelineGroupProps> = ({
  group,
  pinCheckInIds,
  onOpenStudent,
  onSetStatus,
  onBatchCheckIn,
}) => {
  const {
    timeLabel,
    isUnscheduled,
    isCurrentSlot,
    items,
    totalCount,
    uncheckedCount,
    isAllCompleted,
  } = group;

  const uncheckedStudents = items
    .filter((it) => it.status === 'unchecked')
    .map((it) => it.student);

  return (
    <section
      aria-label={`${timeLabel} 시간대 출결`}
      className={`rounded-2xl border transition-all overflow-hidden ${
        isCurrentSlot
          ? 'border-indigo-300 ring-2 ring-indigo-500/15 bg-white shadow-sm'
          : 'border-slate-200/90 bg-white shadow-xs'
      }`}
    >
      {/* 시간대 헤더 */}
      <div
        className={`px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 ${
          isCurrentSlot
            ? 'bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/40 border-indigo-100'
            : isAllCompleted
              ? 'bg-slate-50/60 border-slate-100'
              : 'bg-slate-50/90 border-slate-150'
        }`}
      >
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isCurrentSlot
                ? 'bg-indigo-600 text-white shadow-xs'
                : isAllCompleted
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-700'
            }`}
          >
            {isUnscheduled ? (
              <Users className="w-4 h-4" />
            ) : isAllCompleted ? (
              <Check className="w-4 h-4 stroke-[3]" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {timeLabel}
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {totalCount}명
            </span>
          </div>

          {/* 현재 시간대 펄스 배지 */}
          {isCurrentSlot && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-extrabold bg-indigo-600 text-white shadow-xs animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              현재 수업
            </span>
          )}

          {/* 상태 요약 배지 */}
          {isAllCompleted ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              전원 출석 완료
            </span>
          ) : uncheckedCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100/80 text-amber-900">
              미등원 {uncheckedCount}명
            </span>
          ) : null}
        </div>

        {/* 우측 편의 액션: 미등원생이 2명 이상일 때 일괄 출석 */}
        {uncheckedStudents.length >= 2 && onBatchCheckIn && (
          <div className="self-end sm:self-auto">
            <button
              type="button"
              onClick={() => onBatchCheckIn(uncheckedStudents)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              미등원 {uncheckedStudents.length}명 일괄 등원
            </button>
          </div>
        )}
      </div>

      {/* 시간대 학생 목록 */}
      <ul className="divide-y divide-slate-100">
        {items.map(({ student, status, record, scheduleTime, scheduleDetail }) => (
          <PianoAttendanceRow
            key={student.id}
            student={student}
            status={status}
            pinCheckedIn={pinCheckInIds.has(student.id)}
            hasDayRecord={Boolean(record)}
            scheduleTime={scheduleTime || undefined}
            scheduleDetail={scheduleDetail || undefined}
            inTimelineGroup={!isUnscheduled}
            onOpenStudent={() => onOpenStudent(student.id)}
            onSetStatus={(next) => onSetStatus(student, next)}
          />
        ))}
      </ul>
    </section>
  );
};
