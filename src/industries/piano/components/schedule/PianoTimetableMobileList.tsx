import type { FC } from 'react';
import { Plus, X } from 'lucide-react';
import type { ClassItem, DayOfWeek, Student } from '@/types';
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
  onSelectDay: (day: DayOfWeek) => void;
  onPickSlotForAdd: (day: DayOfWeek, startTime: TimetableSlot) => void;
  onPlacePending: (day: DayOfWeek, startTime: TimetableSlot) => void;
  onRemove: (placement: SlotPlacement, day: DayOfWeek, startTime: TimetableSlot) => void;
  onStartPlaceStudent: (student: Student) => void;
}

/** 모바일/태블릿 — 요일 카드 + 탭으로 배치 */
export const PianoTimetableMobileList: FC<PianoTimetableMobileListProps> = ({
  selectedDay,
  todayDay,
  classes,
  students,
  pendingStudentId,
  onSelectDay,
  onPickSlotForAdd,
  onPlacePending,
  onRemove,
  onStartPlaceStudent,
}) => {
  const pending = students.find((s) => s.id === pendingStudentId);
  const slots = resolveTimetableSlots(classes);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
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
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              {day}요일
              {day === todayDay && (
                <span className={`ml-1 text-[10px] ${selected ? 'text-indigo-100' : 'text-indigo-600'}`}>
                  오늘
                </span>
              )}
              <span
                className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  selected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {pending && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs font-bold text-indigo-800">
          {pending.name} 학생을 배치할 시간대를 탭하세요
        </div>
      )}

      <ul className="space-y-2">
        {slots.map((slot) => {
          const placements = getPlacementsForSlot(students, classes, selectedDay, slot);
          return (
            <li
              key={slot}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-100 bg-slate-50/60">
                <span className="font-mono text-sm font-bold text-indigo-700">{slot}</span>
                <button
                  type="button"
                  onClick={() =>
                    pendingStudentId
                      ? onPlacePending(selectedDay, slot)
                      : onPickSlotForAdd(selectedDay, slot)
                  }
                  className="inline-flex items-center gap-1 px-3 py-2 min-h-[44px] rounded-xl bg-indigo-600 text-white text-[11px] font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {pendingStudentId ? '여기에 배치' : '학생 추가'}
                </button>
              </div>
              {placements.length === 0 ? (
                <p className="px-3 py-4 text-xs text-slate-400 text-center">비어 있는 시간대</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {placements.map((p) => (
                    <li
                      key={`${p.student.id}-${p.classItem.id}`}
                      className="flex items-center gap-2 px-3 py-2.5 min-h-[52px]"
                    >
                      <button
                        type="button"
                        onClick={() => p.editable && onStartPlaceStudent(p.student)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm font-bold text-slate-900 truncate">{p.student.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {p.classItem.teacherName}
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
