import type { FC } from 'react';
import { CheckSquare, Clock, CreditCard, Smartphone, XCircle } from 'lucide-react';
import type { Student } from '@/types';
import { STATUS_META, type DayStatus } from './pianoAttendanceHelpers';
import type { AttendanceBillingBadgeInfo } from './pianoAttendanceBillingHelpers';

interface PianoAttendanceRowProps {
  student: Student;
  status: DayStatus;
  pinCheckedIn: boolean;
  hasDayRecord: boolean;
  /** 수강료 결제일/미납 뱃지 */
  billingBadge?: AttendanceBillingBadgeInfo | null;
  /** 예정 시각 (예: 14:00) */
  scheduleTime?: string;
  /** 반·일정 보조 표시 */
  scheduleDetail?: string;
  /** 그룹 헤더에 이미 시간이 크게 나오는지 여부 */
  inTimelineGroup?: boolean;
  onOpenStudent: () => void;
  onOpenPayment?: (student: Student) => void;
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
  billingBadge,
  scheduleTime,
  scheduleDetail,
  inTimelineGroup = false,
  onOpenStudent,
  onOpenPayment,
  onSetStatus,
}) => {
  const statusLabel = STATUS_META[status].label;
  const isPending = status === 'unchecked';

  return (
    <li
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 transition-colors ${
        isPending
          ? 'bg-amber-50/25 border-l-4 border-amber-400'
          : 'bg-white border-l-4 border-transparent hover:bg-slate-50/60'
      }`}
    >
      {/* 학생 정보 영역 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenStudent}
            className="font-bold text-slate-900 text-base sm:text-sm hover:text-indigo-600 text-left min-h-[40px] sm:min-h-0 inline-flex items-center transition-colors"
          >
            {student.name}
          </button>

          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${STATUS_META[status].tone}`}
          >
            {statusLabel}
          </span>

          {pinCheckedIn && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100"
              title="키패드 PIN으로 체크인됨"
            >
              <Smartphone className="w-3 h-3 text-indigo-500" />
              PIN
            </span>
          )}

          {billingBadge && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPayment?.(student);
              }}
              title={`${billingBadge.tooltip}\n(클릭하여 즉시 수강료 수납)`}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${billingBadge.toneClass}`}
            >
              <CreditCard className="w-3 h-3 shrink-0" />
              <span>{billingBadge.label}</span>
            </button>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2 min-w-0 flex-wrap">
          {!inTimelineGroup && (
            scheduleTime ? (
              <p className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 tabular-nums">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" aria-hidden />
                {scheduleTime}
              </p>
            ) : (
              <p className="text-xs font-medium text-slate-400">일정 외</p>
            )
          )}

          {scheduleDetail ? (
            <p className="text-xs text-slate-500 truncate">{scheduleDetail}</p>
          ) : (
            <p className="text-xs text-slate-400">개별 배정</p>
          )}

          {student.phone && (
            <span className="text-[11px] text-slate-400 tabular-nums hidden sm:inline">
              · {student.phone.slice(-4)}
            </span>
          )}
        </div>
      </div>

      {/* 출결 상태 액션 버튼 (3버튼) */}
      <div className="grid grid-cols-3 gap-1.5 w-full sm:flex sm:flex-wrap sm:w-auto shrink-0">
        {ACTION_BUTTONS.map(([key, Icon]) => {
          const isActive = status === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSetStatus(key)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-bold transition-all active:scale-[0.98] ${
                isActive
                  ? STATUS_META[key].active
                  : STATUS_META[key].button
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {STATUS_META[key].label}
            </button>
          );
        })}
      </div>
    </li>
  );
};
