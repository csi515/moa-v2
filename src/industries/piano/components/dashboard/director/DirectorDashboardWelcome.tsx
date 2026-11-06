import React from 'react';
import type { NavTab } from '@/context/AppContext';
import { formatKoreanDate } from '@/utils/formatters';
import { CalendarCheck, Sparkles, UserPlus } from 'lucide-react';
import type { DirectorDashboardData } from './useDirectorDashboard';

interface DirectorDashboardWelcomeProps {
  currentUserName: string;
  stats: Pick<DirectorDashboardData['stats'], 'todayClassesCount' | 'activeStudents'>;
  setActiveTab: (tab: NavTab) => void;
}

export const DirectorDashboardWelcome: React.FC<DirectorDashboardWelcomeProps> = ({
  currentUserName,
  stats,
  setActiveTab,
}) => {
  const isEmptyState = stats.activeStudents === 0 && stats.todayClassesCount === 0;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl py-3 px-3.5 sm:p-5 shadow-2xs relative">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-full flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              오늘의 학원 브리핑
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {formatKoreanDate(new Date().toISOString())}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
            안녕하세요, {currentUserName}님! 🎹
          </h2>
          {isEmptyState ? (
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-snug max-w-2xl">
              학원을 시작할 준비가 되었습니다! <strong className="text-slate-900 font-semibold">첫 학생을 등록</strong>하고{' '}
              <strong className="text-slate-900 font-semibold">수업 클래스를 개설</strong>해보세요.
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-snug max-w-2xl">
              오늘 예정된 수업은 <strong className="text-indigo-600 font-semibold">{stats.todayClassesCount}개 반</strong>이며,
              재학생 <strong className="text-slate-900 font-semibold">{stats.activeStudents}명</strong>이 함께하고 있습니다.
            </p>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-0">
          {isEmptyState ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('students')}
                className="px-3 sm:px-3.5 py-1.5 min-h-[38px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                첫 학생 등록하기
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('classes')}
                className="px-3 sm:px-3.5 py-1.5 min-h-[38px] bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4 text-slate-500" />
                수업 클래스 개설
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className="px-3 sm:px-3.5 py-1.5 min-h-[38px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4" />
                오늘 출결 체크
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('students')}
                className="px-3 sm:px-3.5 py-1.5 min-h-[38px] bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-slate-500" />
                신규 학생 등록
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
