import type { DragEvent, FC } from 'react';
import { X } from 'lucide-react';
import type { ClassItem, DayOfWeek, Student } from '@/types';
import {
  TIMETABLE_DAYS,
  getPlacementsForSlot,
  resolveTimetableSlots,
  type SlotPlacement,
  type TimetableSlot,
} from './pianoTimetablePlacement';

export const DND_STUDENT_MIME = 'application/x-moa-student-id';
export const DND_PLACEMENT_MIME = 'application/x-moa-placement';

export type DragPlacementPayload = {
  studentId: string;
  day: DayOfWeek;
  startTime: string;
  classId: string;
};

interface PianoTimetableDesktopGridProps {
  todayDay: DayOfWeek | null;
  classes: ClassItem[];
  students: Student[];
  onDropStudent: (studentId: string, day: DayOfWeek, startTime: TimetableSlot) => void;
  onDropPlacement: (payload: DragPlacementPayload, day: DayOfWeek, startTime: TimetableSlot) => void;
  onRemove: (placement: SlotPlacement, day: DayOfWeek, startTime: TimetableSlot) => void;
}

function parsePlacement(raw: string): DragPlacementPayload | null {
  try {
    const data = JSON.parse(raw) as DragPlacementPayload;
    if (!data?.studentId || !data?.day || !data?.startTime || !data?.classId) return null;
    return data;
  } catch {
    return null;
  }
}

/** PC 주간 그리드 — 드래그앤드롭으로 학생 배치 */
export const PianoTimetableDesktopGrid: FC<PianoTimetableDesktopGridProps> = ({
  todayDay,
  classes,
  students,
  onDropStudent,
  onDropPlacement,
  onRemove,
}) => {
  const slots = resolveTimetableSlots(classes);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: DragEvent, day: DayOfWeek, startTime: TimetableSlot) => {
    e.preventDefault();
    const placementRaw = e.dataTransfer.getData(DND_PLACEMENT_MIME);
    if (placementRaw) {
      const payload = parsePlacement(placementRaw);
      if (payload) onDropPlacement(payload, day, startTime);
      return;
    }
    const studentId = e.dataTransfer.getData(DND_STUDENT_MIME) || e.dataTransfer.getData('text/plain');
    if (studentId) onDropStudent(studentId, day, startTime);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-700">
            <div className="py-2.5 px-2 border-r border-slate-200 text-slate-400">시간</div>
            {TIMETABLE_DAYS.map((day) => (
              <div
                key={day}
                className={`py-2.5 px-2 border-r border-slate-200 last:border-r-0 ${
                  day === todayDay ? 'bg-indigo-50 text-indigo-700' : ''
                }`}
              >
                {day}요일
              </div>
            ))}
          </div>

          <div className="divide-y divide-slate-200">
            {slots.map((slot) => (
              <div key={slot} className="grid grid-cols-7 min-h-[56px]">
                <div className="p-1.5 border-r border-slate-200 bg-slate-50/50 flex justify-center items-start pt-2">
                  <span
                    className={`font-mono text-[11px] font-bold ${
                      slot.endsWith(':30') ? 'text-slate-500' : 'text-slate-700'
                    }`}
                  >
                    {slot}
                  </span>
                </div>
                {TIMETABLE_DAYS.map((day) => {
                  const placements = getPlacementsForSlot(students, classes, day, slot);
                  return (
                    <div
                      key={day}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day, slot)}
                      className={`p-1 border-r border-slate-200 last:border-r-0 space-y-1 min-h-[56px] ${
                        day === todayDay ? 'bg-indigo-50/25' : ''
                      } hover:bg-indigo-50/40 transition-colors`}
                    >
                      {placements.length === 0 ? (
                        <div className="h-full min-h-[56px] rounded-lg border border-dashed border-slate-200/80 flex items-center justify-center">
                          <span className="text-[10px] text-slate-300 font-semibold">비어 있음</span>
                        </div>
                      ) : (
                        placements.map((p) => (
                          <div
                            key={`${p.student.id}-${p.classItem.id}`}
                            draggable={p.editable}
                            onDragStart={(e) => {
                              if (!p.editable) {
                                e.preventDefault();
                                return;
                              }
                              const payload: DragPlacementPayload = {
                                studentId: p.student.id,
                                day,
                                startTime: p.classItem.startTime || slot,
                                classId: p.classItem.id,
                              };
                              e.dataTransfer.setData(DND_PLACEMENT_MIME, JSON.stringify(payload));
                              e.dataTransfer.setData(DND_STUDENT_MIME, p.student.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            className={`group rounded-lg px-1.5 py-1 text-left text-white shadow-2xs ${
                              p.editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default opacity-95'
                            }`}
                            style={{ backgroundColor: p.classItem.color || '#4f46e5' }}
                            title={
                              p.editable
                                ? '드래그하여 다른 시간대로 이동'
                                : '여러 요일·슬롯과 다른 시작 시각 — 반 관리에서 수정'
                            }
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold truncate">{p.student.name}</p>
                                <p className="text-[10px] text-white/85 truncate">
                                  {p.classItem.teacherName}
                                  {!p.editable ? ' · 반' : ''}
                                </p>
                              </div>
                              {p.editable && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(p, day, slot);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded bg-black/20 hover:bg-black/35 shrink-0"
                                  aria-label={`${p.student.name} 배치 제거`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StudentPoolProps {
  students: Student[];
  placedIds: Set<string>;
  /** 등록 직후 배치 대기 학생 — 목록에서 강조 */
  highlightStudentId?: string | null;
}

/** 미배치·전체 학생 드래그 소스 */
export const PianoTimetableStudentPool: FC<StudentPoolProps> = ({
  students,
  placedIds,
  highlightStudentId,
}) => {
  const unplaced = students.filter((s) => !placedIds.has(s.id));
  const list = unplaced.length > 0 ? unplaced : students;
  const ordered = highlightStudentId
    ? [...list].sort((a, b) => {
        if (a.id === highlightStudentId) return -1;
        if (b.id === highlightStudentId) return 1;
        return a.name.localeCompare(b.name, 'ko');
      })
    : list;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-slate-800">학생 목록</h3>
        <span className="text-[10px] font-semibold text-slate-400">
          {unplaced.length > 0 ? `미배치 ${unplaced.length}` : `전체 ${students.length}`}
        </span>
      </div>
      <p className="text-[10px] text-slate-400">
        {highlightStudentId
          ? '강조된 학생을 드래그하여 시간표 칸에 놓으세요'
          : '드래그하여 시간표 칸에 놓으세요'}
      </p>
      <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
        {ordered.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">등록된 학생이 없습니다</p>
        ) : (
          ordered.map((s) => {
            const highlighted = s.id === highlightStudentId;
            return (
              <div
                key={s.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DND_STUDENT_MIME, s.id);
                  e.dataTransfer.setData('text/plain', s.id);
                  e.dataTransfer.effectAllowed = 'copyMove';
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-grab active:cursor-grabbing border ${
                  highlighted
                    ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200'
                    : 'bg-slate-100 text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                {s.name}
                {highlighted ? ' · 배치 대기' : ''}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
