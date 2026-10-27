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
    <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
      <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-white/10 text-indigo-200 text-xs font-semibold rounded-full backdrop-blur-xs flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              오늘의 학원 브리핑
            </span>
            <span className="text-xs text-indigo-300 font-medium">
              {formatKoreanDate(new Date().toISOString())}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            안녕하세요, {currentUserName}! 🎹
          </h2>
          {isEmptyState ? (
            <p className="text-sm text-indigo-200 mt-2 max-w-2xl leading-relaxed">
              학원을 시작할 준비가 되었습니다! <strong className="text-white">첫 학생을 등록</strong>하고{' '}
              <strong className="text-white">수업 클래스를 개설</strong>해보세요.
            </p>
          ) : (
            <p className="text-sm text-indigo-200 mt-2 max-w-2xl leading-relaxed">
              오늘 예정된 수업은 <strong className="text-white underline">{stats.todayClassesCount}개 반</strong>이며,
              재학생 <strong className="text-white">{stats.activeStudents}명</strong>이 즐겁게 피아노를 배우고 있습니다.
            </p>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isEmptyState ? (
            <>
              <button
                onClick={() => setActiveTab('students')}
                className="px-4 py-2.5 bg-white text-indigo-900 font-bold text-xs sm:text-sm rounded-xl hover:bg-indigo-50 transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-indigo-600" />
                첫 학생 등록하기
              </button>
              <button
                onClick={() => setActiveTab('classes')}
                className="px-4 py-2.5 bg-indigo-600/60 hover:bg-indigo-600 text-white font-semibold text-xs sm:text-sm rounded-xl border border-indigo-400/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4" />
                수업 클래스 개설
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('attendance')}
                className="px-4 py-2.5 bg-white text-indigo-900 font-bold text-xs sm:text-sm rounded-xl hover:bg-indigo-50 transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
                오늘 출결 체크
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className="px-4 py-2.5 bg-indigo-600/60 hover:bg-indigo-600 text-white font-semibold text-xs sm:text-sm rounded-xl border border-indigo-400/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                신규 학생 등록
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
