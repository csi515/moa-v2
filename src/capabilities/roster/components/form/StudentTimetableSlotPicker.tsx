import React, { useState, useMemo } from 'react';
import { Calendar, Check, User } from 'lucide-react';

export type SlotDayOfWeek = '월' | '화' | '수' | '목' | '금' | '토' | '일';

export interface SlotClassItem {
  id: string;
  name: string;
  daysOfWeek?: SlotDayOfWeek[];
  startTime?: string;
  endTime?: string;
  capacity?: number;
  teacherId?: string;
  teacherName?: string;
  room?: string;
}

export interface SlotStudent {
  id: string;
  name?: string;
  status?: string;
  classIds?: string[];
}

export interface ClassSlotWithCapacity {
  classItem: SlotClassItem;
  assignedCount: number;
  capacity: number;
  remaining: number;
  isFull: boolean;
  isAlmostFull: boolean;
}

export function computeClassCapacities(
  classes: SlotClassItem[],
  students: SlotStudent[]
): ClassSlotWithCapacity[] {
  const activeStudents = students.filter((s) => s.status === 'active');

  return classes.map((cls) => {
    const assignedCount = activeStudents.filter(
      (s) => Array.isArray(s.classIds) && s.classIds.includes(cls.id)
    ).length;
    const capacity = cls.capacity && cls.capacity > 0 ? cls.capacity : 4;
    const remaining = Math.max(0, capacity - assignedCount);
    const isFull = assignedCount >= capacity;
    const isAlmostFull = !isFull && remaining === 1;

    return {
      classItem: cls,
      assignedCount,
      capacity,
      remaining,
      isFull,
      isAlmostFull,
    };
  });
}

interface StudentTimetableSlotPickerProps {
  classes: SlotClassItem[];
  selectedClassIds: string[];
  onChange: (classIds: string[], teacherId?: string) => void;
  students?: SlotStudent[];
  serviceLabel?: string;
  staffLabel?: string;
  currentStudentId?: string;
}

const WEEKDAYS: Array<{ value: 'ALL' | SlotDayOfWeek; label: string }> = [
  { value: 'ALL', label: '전체 요일' },
  { value: '월', label: '월' },
  { value: '화', label: '화' },
  { value: '수', label: '수' },
  { value: '목', label: '목' },
  { value: '금', label: '금' },
  { value: '토', label: '토' },
];

export const StudentTimetableSlotPicker: React.FC<StudentTimetableSlotPickerProps> = ({
  classes,
  selectedClassIds,
  onChange,
  students: propStudents = [],
  serviceLabel = '수업',
  staffLabel = '선생님',
  currentStudentId,
}) => {
  const [dayFilter, setDayFilter] = useState<'ALL' | SlotDayOfWeek>('ALL');

  // 학생 목록 (현재 수정 중인 학생 본인은 인원 계산에서 제외)
  const students = useMemo(() => {
    if (!currentStudentId) return propStudents;
    return propStudents.filter((s) => s.id !== currentStudentId);
  }, [propStudents, currentStudentId]);

  // 각 반별 실시간 잔여석 계산
  const classCapacities = useMemo(() => {
    return computeClassCapacities(classes, students);
  }, [classes, students]);

  // 요일 필터링 및 시간순 정렬
  const filteredSlots = useMemo(() => {
    return classCapacities
      .filter(({ classItem }) => {
        if (dayFilter === 'ALL') return true;
        return classItem.daysOfWeek?.includes(dayFilter);
      })
      .sort((a, b) => {
        const timeA = a.classItem.startTime || '99:99';
        const timeB = b.classItem.startTime || '99:99';
        const tDiff = timeA.localeCompare(timeB);
        if (tDiff !== 0) return tDiff;
        return (a.classItem.name || '').localeCompare(b.classItem.name || '', 'ko');
      });
  }, [classCapacities, dayFilter]);

  const handleToggle = (cls: SlotClassItem) => {
    const isSelected = selectedClassIds.includes(cls.id);
    let nextIds: string[];
    if (isSelected) {
      nextIds = selectedClassIds.filter((id) => id !== cls.id);
    } else {
      nextIds = [...selectedClassIds, cls.id];
    }
    // 담당 강사가 지정되어 있으면 자동 제안
    onChange(nextIds, cls.teacherId || undefined);
  };

  if (classes.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
        등록된 {serviceLabel} 시간표가 없습니다. [설정 &gt; {serviceLabel} 관리]에서 시간표를 먼저 추가해 주세요.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 요일 필터 바 */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
        {WEEKDAYS.map((day) => {
          const isActive = dayFilter === day.value;
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => setDayFilter(day.value)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 min-h-[36px] ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {day.label}
            </button>
          );
        })}
      </div>

      {/* 시간대별 반 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
        {filteredSlots.length === 0 ? (
          <div className="col-span-full py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
            해당 요일에 배정 가능한 {serviceLabel}이 없습니다.
          </div>
        ) : (
          filteredSlots.map(({ classItem, assignedCount, capacity, remaining, isFull, isAlmostFull }) => {
            const isSelected = selectedClassIds.includes(classItem.id);
            const daysText = classItem.daysOfWeek?.join('·') || '요일미정';
            const timeText = classItem.startTime
              ? classItem.endTime
                ? `${classItem.startTime}~${classItem.endTime}`
                : classItem.startTime
              : '시간미정';

            return (
              <button
                key={classItem.id}
                type="button"
                onClick={() => handleToggle(classItem)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between relative cursor-pointer min-h-[72px] ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs'
                    : isFull
                      ? 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 text-slate-500'
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      <Calendar className="w-3 h-3 text-indigo-500" />
                      {daysText} {timeText}
                    </span>

                    {/* 잔여석 배지 */}
                    {isFull ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                        마감 ({assignedCount}/{capacity}명)
                      </span>
                    ) : isAlmostFull ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        1자리 남음 ({assignedCount}/{capacity}명)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {remaining}자리 여유 ({assignedCount}/{capacity}명)
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-bold text-slate-900 truncate">
                    {classItem.name}
                  </p>

                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                    {classItem.teacherName && (
                      <span className="inline-flex items-center gap-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        {classItem.teacherName} {staffLabel}
                      </span>
                    )}
                    {classItem.room && <span>· {classItem.room}</span>}
                  </div>
                </div>

                {/* 선택 체크마크 */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* 선택된 수업 요약 */}
      {selectedClassIds.length > 0 && (
        <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between text-xs">
          <span className="font-semibold text-indigo-900">
            총 {selectedClassIds.length}개 {serviceLabel} 시간표 선택됨
          </span>
          <span className="text-[11px] text-indigo-600 font-bold">
            저장 시 시간표에 즉시 자동 배정됩니다.
          </span>
        </div>
      )}
    </div>
  );
};
