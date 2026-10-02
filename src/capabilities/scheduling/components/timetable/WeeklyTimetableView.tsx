import React, { useState, useEffect, useMemo } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useStaffScope, useIsDesktop, useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import { PageHeader } from '@/shared/components';
import { ClassItem, DayOfWeek } from '@/types';
import {
  Clock,
  Printer,
  Filter,
  CalendarCheck,
  X,
  ChevronRight,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { TimetableDayTimeline, type TimetableDayClassRow } from './TimetableDayTimeline';
import { isoDateForWeekdayThisWeek } from '@/shared/utils/weekDate';

const DAYS: DayOfWeek[] = ['월', '화', '수', '목', '금', '토'];
const TIME_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];

const CURRENT_DAY_MAP: Record<number, DayOfWeek> = {
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};

function nowTimeHhMm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface WeeklyTimetableViewProps {
  /** 상위 일정 허브에 임베드 시 PageHeader 생략 */
  embedded?: boolean;
}

export const WeeklyTimetableView: React.FC<WeeklyTimetableViewProps> = ({
  embedded = false,
}) => {
  const { setSelectedStudentId, setActiveTab, currentUser: _currentUser } = useApp();
  const { isScoped, staffId, scopeClasses, scopeStudents, scopeMakeupItems } = useStaffScope();
  const refreshKey = useStorageRefresh();

  const classes = useMemo(
    () => scopeClasses(StorageService.getClasses()),
    [scopeClasses, refreshKey]
  );
  const teachers = StorageService.getTeachers();
  const students = useMemo(
    () => scopeStudents(StorageService.getStudents()),
    [scopeStudents, refreshKey]
  );
  const scheduledMakeups = useMemo(
    () =>
      scopeMakeupItems(StorageService.getMakeupItems(), students).filter(
        (m) => m.status === 'scheduled' && m.makeUpDate
      ),
    [scopeMakeupItems, students, refreshKey]
  );

  const dayIndex = new Date().getDay();
  const todayDay: DayOfWeek | null = CURRENT_DAY_MAP[dayIndex] ?? null;
  const initialDay: DayOfWeek = todayDay ?? '월';

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(initialDay);
  const [viewMode, setViewMode] = useState<'auto' | 'weekly' | 'daily'>('auto');
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [roomFilter, setRoomFilter] = useState('ALL');
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const isDesktop = useIsDesktop();

  const showDailyView = viewMode === 'daily' || (viewMode === 'auto' && !isDesktop);
  const showWeeklyView = viewMode === 'weekly' || (viewMode === 'auto' && isDesktop);

  useEffect(() => {
    if (isScoped && staffId) setTeacherFilter(staffId);
  }, [isScoped, staffId]);

  const rooms = Array.from(
    new Set([
      ...classes.map((c) => c.room),
      ...scheduledMakeups.map((m) => m.makeUpRoom).filter(Boolean),
    ] as string[])
  );

  const filteredClasses = classes.filter((cls) => {
    if (teacherFilter !== 'ALL' && cls.teacherId !== teacherFilter) return false;
    if (roomFilter !== 'ALL' && cls.room !== roomFilter) return false;
    return true;
  });

  const selectedDayDate = isoDateForWeekdayThisWeek(selectedDay);
  const dayMakeups = scheduledMakeups.filter((m) => {
    if (m.makeUpDate !== selectedDayDate) return false;
    if (teacherFilter !== 'ALL' && m.makeUpTeacherId && m.makeUpTeacherId !== teacherFilter) {
      return false;
    }
    if (roomFilter !== 'ALL' && m.makeUpRoom && m.makeUpRoom !== roomFilter) return false;
    return true;
  });

  const getMakeupsForSlot = (day: DayOfWeek, slotTime: string) => {
    const date = isoDateForWeekdayThisWeek(day);
    const slotHour = parseInt(slotTime.split(':')[0], 10);
    return scheduledMakeups.filter((m) => {
      if (m.makeUpDate !== date || !m.makeUpStartTime) return false;
      if (teacherFilter !== 'ALL' && m.makeUpTeacherId && m.makeUpTeacherId !== teacherFilter) {
        return false;
      }
      if (roomFilter !== 'ALL' && m.makeUpRoom && m.makeUpRoom !== roomFilter) return false;
      return parseInt(m.makeUpStartTime.split(':')[0], 10) === slotHour;
    });
  };

  const getClassesForSlot = (day: DayOfWeek, slotTime: string) => {
    const slotHour = parseInt(slotTime.split(':')[0], 10);
    return filteredClasses.filter((cls) => {
      if (!cls.daysOfWeek.includes(day)) return false;
      const classStartHour = parseInt(cls.startTime.split(':')[0], 10);
      return classStartHour === slotHour;
    });
  };

  const dayClasses = filteredClasses
    .filter((cls) => cls.daysOfWeek.includes(selectedDay))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const timelineRows: TimetableDayClassRow[] = useMemo(() => {
    const isTodaySelected = todayDay !== null && selectedDay === todayDay;
    const now = isTodaySelected ? nowTimeHhMm() : null;

    let nowId: string | null = null;
    let nextId: string | null = null;

    if (now) {
      for (const cls of dayClasses) {
        if (cls.startTime <= now && now < cls.endTime) {
          nowId = cls.id;
          break;
        }
      }
      if (!nowId) {
        const upcoming = dayClasses.find((cls) => cls.startTime > now);
        nextId = upcoming?.id ?? null;
      }
    }

    return dayClasses.map((cls) => ({
      classItem: cls,
      enrolledCount: students.filter(
        (s) => s.status === 'active' && s.classIds?.includes(cls.id)
      ).length,
      highlight: cls.id === nowId ? 'now' : cls.id === nextId ? 'next' : null,
    }));
  }, [dayClasses, students, selectedDay, todayDay]);

  const viewToggle = (
    <div className="bg-slate-100 p-1 rounded-xl hidden md:flex items-center gap-1 text-xs font-bold text-slate-600 no-print">
      <button
        type="button"
        onClick={() => setViewMode('daily')}
        className={`px-3 py-1.5 min-h-[44px] rounded-lg transition-all cursor-pointer ${
          showDailyView ? 'bg-white text-indigo-600 shadow-2xs' : 'hover:text-slate-900'
        }`}
      >
        일간 목록
      </button>
      <button
        type="button"
        onClick={() => setViewMode('weekly')}
        className={`px-3 py-1.5 min-h-[44px] rounded-lg transition-all cursor-pointer ${
          showWeeklyView ? 'bg-white text-indigo-600 shadow-2xs' : 'hover:text-slate-900'
        }`}
      >
        주간 그리드
      </button>
    </div>
  );

  return (
    <div className={embedded ? 'space-y-4 pb-2' : 'space-y-4 pb-4'}>
      {!embedded && (
        <PageHeader
          icon={<Clock className="w-6 h-6" />}
          title="수업 시간표"
          description="요일별 수업 일정 · 모바일은 오늘 시간순 목록"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {viewToggle}
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 min-h-[44px] bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer no-print"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">인쇄</span>
              </button>
            </div>
          }
        />
      )}

      {embedded && (
        <div className="flex items-center justify-between gap-2 flex-wrap no-print">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 min-h-[44px] rounded-lg transition-all cursor-pointer ${
                showDailyView ? 'bg-white text-indigo-600 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              일간
            </button>
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 min-h-[44px] rounded-lg transition-all cursor-pointer ${
                showWeeklyView ? 'bg-white text-indigo-600 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              주간
            </button>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 min-h-[44px] bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">인쇄</span>
          </button>
        </div>
      )}

      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>필터</span>
          </div>

          {!isScoped && (
            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="px-3 py-2 min-h-[44px] text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              aria-label="선생님별 필터"
            >
              <option value="ALL">전체 선생님</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} 선생님
                </option>
              ))}
            </select>
          )}

          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="px-3 py-2 min-h-[44px] text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            aria-label="강의실 필터"
          >
            <option value="ALL">전체 강의실</option>
            {rooms.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500 font-semibold tabular-nums">
          반 {filteredClasses.length}
          {dayMakeups.length > 0 ? ` · 보강 ${dayMakeups.length}` : ''}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {todayDay && selectedDay !== todayDay && (
            <button
              type="button"
              onClick={() => setSelectedDay(todayDay)}
              className="px-2.5 py-2 rounded-xl text-xs font-bold shrink-0 min-h-[44px] bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-pointer"
            >
              오늘로
            </button>
          )}
          {DAYS.map((day) => {
            const count = filteredClasses.filter((c) => c.daysOfWeek.includes(day)).length;
            const isToday = todayDay === day;
            const isSelected = selectedDay === day;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 min-h-[44px] ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{day}요일</span>
                {isToday && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    오늘
                  </span>
                )}
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {showDailyView && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                {selectedDay === todayDay ? '오늘' : `${selectedDay}요일`} 수업 ({dayClasses.length})
              </h3>
              <span className="text-xs text-slate-400 hidden sm:inline">탭하면 상세·출결</span>
            </div>

            <TimetableDayTimeline
              dayLabel={selectedDay}
              rows={timelineRows}
              emptyTitle={`${selectedDay}요일에 등록된 수업이 없습니다`}
              emptyDescription={
                teacherFilter !== 'ALL' || roomFilter !== 'ALL'
                  ? '필터를 조정하거나 초기화해보세요.'
                  : '반 관리에서 수업을 개설하고 요일·시간을 설정하세요.'
              }
              emptyAction={
                (teacherFilter !== 'ALL' || roomFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setTeacherFilter('ALL');
                      setRoomFilter('ALL');
                    }}
                    className="px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-all"
                  >
                    필터 초기화
                  </button>
                )
              }
              onSelect={setSelectedClass}
            />

            {dayMakeups.length > 0 && (
              <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 space-y-2">
                <h4 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  보강 ({selectedDayDate}) · {dayMakeups.length}건
                </h4>
                {dayMakeups.map((m) => (
                  <button
                    key={m.attendanceId}
                    type="button"
                    onClick={() => setActiveTab('makeups')}
                    className="w-full text-left rounded-xl bg-white border border-purple-100 px-3 py-2.5 min-h-[44px] hover:border-purple-300"
                  >
                    <p className="text-sm font-bold text-slate-900">{m.studentName}</p>
                    <p className="text-xs text-purple-700 mt-0.5">
                      {m.makeUpStartTime && m.makeUpEndTime
                        ? `${m.makeUpStartTime}–${m.makeUpEndTime}`
                        : '시간 미정'}
                      {m.makeUpRoom ? ` · ${m.makeUpRoom}` : ''}
                      {m.makeUpTeacherName ? ` · ${m.makeUpTeacherName}` : ''}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {showWeeklyView && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[860px]">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-700">
                  <div className="py-2 px-2 border-r border-slate-200 text-slate-400">시간</div>
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className={`py-2 px-2 border-r border-slate-200 last:border-r-0 ${
                        day === todayDay ? 'bg-indigo-50 text-indigo-700' : ''
                      }`}
                    >
                      <span className={day === '토' ? 'text-indigo-600 font-extrabold' : ''}>
                        {day}요일
                      </span>
                    </div>
                  ))}
                </div>

                <div className="divide-y divide-slate-200">
                  {TIME_SLOTS.map((slot) => (
                    <div key={slot} className="grid grid-cols-7 min-h-[56px]">
                      <div className="p-1.5 border-r border-slate-200 bg-slate-50/40 text-center flex flex-col justify-start items-center">
                        <span className="font-mono text-xs font-bold text-slate-600">{slot}</span>
                      </div>

                      {DAYS.map((day) => {
                        const slotClasses = getClassesForSlot(day, slot);
                        const slotMakeups = getMakeupsForSlot(day, slot);
                        return (
                          <div
                            key={day}
                            className={`p-1 border-r border-slate-200 last:border-r-0 hover:bg-indigo-50/20 transition-colors space-y-1 ${
                              day === todayDay ? 'bg-indigo-50/30' : ''
                            }`}
                          >
                            {slotClasses.map((cls) => {
                              const enrolled = students.filter(
                                (s) => s.status === 'active' && s.classIds?.includes(cls.id)
                              );
                              return (
                                <button
                                  key={cls.id}
                                  type="button"
                                  onClick={() => setSelectedClass(cls)}
                                  className="w-full p-1.5 rounded-lg text-white text-xs cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98] transition-all text-left"
                                  style={{ backgroundColor: cls.color || '#4f46e5' }}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-[11px] truncate">{cls.name}</span>
                                    <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded shrink-0">
                                      {cls.room}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-white/90 mt-1">
                                    <span className="truncate">{cls.teacherName}</span>
                                    <span className="font-bold shrink-0">
                                      {enrolled.length}/{cls.capacity}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                            {slotMakeups.map((m) => (
                              <button
                                key={m.attendanceId}
                                type="button"
                                onClick={() => setActiveTab('makeups')}
                                className="w-full p-1.5 rounded-lg bg-purple-600 text-white text-xs cursor-pointer shadow-2xs hover:bg-purple-700 text-left"
                              >
                                <div className="font-bold text-[11px] truncate">
                                  보강 · {m.studentName}
                                </div>
                                <div className="text-[10px] text-white/90 mt-0.5 truncate">
                                  {m.makeUpRoom || m.makeUpTeacherName || '일정 확인'}
                                </div>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full sm:max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div
              className="p-5 text-white flex items-center justify-between"
              style={{ backgroundColor: selectedClass.color || '#4f46e5' }}
            >
              <div>
                <span className="text-xs bg-black/20 px-2 py-0.5 rounded-md font-semibold">
                  {selectedClass.room}
                </span>
                <h3 className="font-bold text-lg mt-1">{selectedClass.name}</h3>
                <p className="text-xs text-white/80">
                  {selectedClass.daysOfWeek.join(', ')} | {selectedClass.startTime} ~{' '}
                  {selectedClass.endTime}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-white rounded-xl cursor-pointer"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl gap-2 flex-wrap">
                <span>
                  담당: <strong>{selectedClass.teacherName}</strong>
                </span>
                <span>
                  정원: <strong>{selectedClass.capacity}명</strong>
                </span>
                <span>교재: {selectedClass.textbook || '-'}</span>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  수강 중인 학생
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {students
                    .filter(
                      (s) => s.status === 'active' && s.classIds?.includes(selectedClass.id)
                    )
                    .map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(st.id);
                          setActiveTab('students');
                        }}
                        className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 flex items-center justify-between text-xs transition-colors cursor-pointer min-h-[44px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{st.name}</span>
                          <span className="text-slate-500">
                            {st.school} {st.grade}
                          </span>
                        </div>
                        <span className="text-indigo-600 font-semibold flex items-center">
                          상세 <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    ))}
                  {students.filter(
                    (s) => s.status === 'active' && s.classIds?.includes(selectedClass.id)
                  ).length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">등록된 학생이 없습니다.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClass(null);
                    setActiveTab('attendance');
                  }}
                  className="w-full py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <CalendarCheck className="w-4 h-4" />
                  출결 체크하러 가기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
