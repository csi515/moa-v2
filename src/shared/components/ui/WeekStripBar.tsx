import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import {
  buildWeekStripDays,
  isSameLocalDay,
  shiftWeek,
  toDateKey,
} from './weekStripLogic';

export type WeekStripBarProps = {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  className?: string;
  showWeekNav?: boolean;
};

/**
 * 모바일 엄지 영역용 가로 7일 날짜 선택 바. 도메인 비종속.
 */
export function WeekStripBar({
  selectedDate,
  onSelect,
  className = '',
  showWeekNav = true,
}: WeekStripBarProps) {
  const weekDays = useMemo(() => buildWeekStripDays(selectedDate), [selectedDate]);
  const today = useMemo(() => new Date(), []);

  const rangeLabel = `${weekDays[0].date.getMonth() + 1}월 ${weekDays[0].dayOfMonth}일 ~ ${
    weekDays[6].date.getMonth() + 1
  }월 ${weekDays[6].dayOfMonth}일`;

  return (
    <div
      className={`w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ${className}`}
    >
      {showWeekNav ? (
        <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
          <span className="text-xs font-extrabold text-slate-800">{rangeLabel}</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="이전 주"
              onClick={() => onSelect(shiftWeek(selectedDate, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onSelect(new Date())}
            >
              오늘
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="다음 주"
              onClick={() => onSelect(shiftWeek(selectedDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekDays.map((day) => {
          const selected = isSameLocalDay(day.date, selectedDate);
          const isToday = isSameLocalDay(day.date, today);
          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => onSelect(day.date)}
              aria-pressed={selected}
              aria-label={`${day.weekdayLabel}요일 ${day.dayOfMonth}일`}
              className={`flex min-h-[58px] flex-col items-center justify-center rounded-xl px-1 py-2 transition-all ${
                selected
                  ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900'
                  : isToday
                    ? 'border border-slate-200 bg-slate-50/80 text-slate-900'
                    : 'border border-slate-100 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span
                className={`text-[10px] font-bold ${
                  selected
                    ? 'text-slate-200'
                    : day.isSunday
                      ? 'text-rose-500'
                      : day.isSaturday
                        ? 'text-blue-500'
                        : 'text-slate-400'
                }`}
              >
                {day.weekdayLabel}
              </span>
              <span
                className={`mt-0.5 text-sm font-extrabold ${
                  selected ? 'text-white' : 'text-slate-900'
                }`}
              >
                {day.dayOfMonth}
              </span>
              <span className="sr-only">{toDateKey(day.date)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
