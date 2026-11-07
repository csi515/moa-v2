import type { DayOfWeek } from '@/core/staff/workWindow';

export interface MoveSlotOption {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  currentCount: number;
  maxCapacity: number;
  isFull: boolean;
  isCurrent: boolean;
  teacherName?: string;
  roomName?: string;
  classId?: string;
}

export interface StudentLike {
  id: string;
  name: string;
  classIds?: string[];
}

export interface ClassItemLike {
  id: string;
  name: string;
  teacherId?: string;
  teacherName?: string;
  daysOfWeek?: DayOfWeek[];
  startTime?: string;
  endTime?: string;
  capacity?: number;
  room?: string;
  color?: string;
}

export const TIMETABLE_HOURS = [
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
] as const;

/**
 * 특정 요일에 이동 가능한 수업 슬롯 목록을 산출합니다.
 */
export function resolveAvailableMoveSlots(params: {
  classes: ClassItemLike[];
  students: StudentLike[];
  targetDay: DayOfWeek;
  currentDay?: DayOfWeek;
  currentStartTime?: string;
  currentStudentId?: string;
  defaultCapacity?: number;
}): MoveSlotOption[] {
  const {
    classes,
    students,
    targetDay,
    currentDay,
    currentStartTime,
    currentStudentId,
    defaultCapacity = 4,
  } = params;

  // 1. 해당 요일에 존재하는 클래스들
  const dayClasses = classes.filter((c) => {
    if (Array.isArray(c.daysOfWeek)) return c.daysOfWeek.includes(targetDay);
    if ((c as any).days) return (c as any).days.includes(targetDay);
    return false;
  });

  // 요일에 등록된 클래스들의 고유 시작 시간 또는 기본 시간대 목록
  const timeSet = new Set<string>();
  for (const c of dayClasses) {
    if (c.startTime) timeSet.add(c.startTime);
  }
  for (const h of TIMETABLE_HOURS) {
    timeSet.add(h);
  }

  const sortedTimes = Array.from(timeSet).sort();

  return sortedTimes.map((startTime) => {
    // 해당 시작 시간과 매칭되는 클래스 찾기
    const matchedClass = dayClasses.find((c) => c.startTime === startTime);
    const capacity = matchedClass?.capacity || defaultCapacity;

    // 해당 슬롯에 배정된 학생 수 계산
    const enrolledStudents = students.filter((s) => {
      if (matchedClass) {
        return s.classIds?.includes(matchedClass.id);
      }
      return false;
    });

    const isCurrent =
      Boolean(currentDay && currentStartTime) &&
      currentDay === targetDay &&
      currentStartTime === startTime;

    // 현재 본인은 카운트에서 제외하여 이동 시 잔여석 계산
    const effectiveCount = enrolledStudents.filter(
      (s) => s.id !== currentStudentId
    ).length;

    const isFull = effectiveCount >= capacity;

    return {
      day: targetDay,
      startTime,
      endTime: matchedClass?.endTime || addOneHour(startTime),
      currentCount: effectiveCount,
      maxCapacity: capacity,
      isFull,
      isCurrent,
      teacherName: matchedClass?.teacherName,
      roomName: matchedClass?.room,
      classId: matchedClass?.id,
    };
  });
}

function addOneHour(timeStr: string): string {
  const [h, m] = timeStr.split(':').map((n) => parseInt(n, 10) || 0);
  const nextH = Math.min(23, h + 1);
  return `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 이동 확인 메시지를 생성합니다.
 */
export function formatMoveConfirmationMessage(
  studentName: string,
  fromDay: string,
  fromTime: string,
  toDay: string,
  toTime: string
): string {
  return `${studentName} 학생을 [${fromDay}요일 ${fromTime}]에서 [${toDay}요일 ${toTime}](으)로 이동하시겠습니까?`;
}
