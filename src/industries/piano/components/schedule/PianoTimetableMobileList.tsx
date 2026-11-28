import { useState, useMemo, type FC } from 'react';
import { MoveRight, Plus, X } from 'lucide-react';
import type { ClassItem } from '@/types/classItem';
import type { DayOfWeek } from '@/core/staff/workWindow';
import type { Student } from '@/types/customer';
import {
  TIMETABLE_DAYS,
  getPlacementsForSlot,
  resolveTimetableSlots,
  type SlotPlacement,
  type TimetableSlot,
} from './pianoTimetablePlacement';

interface PianoTimetableMobileListProps {
  selectedDay: DayOfWeek;
  todayDay: DayOfWeek | null;
  classes: ClassItem[];
  students: Student[];
  pendingStudentId: string | null;
  /** 상위 요일 탭이 있으면 중복 요일 바 숨김 */
  hideDayTabs?: boolean;
  /** 빈 시간대 압축(얇은 슬롯) */
  collapseEmptySlots?: boolean;
  onSelectDay: (day: DayOfWeek) => void;
  onPickSlotForAdd: (day: DayOfWeek, startTime: TimetableSlot) => void;
  onPlacePending: (day: DayOfWeek, startTime: TimetableSlot) => void;
  onRemove: (placement: SlotPlacement, day: DayOfWeek, startTime: TimetableSlot) => void;
  onStartPlaceStudent: (student: Student) => void;
  onOpenMoveModal?: (placement: SlotPlacement) => void;
}

/** 모바일/태블릿 — 단일 타임라인(빈 슬롯 압축) */
export const PianoTimetableMobileList: FC<PianoTimetableMobileListProps> = ({
  selectedDay,
  todayDay,
  classes,
  students,
  pendingStudentId,
  hideDayTabs = false,
  collapseEmptySlots = true,
  onSelectDay,
  onPickSlotForAdd,
  onPlacePending,
  onRemove,
  onStartPlaceStudent,
  onOpenMoveModal,
}) => {
  const pending = students.find((s) => s.id === pendingStudentId);
  const slots = resolveTimetableSlots(classes);

  return (
    <div className="space-y-3 min-w-0 w-full overflow-x-clip pb-[env(safe-area-inset-bottom)]">
      {!hideDayTabs && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar min-w-0">
          {TIMETABLE_DAYS.map((day) => {
            const count = slots.reduce(
              (n, slot) => n + getPlacementsForSlot(students, classes, day, slot).length,
              0
            );
            const selected = selectedDay === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelectDay(day)}
                className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 min-h-[44px] ${
                  selected
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                {day}요일
                {day === todayDay && (
                  <span className={`ml-1 text-[10px] ${selected ? 'text-slate-200' : 'text-slate-800'}`}>
                    오늘
                  </span>
                )}
                <span
                  className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                    selected ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {pending && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800">
          {pending.name} 학생을 배치할 시간대를 탭하세요
        </div>
      )}

      <ul className="space-y-1.5">
        {slots.map((slot) => {
          const placements = getPlacementsForSlot(students, classes, selectedDay, slot);
          const isEmpty = placements.length === 0;

          if (isEmpty && collapseEmptySlots) {
            return (
              <li key={slot}>
                <button
                  type="button"
                  onClick={() =>
                    pendingStudentId
                      ? onPlacePending(selectedDay, slot)
                      : onPickSlotForAdd(selectedDay, slot)
                  }
                  className="w-full h-10 px-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 text-left flex items-center justify-between gap-2 hover:bg-slate-100 cursor-pointer"
                >
                  <span className="font-mono text-xs font-bold text-slate-500 tabular-nums">{slot}</span>
                  <span className="text-[11px] font-semibold text-slate-400 inline-flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    빈 시간 · 탭하여 등록
                  </span>
                </button>
              </li>
            );
          }

          return (
            <li
              key={slot}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/60">
                <span className="font-mono text-sm font-bold text-slate-700 tabular-nums">{slot}</span>
                <button
                  type="button"
                  onClick={() =>
                    pendingStudentId
                      ? onPlacePending(selectedDay, slot)
                      : onPickSlotForAdd(selectedDay, slot)
                  }
                  className="inline-flex items-center gap-1 px-3 py-2 min-h-[40px] rounded-xl bg-slate-900 text-white text-[11px] font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {pendingStudentId ? '여기에 배치' : '학생 추가'}
                </button>
              </div>
              {isEmpty ? (
                <p className="px-3 py-3 text-xs text-slate-400 text-center">비어 있는 시간대</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {placements.map((p) => (
                    <li
                      key={`${p.student.id}-${p.classItem.id}`}
                      className="flex items-center gap-2 px-3 py-2 min-h-[48px]"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!p.editable) return;
                          if (onOpenMoveModal) {
                            onOpenMoveModal(p);
                          } else {
                            onStartPlaceStudent(p.student);
                          }
                        }}
                        className="flex-1 text-left min-w-0 group"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {p.classItem.teacherName || '담당'}
                          </span>
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {p.student.name}
                          </p>
                          {p.classItem.room ? (
                            <span className="text-[10px] text-slate-500 truncate">{p.classItem.room}</span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {slot}
                          {p.editable ? ' · 탭하여 이동' : ' · 반 소속'}
                        </p>
                      </button>
                      {p.editable && (
                        <button
                          type="button"
                          onClick={() => onRemove(p, selectedDay, slot)}
                          className="p-2 min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="배치 제거"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
