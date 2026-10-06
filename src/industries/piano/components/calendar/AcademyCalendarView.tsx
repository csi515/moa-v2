import React, { useState, useMemo } from 'react';
import { useList, useCreate, useDelete } from '@refinedev/core';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { getPlaceLabel } from '@/core/industry/industryUi';
import { usePublicHolidays, holidaysOnDate, holidaysForMonth } from '@/core/calendar';
import { useStaffScope } from '@/hooks';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { PageHeader, FilterBar, Modal } from '@/shared/components';
import { AcademyEvent } from '@/types';
import { visibleStaffCalendarEvents } from './visibleStaffCalendarEvents';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  Cake,
  Flag,
} from 'lucide-react';

export const AcademyCalendarView: React.FC<{ embedded?: boolean }> = ({
  embedded = false,
}) => {
  const { showToast } = useApp();
  const { currentOrganization } = useOrganization();
  const { industry } = usePermissions();
  const placeLabel = getPlaceLabel(industry);
  const scheduleLabel = `${placeLabel} 일정`;
  const { isScoped, scopeStudents, scopeRecitalEvents } = useStaffScope();
  const now = new Date();

  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

  // Fetch students from Refine (core schema)
  const studentsList = useList<any>({
    resource: 'customers',
    filters: [{ field: 'status', operator: 'eq', value: 'active' }],
    queryOptions: { enabled: !!currentOrganization?.id },
  });
  const allStudents = (studentsList as any).data?.data || (studentsList as any).query?.data?.data || [];
  const students = useMemo(
    () => (isScoped ? scopeStudents(allStudents) : allStudents),
    [allStudents, isScoped, scopeStudents]
  );

  // Fetch events from Refine (piano schema)
  const eventsList = useList<any>({
    resource: 'events',
    meta: { schema: 'piano' },
    queryOptions: { enabled: !!currentOrganization?.id },
  });
  const rawEvents = (eventsList as any).data?.data || (eventsList as any).query?.data?.data || [];

  // Map DB rows to AcademyEvent interface
  const dbEvents = useMemo<AcademyEvent[]>(() =>
    rawEvents.map((r: any) => ({
      id: r.id,
      title: r.title,
      startDate: r.start_date,
      endDate: r.end_date || undefined,
      type: r.event_type as AcademyEvent['type'],
      description: r.description || undefined,
      color: r.color || '#4f46e5',
      participationFee: r.metadata?.participationFee,
      studentIds: r.metadata?.studentIds,
    })),
    [rawEvents]
  );

  const publicHolidays = usePublicHolidays(currentYear);
  const events = useMemo(
    () => visibleStaffCalendarEvents(dbEvents, allStudents, isScoped, scopeRecitalEvents),
    [dbEvents, allStudents, isScoped, scopeRecitalEvents]
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    startDate: now.toISOString().slice(0, 10),
    type: 'concert' as AcademyEvent['type'],
    description: '',
    color: '#4f46e5',
    participationFee: 0,
  });

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();

  const currentYearMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const monthEvents = useMemo(() => {
    return events.filter((e) => e.startDate.startsWith(currentYearMonthStr));
  }, [events, currentYearMonthStr]);

  const monthHolidays = useMemo(
    () => holidaysForMonth(publicHolidays, currentYear, currentMonth),
    [publicHolidays, currentYear, currentMonth]
  );

  const birthdayStudents = useMemo(() => {
    return students.filter((s) => {
      if (!s.birthDate) return false;
      const m = parseInt(s.birthDate.split('-')[1], 10);
      return m === currentMonth;
    });
  }, [students, currentMonth]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) {
      return {
        dayEvents: [] as typeof events,
        dayBdays: [] as typeof birthdayStudents,
        dayHolidays: [] as typeof publicHolidays,
      };
    }
    const dateStr = `${currentYearMonthStr}-${String(selectedDay).padStart(2, '0')}`;
    return {
      dayEvents: events.filter((ev) => ev.startDate === dateStr),
      dayBdays: birthdayStudents.filter((s) => {
        const bDay = parseInt(s.birthDate.split('-')[2], 10);
        return bDay === selectedDay;
      }),
      dayHolidays: holidaysOnDate(publicHolidays, dateStr),
    };
  }, [selectedDay, currentYearMonthStr, events, birthdayStudents, publicHolidays]);

  const { mutate: createEvent, isLoading: isCreating } = useCreate() as any;
  const { mutate: deleteEvent } = useDelete();

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;

    const participationFee =
      newEvent.type === 'concert' || newEvent.type === 'competition'
        ? Number(newEvent.participationFee) || undefined
        : undefined;

    createEvent(
      {
        resource: 'events',
        meta: { schema: 'piano' },
        values: {
          organization_id: currentOrganization?.id,
          title: newEvent.title.trim(),
          start_date: newEvent.startDate,
          event_type: newEvent.type,
          description: newEvent.description.trim() || null,
          color: newEvent.color,
          metadata: participationFee ? { participationFee } : {},
        },
      },
      {
        onSuccess: () => {
          showToast(`'${newEvent.title.trim()}' 일정이 등록되었습니다.`, 'success');
          setIsModalOpen(false);
        },
        onError: () => showToast('일정 등록에 실패했습니다.', 'error'),
      }
    );
  };

  const handleDeleteEvent = (id: string) => {
    deleteEvent(
      { resource: 'events', id, meta: { schema: 'piano' } },
      {
        onSuccess: () => showToast('일정이 삭제되었습니다.', 'info'),
        onError: () => showToast('삭제에 실패했습니다.', 'error'),
      }
    );
  };

  const openCreateModal = () => {
    setNewEvent({
      title: '',
      startDate: `${currentYearMonthStr}-15`,
      type: 'concert',
      description: '',
      color: '#4f46e5',
      participationFee: 0,
    });
    setIsModalOpen(true);
  };

  const renderDayDetailList = (
    dayEvents: typeof events,
    dayBdays: typeof birthdayStudents,
    dayHolidays: typeof publicHolidays = [],
    emptyMessage = isScoped ? '볼 일정이 없습니다.' : '등록된 일정이 없습니다.'
  ) => {
    if (dayEvents.length === 0 && dayBdays.length === 0 && dayHolidays.length === 0) {
      return <p className="text-xs text-slate-400 py-4 text-center">{emptyMessage}</p>;
    }

    return (
      <div className="space-y-2">
        {dayHolidays.map((h) => (
          <div
            key={`holiday-${h.date}-${h.name}`}
            className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-2 text-sm font-bold text-rose-700"
          >
            <Flag className="w-4 h-4 shrink-0" />
            {h.name}
          </div>
        ))}
        {dayEvents.map((ev) => (
          <div
            key={ev.id}
            className="p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-3"
            style={{ borderLeftWidth: 4, borderLeftColor: ev.color || '#4f46e5' }}
          >
            <div>
              <p className="font-bold text-sm text-slate-900">{ev.title}</p>
              {ev.description && <p className="text-xs text-slate-500 mt-0.5">{ev.description}</p>}
            </div>
            {!isScoped && (
            <button
              type="button"
              onClick={() => handleDeleteEvent(ev.id)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg"
              aria-label="일정 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            )}
          </div>
        ))}
        {dayBdays.map((s) => (
          <div
            key={s.id}
            className="p-3 rounded-xl bg-pink-50 border border-pink-100 flex items-center gap-2 text-sm font-bold text-pink-700"
          >
            <Cake className="w-4 h-4 shrink-0" />
            {s.name} 생일 🎂
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={embedded ? 'space-y-4 pb-2' : 'space-y-4 pb-4'}>
      {!embedded ? (
        <PageHeader
          density="compact"
          icon={<CalendarDays className="w-6 h-6" />}
          title={`${scheduleLabel} 및 캘린더`}
          actions={
            !isScoped ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {scheduleLabel} 등록
            </button>
            ) : undefined
          }
        />
      ) : !isScoped ? (
        <div className="flex justify-end no-print">
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {scheduleLabel} 등록
          </button>
        </div>
      ) : null}

      <FilterBar className="justify-between">
        <button
          onClick={handlePrevMonth}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          aria-label="이전 달"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-black text-slate-900">
          {currentYear}년 {currentMonth}월
        </h3>

        <button
          onClick={handleNextMonth}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          aria-label="다음 달"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </FilterBar>

      {/* 모바일: 날짜 선택 + 해당 일 일정 */}
      <div className="md:hidden space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${currentYearMonthStr}-${String(dayNum).padStart(2, '0')}`;
            const dayEvents = events.filter((ev) => ev.startDate === dateStr);
            const dayBdays = birthdayStudents.filter((s) => {
              const bDay = parseInt(s.birthDate.split('-')[2], 10);
              return bDay === dayNum;
            });
            const dayHolidays = holidaysOnDate(publicHolidays, dateStr);
            const hasItems =
              dayEvents.length > 0 || dayBdays.length > 0 || dayHolidays.length > 0;
            const isSelected = selectedDay === dayNum;
            const isSunday = new Date(currentYear, currentMonth - 1, dayNum).getDay() === 0;
            const isHoliday = dayHolidays.length > 0;

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => setSelectedDay(dayNum)}
                className={`shrink-0 min-w-[44px] min-h-[44px] rounded-2xl flex flex-col items-center justify-center text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md'
                    : hasItems
                      ? isHoliday
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : isSunday || isHoliday
                        ? 'bg-white text-rose-600 border border-slate-200'
                        : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                <span>{dayNum}</span>
                {hasItems && !isSelected && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isHoliday ? 'bg-rose-500' : 'bg-indigo-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-slate-900">
              {currentMonth}월 {selectedDay}일 일정
            </h4>
            {renderDayDetailList(
              selectedDayEvents.dayEvents,
              selectedDayEvents.dayBdays,
              selectedDayEvents.dayHolidays
            )}
          </div>
        )}
      </div>

      {/* 데스크탑: 캘린더 + 선택일 사이드 패널 */}
      <div className="hidden md:flex md:min-h-[calc(100dvh-14rem)] gap-4 items-stretch">
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold py-2.5 shrink-0">
            <span className="text-rose-500">일</span>
            <span>월</span>
            <span>화</span>
            <span>수</span>
            <span>목</span>
            <span>금</span>
            <span className="text-indigo-600">토</span>
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 text-xs flex-1 auto-rows-fr">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[72px] p-1.5 bg-slate-50/40" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentYearMonthStr}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = events.filter((ev) => ev.startDate === dateStr);
              const dayBdays = birthdayStudents.filter((s) => {
                const bDay = parseInt(s.birthDate.split('-')[2], 10);
                return bDay === dayNum;
              });
              const dayHolidays = holidaysOnDate(publicHolidays, dateStr);
              const isSunday = new Date(currentYear, currentMonth - 1, dayNum).getDay() === 0;
              const isHoliday = dayHolidays.length > 0;

              return (
                <div
                  key={dayNum}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`min-h-[72px] p-1.5 hover:bg-indigo-50/30 transition-colors cursor-pointer space-y-0.5 ${
                    selectedDay === dayNum ? 'bg-indigo-50/50 ring-2 ring-indigo-600 ring-inset' : ''
                  }`}
                >
                  <span
                    className={`font-bold ${
                      isHoliday || isSunday ? 'text-rose-600' : 'text-slate-700'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {dayHolidays.map((h) => (
                    <div
                      key={`${h.date}-${h.name}`}
                      className="p-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 truncate"
                      title={h.name}
                    >
                      {h.name}
                    </div>
                  ))}

                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-0.5 rounded-md text-[10px] font-bold text-white truncate shadow-2xs"
                      style={{ backgroundColor: ev.color || '#4f46e5' }}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}

                  {dayBdays.map((s) => (
                    <div
                      key={s.id}
                      className="p-0.5 rounded-md text-[10px] font-bold bg-pink-100 text-pink-700 truncate flex items-center gap-1"
                    >
                      <Cake className="w-3 h-3 text-pink-500 shrink-0" />
                      <span>{s.name} 생일</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="w-72 lg:w-80 shrink-0 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col gap-4 overflow-hidden">
          <div className="space-y-3 min-h-0 flex-1 overflow-y-auto">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2 sticky top-0 bg-white pb-1">
              <Clock className="w-4 h-4 text-indigo-600" />
              {selectedDay
                ? `${currentMonth}월 ${selectedDay}일`
                : `${currentMonth}월 일정`}
            </h4>
            {selectedDay ? (
              renderDayDetailList(
                selectedDayEvents.dayEvents,
                selectedDayEvents.dayBdays,
                selectedDayEvents.dayHolidays
              )
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">날짜를 선택하세요.</p>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2 shrink-0 max-h-48 overflow-y-auto">
            <p className="text-[11px] font-bold text-slate-500">
              이달 전체 · 일정 {monthEvents.length}건
              {monthHolidays.length > 0 ? ` · 공휴일 ${monthHolidays.length}일` : ''}
            </p>
            {monthHolidays.map((h) => (
              <button
                key={`month-holiday-${h.date}`}
                type="button"
                onClick={() => {
                  const day = parseInt(h.date.split('-')[2], 10);
                  setSelectedDay(day);
                }}
                className="w-full text-left p-2 rounded-xl border border-rose-100 bg-rose-50/70 hover:bg-rose-50 flex items-center gap-2 min-h-[44px]"
              >
                <Flag className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-bold text-rose-700">
                    {h.date.slice(8)}일
                  </span>
                  <p className="font-bold text-xs text-rose-800 truncate">{h.name}</p>
                </div>
              </button>
            ))}
            {monthEvents.length === 0 && monthHolidays.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">
                {isScoped ? '볼 일정이 없습니다' : '일정 없음'}
              </p>
            ) : (
              monthEvents.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    const day = parseInt(ev.startDate.split('-')[2], 10);
                    setSelectedDay(day);
                  }}
                  className="w-full text-left p-2 rounded-xl border border-slate-100 bg-slate-50 hover:bg-indigo-50/50 flex items-center gap-2 min-h-[44px]"
                >
                  <div
                    className="w-1.5 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: ev.color || '#4f46e5' }}
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold text-indigo-700">
                      {ev.startDate.slice(8)}일
                    </span>
                    <p className="font-bold text-xs text-slate-900 truncate">{ev.title}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${scheduleLabel} 등록`}>
        <form onSubmit={handleAddEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  행사 / 일정명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 가을 정기 연주회"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">일정 일자</label>
                  <input
                    type="date"
                    required
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">분류 유형</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as AcademyEvent['type'] })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="concert">정기 연주회</option>
                    <option value="competition">콩쿠르 출전</option>
                    <option value="special_lesson">특강/골든벨</option>
                    <option value="tuning">피아노 조율</option>
                    <option value="vacation">방학/휴원</option>
                    <option value="other">기타</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">상세 내용 및 장소</label>
                <textarea
                  rows={2}
                  placeholder="장소, 준비사항, 참가 대상 등..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none resize-none"
                />
              </div>

              {(newEvent.type === 'concert' || newEvent.type === 'competition') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    참가비 (₩) · 월 청구 합산용
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={newEvent.participationFee || ''}
                    onChange={(e) =>
                      setNewEvent({
                        ...newEvent,
                        participationFee: Number(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    설정에서 「월 청구에 교재·연주회비 합산」을 켠 경우, 참가 원생 월회비에 포함됩니다.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">표시 색상</label>
                <div className="flex gap-2">
                  {['#4f46e5', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'].map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setNewEvent({ ...newEvent, color: c })}
                      className={`w-7 h-7 rounded-xl border-2 transition-transform cursor-pointer ${
                        newEvent.color === c ? 'scale-110 border-slate-900' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
                >
                  저장
                </button>
              </div>
            </form>
      </Modal>
    </div>
  );
};
