import { useState, useMemo, type FC } from 'react';
import { Filter, Printer, UserPlus, Users, X } from 'lucide-react';
import { EmptyState, UnifiedScheduleCalendar, type CalendarEventItem } from '@/shared/components';
import type { CalendarViewMode } from '@/shared/components/calendar';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui';
import type { ClassItem, DayOfWeek } from '@/types';
import { usePianoNavigate } from '@/industries/piano/layout/usePianoNavigate';
import type { DragPlacementPayload } from './PianoTimetablePanels';
import {
  TIMETABLE_DAYS,
  resolveTimetableSlots,
  getPlacementsForSlot,
  slotEndTime,
  type SlotPlacement,
} from './pianoTimetablePlacement';
import { PianoTimetableMobileList } from './PianoTimetableMobileList';
import { PianoTimetableStudentPicker } from './PianoTimetableStudentPicker';
import { usePianoLessonTimetable } from './usePianoLessonTimetable';

/**
 * 피아노 수업 시간표 — 요일·시간대에 「누가 오는지」 배치·이동.
 * ClassItem + student.classIds 재사용. 출결(DAY_ATTENDANCE)은 절대 변경하지 않음.
 * 상단 드래그 풀 제거, 클릭 기반 학생 검색 배치 및 정기 반복 등록 지원.
 */
