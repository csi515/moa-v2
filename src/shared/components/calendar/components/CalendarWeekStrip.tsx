import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarEventItem } from '../types';
import { formatIsoDateLocal } from '@/shared/utils/localDate';

export interface CalendarWeekStripProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  events?: CalendarEventItem[];
  className?: string;
}

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;

export const CalendarWeekStrip: React.FC<CalendarWeekStripProps> = ({
  currentDate,
  onDateSelect,
  events = [],
  className = '',
}) => {
  // 현재 날짜가 속한 주의 일요일부터 토요일까지 7일 계산
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const base = new Date(currentDate);
    const dayOfWeek = base.getDay(); // 0(일) ~ 6(토)
    const sunday = new Date(base);
    sunday.setDate(base.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // 각 날짜별 일정 및 정원 계산
  const dayStats = useMemo(() => {
    const map = new Map<string, { total: number; full: number; available: number }>();

    for (const d of weekDays) {
      const dateStr = formatIsoDateLocal(d);
      const dayEvents = events.filter((ev) => ev.date === dateStr);
      let fullCount = 0;
      let availableCount = 0;

      for (const ev of dayEvents) {
        if (ev.capacity) {
          const current = ev.capacity.current;
          const max = ev.capacity.max;
          if (ev.capacity.isClosed || (max > 0 && current >= max)) {
            fullCount++;
          } else {
            availableCount++;
          }
        } else {
          availableCount++;
        }
      }

      map.set(dateStr, {
        total: dayEvents.length,
        full: fullCount,
        available: availableCount,
      });
    }

    return map;
  }, [weekDays, events]);

  const handlePrevWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() - 7);
    onDateSelect(next);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    onDateSelect(next);
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const isSelected = (d: Date) => {
    return (
      d.getFullYear() === currentDate.getFullYear() &&
      d.getMonth() === currentDate.getMonth() &&
      d.getDate() === currentDate.getDate()
    );
  };

  return (
    <div className={`w-full bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs ${className}`}>
      {/* 주간 네비게이션 헤더 */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <span className="text-xs font-extrabold text-slate-800">
          {weekDays[0].getMonth() + 1}월 {weekDays[0].getDate()}일 ~ {weekDays[6].getMonth() + 1}월 {weekDays[6].getDate()}일
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevWeek}
            aria-label="이전 주"
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDateSelect(new Date())}
            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={handleNextWeek}
            aria-label="다음 주"
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 가로 7일 스트립 그리드 */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekDays.map((d, idx) => {
          const selected = isSelected(d);
          const today = isToday(d);
          const dateStr = formatIsoDateLocal(d);
          const stat = dayStats.get(dateStr) || { total: 0, full: 0, available: 0 };
          const isSunday = idx === 0;
          const isSaturday = idx === 6;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onDateSelect(d)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer min-h-[58px] ${
                selected
                  ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900'
                  : today
                  ? 'bg-slate-50/80 text-slate-900 border border-slate-200'
                  : 'bg-slate-50/60 hover:bg-slate-100 text-slate-700 border border-slate-100'
              }`}
            >
              <span
                className={`text-[10px] font-bold ${
                  selected
                    ? 'text-slate-200'
                    : isSunday
                    ? 'text-rose-500'
                    : isSaturday
                    ? 'text-blue-500'
                    : 'text-slate-400'
                }`}
              >
                {WEEKDAY_NAMES[idx]}
              </span>
              <span className={`text-sm font-extrabold mt-0.5 ${selected ? 'text-white' : 'text-slate-900'}`}>
                {d.getDate()}
              </span>

              {/* 일정 및 정원 뱃지 */}
              <div className="flex items-center gap-1 mt-1 h-2">
                {stat.total > 0 ? (
                  <>
                    {stat.available > 0 && (
                      <span
                        title={`${stat.available}개 슬롯 여유`}
                        className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-emerald-300' : 'bg-emerald-500'}`}
                      />
                    )}
                    {stat.full > 0 && (
                      <span
                        title={`${stat.full}개 슬롯 마감`}
                        className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-rose-300' : 'bg-rose-500'}`}
                      />
                    )}
                  </>
                ) : (
                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
