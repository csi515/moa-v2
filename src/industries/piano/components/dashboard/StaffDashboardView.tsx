import React from 'react';
import { useApp } from '@/context/AppContext';
import { formatKoreanDate } from '@/utils/formatters';
import {
  Users,
  Sparkles,
  BookOpen,
  ChevronRight,
  Stamp,
  CheckSquare,
  CalendarDays,
} from 'lucide-react';
import { requestOpenPendingPractice } from '@/core/customer/studentJoinInbox';
import {
  STATUS_META,
  formatExpectedScheduleLabel,
  resolveDayStatus,
} from '../attendance/pianoAttendanceHelpers';
import { useStaffDashboardData } from './useStaffDashboardData';

/** 강사 홈 — 오늘 일정·출결 중심 (구 수업 업무면 제거) */
export const StaffDashboardView: React.FC = () => {
  const { setActiveTab, setSelectedStudentId, currentUser } = useApp();
  const {
    today,
    activeStudents,
    expected,
    uncheckedCount,
    pendingMakeups,
    pendingPracticeCount,
    dayRecordMap,
    pinCheckInIds,
  } = useStaffDashboardData();

  return (
    <div className="space-y-4 pb-4" data-testid="staff-home">
      <div className="bg-gradient-to-br from-indigo-800 via-indigo-900 to-slate-900 rounded-2xl px-4 py-3 text-white">
        <p className="text-indigo-200 text-[11px] font-semibold">선생님 홈</p>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight">{currentUser.name} 선생님</h2>
          <p className="text-[11px] text-indigo-200">
            {formatKoreanDate(today)} · 예정 {expected.length}명
          </p>
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          {[
            { label: '학생', value: String(activeStudents.length), tab: 'students' as const },
            { label: '예정', value: String(expected.length), tab: 'timetable' as const },
            { label: '미등원', value: String(uncheckedCount), tab: 'attendance' as const },
            { label: '미보강', value: String(pendingMakeups), tab: 'makeups' as const },
            { label: '연습', value: String(pendingPracticeCount), tab: 'practice' as const },
          ].map(({ label, value, tab }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (tab === 'practice') requestOpenPendingPractice();
                setActiveTab(tab);
              }}
              className="shrink-0 inline-flex items-center gap-1.5 min-h-[44px] px-2.5 rounded-lg bg-white/10 border border-white/15 text-xs font-bold"
            >
              <span className="text-indigo-200">{label}</span>
              <span className="tabular-nums text-sm">{value}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            오늘 예정
          </h3>
          <button
            type="button"
            onClick={() => setActiveTab('timetable')}
            className="text-xs font-bold text-indigo-600 min-h-[44px] px-1"
          >
            시간표
          </button>
        </div>
        {expected.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">오늘 배정된 학생이 없습니다.</p>
        ) : (
          <ul className="space-y-1.5 max-h-[220px] overflow-y-auto">
            {expected.slice(0, 8).map((row) => {
              const status = resolveDayStatus(
                dayRecordMap.get(row.student.id),
                pinCheckInIds.has(row.student.id)
              );
              return (
                <li
                  key={row.student.id}
                  className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-100 min-h-[48px]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{row.student.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {formatExpectedScheduleLabel(row.classes)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${STATUS_META[status].tone}`}
                  >
                    {STATUS_META[status].label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className="min-h-[48px] px-2.5 py-2 rounded-xl border bg-indigo-600 border-indigo-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-700"
        >
          <CheckSquare className="w-4 h-4" />
          출결 처리
          <ChevronRight className="w-3.5 h-3.5 text-white/70" />
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('timetable')}
          className="min-h-[48px] px-2.5 py-2 rounded-xl border bg-white border-slate-200 text-slate-800 text-sm font-bold flex items-center justify-center gap-1.5 hover:border-indigo-300"
        >
          <CalendarDays className="w-4 h-4 text-indigo-600" />
          일정
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-indigo-600" />
              담당 학생
            </h3>
            <button
              type="button"
              onClick={() => {
                setSelectedStudentId(null);
                setActiveTab('students');
              }}
              className="text-xs font-bold text-indigo-600 hover:underline min-h-[44px] px-1"
            >
              전체
            </button>
          </div>
          {activeStudents.length === 0 ? (
            <div className="py-3 text-center">
              <p className="text-sm text-slate-400">담당 학생이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {activeStudents.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedStudentId(s.id);
                    setActiveTab('students');
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl bg-indigo-50/50 border border-indigo-100 text-sm hover:bg-indigo-50 min-h-[44px]"
                >
                  <span className="font-bold text-slate-900">{s.name}</span>
                  <span className="text-xs text-indigo-600">{s.level}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
          <h3 className="font-bold text-slate-900 text-sm mb-2.5">부가</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { tab: 'practice' as const, label: '연습 기록', icon: BookOpen },
              { tab: 'song-stamps' as const, label: '완곡 스탬프', icon: Stamp },
              { tab: 'curriculum' as const, label: '커리큘럼', icon: BookOpen },
              { tab: 'assignments' as const, label: '주간 과제', icon: BookOpen },
              { tab: 'makeups' as const, label: '보강', icon: Sparkles },
            ].map(({ tab, label, icon: Icon }) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="min-h-[44px] px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 hover:border-indigo-300 flex items-center gap-1.5"
              >
                <Icon className="w-3.5 h-3.5 text-indigo-600" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