export const PianoLessonTimetableView: FC = () => {
  const navigate = usePianoNavigate();
  const [calendarView, setCalendarView] = useState<CalendarViewMode>('week');
  const [selectedDayFilter, setSelectedDayFilter] = useState<'ALL' | DayOfWeek>('ALL');

  const {
    useDragGrid,
    todayDay,
    selectedDay,
    setSelectedDay,
    teacherFilter,
    setTeacherFilter,
    layoutMode,
    setLayoutMode,
    pickerSlot,
    setPickerSlot,
    pickerQuery,
    setPickerQuery,
    pickerExcludeIds,
    pendingStudentId,
    setPendingStudentId,
    isScoped,
    teachers,
    students,
    visibleClasses,
    rooms,
    roomFilter,
    setRoomFilter,
    teacherSections,
    roomSections,
    placedIds,
    placeStudent,
    placeStudentWithRecurrence,
    movePlacement,
    handleDropStudent,
    handleRemove,
    openPickerForSlot,
    startPlaceStudent,
    placePending,
  } = usePianoLessonTimetable();

  const renderTimetable = (sectionClasses: ClassItem[], sectionTeacherId?: string, sectionRoom?: string) => {
    if (useDragGrid && selectedDayFilter === 'ALL') {
      const slots = resolveTimetableSlots(sectionClasses);
      const sectionEvents: CalendarEventItem<SlotPlacement>[] = [];

      for (const day of TIMETABLE_DAYS) {
        for (const slot of slots) {
          const placements = getPlacementsForSlot(students, sectionClasses, day, slot);
          for (const p of placements) {
            sectionEvents.push({
              id: `${p.student.id}_${p.classItem.id}_${day}_${slot}`,
              title: p.student.name,
              subtitle: p.classItem.teacherName || p.classItem.name,
              dayOfWeek: day,
              startTime: slot,
              endTime: p.classItem.endTime || slotEndTime(slot),
              colorTheme: 'indigo',
              isDraggable: p.editable,
              raw: p,
            });
          }
        }
      }

      return (
        <UnifiedScheduleCalendar<SlotPlacement>
          mode="recurring_timetable"
          availableViews={['month', 'week', 'day']}
          currentView={calendarView}
          onViewChange={setCalendarView}
          events={sectionEvents}
          onEventMove={async (event, target) => {
            if (!target.dayOfWeek) return false;
            const payload: DragPlacementPayload = {
              studentId: event.raw.student.id,
              day: event.dayOfWeek!,
              startTime: event.raw.classItem.startTime || event.startTime,
              classId: event.raw.classItem.id,
            };
            movePlacement(payload, target.dayOfWeek, target.startTime, sectionTeacherId);
            return true;
          }}
          renderEventCard={(event) => {
            const p = event.raw;
            return (
              <div
                className={`group rounded-lg px-2 py-1 text-left text-white shadow-2xs ${
                  p.editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default opacity-95'
                }`}
                style={{ backgroundColor: p.classItem.color || '#4f46e5' }}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold truncate">{p.student.name}</p>
                    <p className="text-[10px] text-white/85 truncate">
                      {p.classItem.teacherName || p.classItem.name}
                      {p.classItem.room && p.classItem.room !== '연습실' && p.classItem.room !== '미지정'
                        ? ` · ${p.classItem.room}`
                        : ''}
                      {!p.editable ? ' · 반' : ''}
                    </p>
                  </div>
                  {p.editable && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(p, event.dayOfWeek!, event.startTime);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded bg-black/20 hover:bg-black/35 shrink-0 cursor-pointer"
                      aria-label={`${p.student.name} 배치 제거`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          }}
          onSlotClick={(slot) => {
            if (slot.dayOfWeek) {
              openPickerForSlot(slot.dayOfWeek, slot.startTime, sectionTeacherId, sectionRoom);
            }
          }}
        />
      );
    }

    return (
      <PianoTimetableMobileList
        selectedDay={selectedDayFilter === 'ALL' ? selectedDay : selectedDayFilter}
        todayDay={todayDay}
        classes={sectionClasses}
        students={students}
        pendingStudentId={pendingStudentId}
        onSelectDay={setSelectedDay}
        onPickSlotForAdd={(day, startTime) => openPickerForSlot(day, startTime, sectionTeacherId, sectionRoom)}
        onPlacePending={(day, startTime) => placePending(day, startTime, sectionTeacherId, sectionRoom)}
        onRemove={handleRemove}
        onStartPlaceStudent={(student) => startPlaceStudent(student, sectionTeacherId)}
      />
    );
  };

  if (students.length === 0) {
    return (
      <EmptyState
        icon={<Users className="w-10 h-10" />}
        title="등록된 학생이 없습니다"
        description="학생을 등록한 뒤 시간표에 일정을 배치할 수 있습니다."
        action={{
          label: '학생 등록하기',
          onClick: () => navigate('students'),
          icon: <UserPlus className="w-4 h-4" />,
        }}
        guide={{
          badge: '30초 시작 가이드',
          title: '레슨 시간표 배치',
          tip: '학생을 등록한 뒤 이 화면에서 요일·시간 칸을 탭하면 배치됩니다.',
          steps: [
            { stepNumber: 1, title: '학생 등록', detail: '원생 명부에서 첫 학생을 등록합니다.' },
            { stepNumber: 2, title: '시간대 선택', detail: '원하는 요일·시작 시간을 탭합니다.' },
            { stepNumber: 3, title: '학생 배치', detail: '미배치 학생을 골라 칸에 넣습니다.' },
          ],
        }}
      />
    );
  }

  return (
    <div className="space-y-3 pb-2">
      {/* 인쇄 최적화 스타일 */}
      <style>{`
        @media print {
          nav, header, aside, .no-print, [data-testid="bottom-nav"] {
            display: none !important;
          }
          body {
            background: white !important;
            padding: 0 !important;
          }
          .min-h-screen {
            min-height: auto !important;
          }
        }
      `}</style>

      {pendingStudentId && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/90 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-indigo-950 font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <span>배치할 시간대를 시간표에서 클릭하세요.</span>
          </div>
          <button
            type="button"
            onClick={() => setPendingStudentId(null)}
            className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold"
          >
            배치 취소
          </button>
        </div>
      )}

      {/* 1단: 뷰 모드 & 필터 & 도구 툴바 */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        {/* 좌측: [전체 | 선생님별 | 강의실별] 모드 스위처 + 필터 드롭다운들 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-500">
            <button
              type="button"
              onClick={() => setLayoutMode('week')}
              className={`px-3 py-1.5 min-h-[38px] rounded-lg transition-all cursor-pointer ${
                layoutMode === 'week' ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('byTeacher')}
              className={`px-3 py-1.5 min-h-[38px] rounded-lg transition-all cursor-pointer ${
                layoutMode === 'byTeacher'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              선생님별
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('byRoom')}
              className={`px-3 py-1.5 min-h-[38px] rounded-lg transition-all cursor-pointer ${
                layoutMode === 'byRoom'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              강의실별
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block mx-0.5" />

          {/* 선생님 필터 (원장 모드 시) */}
          {!isScoped && (
            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className={`${FORM_CONTROL_CLASS} !min-h-[38px] !py-1.5 !text-xs w-auto min-w-[7.5rem]`}
              aria-label="선생님 필터"
            >
              <option value="ALL">전체 선생님</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {/* 강의실 필터 (학원에 방이 등록되어 있는 경우) */}
          {rooms.length > 0 && (
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className={`${FORM_CONTROL_CLASS} !min-h-[38px] !py-1.5 !text-xs w-auto min-w-[7.5rem]`}
              aria-label="강의실 필터"
            >
              <option value="ALL">전체 강의실</option>
              {rooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 우측: 통계 카운트 & 인쇄 버튼 */}
        <div className="flex items-center gap-2.5 ml-auto sm:ml-0">
          <span className="text-xs text-slate-500 font-semibold tabular-nums hidden sm:inline">
            반 {visibleClasses.length}
            {layoutMode === 'byTeacher' ? ` · 선생님 ${teacherSections.length}` : ''}
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
            title="A4 가로 시간표 인쇄"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>시간표 인쇄</span>
          </button>
        </div>
      </div>

      {/* 2단: 요일 네비게이션 탭 바 (메인 시간표 바로 위 배치로 직관성 극대화) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setSelectedDayFilter('ALL');
              setCalendarView('week');
            }}
            className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedDayFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            주간 전체
          </button>
          {TIMETABLE_DAYS.map((day) => {
            const selected = selectedDayFilter === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setSelectedDayFilter(day);
                  setSelectedDay(day);
                }}
                className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {day}요일
                {day === todayDay && (
                  <span className={`ml-1 text-[9px] ${selected ? 'text-indigo-200' : 'text-indigo-600 font-extrabold'}`}>
                    • 오늘
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 font-medium pr-2">
          <span>{selectedDayFilter === 'ALL' ? '주간 전체 시간표 보기' : `${selectedDayFilter}요일 집중 뷰`}</span>
        </div>
      </div>

      {/* 클릭 배치 안내 문구 */}
      <div className="flex items-center gap-2 text-xs text-slate-600 bg-indigo-50/60 border border-indigo-100/80 rounded-xl px-3.5 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
        <span>원하는 요일·시간 칸을 클릭하여 학생을 배치하세요.</span>
      </div>

      {/* 시간표 렌더링 (선생님별, 강의실별, 또는 전체) */}
      {layoutMode === 'byTeacher' ? (
        <div className="space-y-5">
          {teacherSections.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">표시할 수업이 없습니다.</p>
          ) : (
            teacherSections.map((section) => (
              <section key={section.id} className="space-y-2">
                <div className="flex items-center gap-2 px-0.5">
                  <h3 className="text-sm font-black text-slate-900">{section.name} 선생님</h3>
                  <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                    반 {section.classes.length}
                  </span>
                </div>
                {renderTimetable(section.classes, section.id === '__none__' ? undefined : section.id)}
              </section>
            ))
          )}
        </div>
      ) : layoutMode === 'byRoom' ? (
        <div className="space-y-5">
          {roomSections.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">표시할 수업이 없습니다.</p>
          ) : (
            roomSections.map((section) => (
              <section key={section.id} className="space-y-2">
                <div className="flex items-center gap-2 px-0.5">
                  <h3 className="text-sm font-black text-slate-900">{section.name}</h3>
                  <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                    반 {section.classes.length}
                  </span>
                </div>
                {renderTimetable(section.classes, undefined, section.name)}
              </section>
            ))
          )}
        </div>
      ) : (
        renderTimetable(visibleClasses)
      )}

      {/* 클릭 시 오픈되는 학생 검색 및 정기 반복 배치 모달 */}
      <PianoTimetableStudentPicker
        isOpen={!!pickerSlot}
        title="학생 시간표 배치"
        subtitle={
          pickerSlot ? `${pickerSlot.day}요일 ${pickerSlot.startTime} 배치` : undefined
        }
        students={students}
        teachers={teachers}
        rooms={rooms}
        defaultTeacherId={pickerSlot?.preferredTeacherId}
        defaultRoom={pickerSlot?.preferredRoom}
        searchQuery={pickerQuery}
        onSearchChange={setPickerQuery}
        excludeIds={pickerExcludeIds}
        initialDay={pickerSlot?.day}
        startTime={pickerSlot?.startTime}
        onClose={() => setPickerSlot(null)}
        onConfirmRecurrence={(student, days, startTime, teacherId, room) => {
          if (!pickerSlot) return;
          placeStudentWithRecurrence(
            student,
            days,
            startTime,
            teacherId || pickerSlot.preferredTeacherId,
            room || pickerSlot.preferredRoom
          );
        }}
        onSelect={(student, teacherId, room) => {
          if (!pickerSlot) return;
          placeStudent(
            student,
            pickerSlot.day,
            pickerSlot.startTime,
            teacherId || pickerSlot.preferredTeacherId,
            room || pickerSlot.preferredRoom
          );
        }}
      />
    </div>
  );
};
