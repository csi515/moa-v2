import { useMemo, type FC } from 'react';
import type { CalendarEventItem } from '../types';
import { getMonthGridDays, type MonthDayInfo } from '../utils/calendarMath';

export interface CalendarMonthViewProps<T = any> {
  currentDate: Date;
  events: CalendarEventItem<T>[];
  onSelectDate: (date: Date) => void;
  onEventClick?: (event: CalendarEventItem<T>) => void;
  renderEventCard?: (event: CalendarEventItem<T>, view: 'month') => React.ReactNode;
}

const WEEK_HEADER = ['일', '월', '화', '수', '목', '금', '토'];

const COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  indigo: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  teal: { bg: 'bg-teal-50 border-teal-200', text: 'text-teal-700', dot: 'bg-teal-500' },
  rose: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
  amber: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  emerald: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  slate: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-500' },
};

export const CalendarMonthView: FC<CalendarMonthViewProps> = ({
  currentDate,
  events,
  onSelectDate,
  onEventClick,
  renderEventCard,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const days: MonthDayInfo[] = useMemo(
    () => getMonthGridDays(year, month),
    [year, month]
  );

  // 날짜별 이벤트 그룹핑 인덱스
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const ev of events) {
      if (!ev.date) continue;
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  const handleCellClick = (day: MonthDayInfo) => {
    const [y, m, d] = day.date.split('-').map(Number);
    onSelectDate(new Date(y, m - 1, d));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
      {/* 요일 헤더 (일 ~ 토) */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-extrabold py-2 text-slate-700">
        {WEEK_HEADER.map((label, idx) => (
          <div
            key={label}
            className={`${idx === 0 ? 'text-rose-600' : idx === 6 ? 'text-indigo-600' : ''}`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 flex-1 auto-rows-fr">
        {days.map((day) => {
          const dayEvents = eventsByDate.get(day.date) ?? [];
          const isSun = day.dayOfWeek === '일';
          const isSat = day.dayOfWeek === '토';

          return (
            <div
              key={day.date}
              onClick={() => handleCellClick(day)}
              className={`min-h-[88px] sm:min-h-[105px] p-1.5 flex flex-col transition-colors cursor-pointer group hover:bg-indigo-50/20 ${
                !day.isCurrentMonth ? 'bg-slate-50/50 text-slate-300' : 'bg-white'
              } ${day.isToday ? 'bg-indigo-50/40 ring-1 ring-indigo-500 ring-inset' : ''}`}
            >
              {/* 상단 날짜 번호 및 도트 */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-black inline-flex items-center justify-center w-6 h-6 rounded-full transition-transform group-hover:scale-105 ${
                    day.isToday
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isSun
                        ? 'text-rose-600'
                        : isSat
                          ? 'text-indigo-600'
                          : day.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-300'
                  }`}
                >
                  {day.dayNumber}
                </span>

                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-full">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* 이벤트 칩 목록 (최대 2개 노출, 초과시 +N개) */}
              <div className="space-y-1 flex-1 overflow-hidden">
                {dayEvents.slice(0, 2).map((ev) => {
                  if (renderEventCard) {
                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(ev);
                        }}
                      >
                        {renderEventCard(ev, 'month')}
                      </div>
                    );
                  }

                  const theme = COLOR_MAP[ev.colorTheme || 'teal'];
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(ev);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold truncate border flex items-center gap-1 hover:brightness-95 transition-all ${theme.bg} ${theme.text}`}
                      title={`${ev.startTime} ${ev.title}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.dot}`} />
                      <span className="truncate">{ev.startTime} {ev.title}</span>
                    </div>
                  );
                })}

                {dayEvents.length > 2 && (
                  <div className="text-[10px] font-extrabold text-slate-600 pl-1">
                    +{dayEvents.length - 2}개 더보기
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
