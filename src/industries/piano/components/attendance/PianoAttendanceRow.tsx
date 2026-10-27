import type { FC } from 'react';
import { CheckSquare, Clock, XCircle } from 'lucide-react';
import type { Student } from '@/types';
import { STATUS_META, type DayStatus } from './pianoAttendanceHelpers';

interface PianoAttendanceRowProps {
  student: Student;
  status: DayStatus;
  pinCheckedIn: boolean;
  hasDayRecord: boolean;
  /** 예정 시각 (예: 14:00) */
  scheduleTime?: string;
  /** 반·일정 보조 표시 */
  scheduleDetail?: string;
  onOpenStudent: () => void;
  onSetStatus: (status: Exclude<DayStatus, 'unchecked'>) => void;
}

const ACTION_BUTTONS = [
  ['present', CheckSquare],
  ['late', Clock],
  ['absent', XCircle],
] as const;

export const PianoAttendanceRow: FC<PianoAttendanceRowProps> = ({
  student,
  status,
  pinCheckedIn,
  hasDayRecord,
  scheduleTime,
  scheduleDetail,
  onOpenStudent,
  onSetStatus,
}) => {
  const statusLabel =
    !hasDayRecord && pinCheckedIn ? 'PIN 체크인' : STATUS_META[status].label;
  const isPending = status === 'unchecked';

  return (
    <li
      className={`flex flex-col gap-3 px-3 sm:px-4 py-3.5 sm:py-3 ${
        isPending ? 'bg-amber-50/40' : 'bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpenStudent}
              className="font-bold text-slate-900 text-base sm:text-sm hover:text-indigo-600 text-left min-h-[44px] sm:min-h-0 inline-flex items-center"
            >
              {student.name}
            </button>
            <span
              className={`px-2 py-1 rounded-lg text-[11px] font-bold ${STATUS_META[status].tone}`}
            >
              {statusLabel}
            </span>
            {pinCheckedIn && hasDayRecord && (
              <span className="text-[10px] font-semibold text-indigo-500">PIN</span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2 min-w-0">
            {scheduleTime ? (
              <p className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-800 tabular-nums">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden />
                {scheduleTime}
              </p>
            ) : (
              <p className="text-xs font-medium text-slate-400">일정 외(당일 기록)</p>
            )}
            {scheduleDetail ? (
              <p className="text-xs text-slate-500 truncate">{scheduleDetail}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:flex-wrap sm:w-auto">
        {ACTION_BUTTONS.map(([key, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSetStatus(key)}
            className={`inline-flex flex-col sm:flex-row items-center justify-center gap-1 px-2 sm:px-3 py-2.5 sm:py-2 min-h-[52px] sm:min-h-[44px] rounded-xl border text-xs sm:text-[11px] font-bold transition-colors ${
              status === key ? STATUS_META[key].active : STATUS_META[key].button
            }`}
          >
            <Icon className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
            {STATUS_META[key].label}
          </button>
        ))}
      </div>
    </li>
  );
};
