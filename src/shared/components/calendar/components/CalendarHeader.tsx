import type { FC } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import type { CalendarEngineMode, CalendarViewMode } from '../types';
import { getWeekDaysForDate } from '../utils/calendarMath';

export interface CalendarHeaderProps {
  mode: CalendarEngineMode;
  currentDate: Date;
  currentView: CalendarViewMode;
  availableViews: CalendarViewMode[];
  onViewChange: (view: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

const VIEW_LABELS: Record<CalendarViewMode, string> = {
  month: '월간',
  week: '주간',
  day: '일간',
};

export const CalendarHeader: FC<CalendarHeaderProps> = ({
  mode,
  currentDate,
  currentView,
  availableViews,
  onViewChange,
  onPrev,
  onNext,
  onToday,
}) => {
  const isTimetable = mode === 'recurring_timetable';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();

  let titleLabel = `${year}년 ${month}월`;
  if (!isTimetable) {
    if (currentView === 'day') {
      const dayOfWeekKo = ['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()];
      titleLabel = `${year}년 ${month}월 ${day}일 (${dayOfWeekKo})`;
    } else if (currentView === 'week') {
      const week = getWeekDaysForDate(currentDate);
      const start = week[0];
      const end = week[6];
      titleLabel = `${start.date.slice(5).replace('-', '.')} ~ ${end.date.slice(5).replace('-', '.')}`;
    }
  } else {
    titleLabel = '주간 정규 시간표';
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
      {/* 날짜 제목 및 네비게이션 */}
      <div className="flex items-center gap-2">
        {!isTimetable && (
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={onPrev}
              className="p-2 hover:bg-slate-50 text-slate-600 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
              aria-label="이전"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToday}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 border-x border-slate-200 transition-colors min-h-[36px] cursor-pointer"
            >
              오늘
            </button>
            <button
              type="button"
              onClick={onNext}
              className="p-2 hover:bg-slate-50 text-slate-600 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
              aria-label="다음"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {isTimetable && <CalendarIcon className="w-5 h-5 text-indigo-600" />}
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {titleLabel}
          </h3>
        </div>
      </div>

      {/* 뷰 스위처 (월/주/일) */}
      {availableViews.length > 1 && (
        <div className="inline-flex self-start sm:self-auto bg-slate-100 p-1 rounded-xl shadow-2xs">
          {availableViews.map((v) => {
            const isActive = currentView === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onViewChange(v)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all min-h-[36px] cursor-pointer ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {VIEW_LABELS[v]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
