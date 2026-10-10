import { useMemo, type FC } from 'react';
import { Clock, Filter, Users, X } from 'lucide-react';
import { EmptyState, UnifiedScheduleCalendar, type CalendarEventItem } from '@/shared/components';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui';
import type { ClassItem } from '@/types';
import {
  PianoTimetableStudentPool,
  DND_STUDENT_MIME,
  type DragPlacementPayload,
} from './PianoTimetablePanels';
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
 * 피아노 수업 시간표 — 요일·시간대에 「누가 오는지」배치·이동.
 * ClassItem + student.classIds 재사용. 출결(DAY_ATTENDANCE)은 절대 변경하지 않음.
 * 30분 단위 기본 그리드(09:00~20:30) + 등록된 반의 시작시각(예: 21:00)을 행으로 확장.
 * 여러 요일 반은 표시만 되며 반 관리에서 수정.
 */
export const PianoLessonTimetableView: FC = () => {
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
    isScoped,
    teachers,
    students,
    visibleClasses,
    teacherSections,
    placedIds,
    placeStudent,
    movePlacement,
    handleDropStudent,
    handleRemove,
    openPickerForSlot,
    startPlaceStudent,
    placePending,
  } = usePianoLessonTimetable();

  const renderTimetable = (sectionClasses: ClassItem[], sectionTeacherId?: string) => {
    if (useDragGrid) {
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
              endTime: slotEndTime(slot),
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
          availableViews={['week', 'day']}
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
          onExternalDrop={(e, target) => {
            if (!target.dayOfWeek) return;
            const studentId =
              e.dataTransfer.getData(DND_STUDENT_MIME) || e.dataTransfer.getData('text/plain');
            if (studentId) {
              const student = students.find((s) => s.id === studentId);
              if (student) placeStudent(student, target.dayOfWeek, target.startTime, sectionTeacherId);
            }
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
              openPickerForSlot(slot.dayOfWeek, slot.startTime, sectionTeacherId);
            }
          }}
        />
      );
    }

    return (
      <PianoTimetableMobileList
        selectedDay={selectedDay}
        todayDay={todayDay}
        classes={sectionClasses}
        students={students}
        pendingStudentId={pendingStudentId}
        onSelectDay={setSelectedDay}
        onPickSlotForAdd={(day, startTime) => openPickerForSlot(day, startTime, sectionTeacherId)}
        onPlacePending={(day, startTime) => placePending(day, startTime, sectionTeacherId)}
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
      />
    );
  }

  return (
    <div className="space-y-4 pb-2">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-3 py-2.5 flex items-start gap-2">
        <Clock className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
        <p className="text-xs text-indigo-900 leading-relaxed">
          시간표는 <strong className="font-bold">누가 언제 오는지</strong>를 정합니다. 실제로
          왔는지는 <strong className="font-bold">출결</strong>에서 따로 기록합니다. 그리드는{' '}
          <strong className="font-bold">30분 단위</strong>(15:00, 15:30…)이며, 여러 요일에 걸친 반은
          표시만 되고 편집은 「반 관리」에서 하세요.
          {pendingStudentId
            ? ' 선택한 학생을 시간대에 놓으면 그 시각의 반에 배정됩니다(새 시각이면 확인 후 반이 만들어질 수 있습니다).'
            : useDragGrid
              ? ' PC에서는 학생을 드래그해 시간대에 놓거나 칸 안에서 이동하세요.'
              : ' 「학생 추가」또는 학생을 탭한 뒤 시간대를 선택하세요.'}
        </p>
      </div>

      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span>보기</span>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-500">
          <button
            type="button"
            onClick={() => setLayoutMode('week')}
            className={`px-3 py-1.5 min-h-[40px] rounded-lg transition-all ${
              layoutMode === 'week' ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            전체
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('byTeacher')}
            className={`px-3 py-1.5 min-h-[40px] rounded-lg transition-all ${
              layoutMode === 'byTeacher'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            선생님별
          </button>
        </div>

        {!isScoped && (
          <select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            className={`${FORM_CONTROL_CLASS} !min-h-[40px] !py-2 !text-xs w-auto min-w-[9rem]`}
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

        <span className="text-xs text-slate-500 font-semibold tabular-nums ml-auto">
          반 {visibleClasses.length}
          {layoutMode === 'byTeacher' ? ` · 선생님 ${teacherSections.length}` : ''}
        </span>
      </div>

      {useDragGrid && (
        <PianoTimetableStudentPool
          students={students}
          placedIds={placedIds}
          highlightStudentId={pendingStudentId}
        />
      )}

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
      ) : (
        renderTimetable(visibleClasses)
      )}

      <PianoTimetableStudentPicker
        isOpen={!!pickerSlot}
        title="학생 선택"
        subtitle={
          pickerSlot ? `${pickerSlot.day}요일 ${pickerSlot.startTime}에 배치` : undefined
        }
        students={students}
        searchQuery={pickerQuery}
        onSearchChange={setPickerQuery}
        excludeIds={pickerExcludeIds}
        onClose={() => setPickerSlot(null)}
        onSelect={(student) => {
          if (!pickerSlot) return;
          placeStudent(
            student,
            pickerSlot.day,
            pickerSlot.startTime,
            pickerSlot.preferredTeacherId
          );
        }}
      />
    </div>
  );
};
