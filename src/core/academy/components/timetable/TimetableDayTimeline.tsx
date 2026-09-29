import type { FC, ReactNode } from 'react';
import { ChevronRight, Clock, Users } from 'lucide-react';
import { EmptyState } from '@/shared/components';
import type { ClassItem } from '@/types';

export interface TimetableDayClassRow {
  classItem: ClassItem;
  enrolledCount: number;
  /** 오늘 목록에서 진행 중 / 다음 수업 강조 */
  highlight?: 'now' | 'next' | null;
}

interface TimetableDayTimelineProps {
  dayLabel: string;
  rows: TimetableDayClassRow[];
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: ReactNode;
  onSelect: (cls: ClassItem) => void;
}

/** 요일별 수업을 시간순 타임라인으로 표시 (모바일·일간 뷰) */
export const TimetableDayTimeline: FC<TimetableDayTimelineProps> = ({
  dayLabel,
  rows,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onSelect,
}) => {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="w-10 h-10" />}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <ol className="relative space-y-0 border-l-2 border-indigo-100 ml-3 pl-0" aria-label={`${dayLabel} 수업 일정`}>
      {rows.map(({ classItem: cls, enrolledCount, highlight }) => {
        const isFull = enrolledCount >= cls.capacity;
        const highlightClass =
          highlight === 'now'
            ? 'border-indigo-400 bg-indigo-50/80 ring-1 ring-indigo-200'
            : highlight === 'next'
              ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-slate-200/90 bg-white hover:border-indigo-300';

        return (
          <li key={cls.id} className="relative pl-5 pb-3 last:pb-0">
            <span
              className={`absolute -left-[9px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                highlight === 'now'
                  ? 'bg-indigo-600'
                  : highlight === 'next'
                    ? 'bg-emerald-500'
                    : 'bg-indigo-300'
              }`}
              aria-hidden
            />
            <button
              type="button"
              onClick={() => onSelect(cls)}
              className={`w-full text-left rounded-2xl p-3.5 border shadow-2xs transition-all min-h-[72px] cursor-pointer ${highlightClass}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="font-mono text-sm font-bold text-indigo-700 tabular-nums">
                      {cls.startTime}
                    </span>
                    <span className="text-xs text-slate-400">~ {cls.endTime}</span>
                    {highlight === 'now' && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                        진행 중
                      </span>
                    )}
                    {highlight === 'next' && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                        다음
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                      {cls.room}
                    </span>
                  </div>
                  <p className="font-bold text-sm text-slate-900 truncate">{cls.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cls.teacherName}
                    <span className="mx-1 text-slate-300">·</span>
                    <Users className="w-3 h-3 inline -mt-0.5 text-slate-400" />{' '}
                    {enrolledCount}/{cls.capacity}명
                    {isFull && <span className="text-rose-600 font-bold ml-1">마감</span>}
                  </p>
                </div>
                <span
                  className="w-3 h-3 rounded-full shrink-0 mt-1.5"
                  style={{ backgroundColor: cls.color || '#4f46e5' }}
                  aria-hidden
                />
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
};
