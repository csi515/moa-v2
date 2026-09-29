/** 등원(일자) 출결 — 레슨(classId) 출결과 구분하는 sentinel */
export const DAY_ATTENDANCE_CLASS_ID = 'c-default';
export const DAY_ATTENDANCE_CLASS_NAME = '학원 등원';

export type DayAttendanceRow = {
  date: string;
  status: string;
  studentId?: string;
  classId?: string;
};

/**
 * 학생당 오늘 출결 1건 — 등원(c-default) 우선, 없으면 상태 우선순위.
 * 대시보드 등원/레슨 이중 카운트 방지용.
 */
export function pickUniqueDayAttendanceStatuses(todayAttendance: DayAttendanceRow[]): {
  present: number;
  absent: number;
  late: number;
} {
  const rank: Record<string, number> = {
    present: 4,
    make_up: 4,
    late: 3,
    early_leave: 3,
    absent: 1,
  };
  const byStudent = new Map<string, DayAttendanceRow>();

  for (const record of todayAttendance) {
    const key = record.studentId || `__anon_${byStudent.size}`;
    const existing = byStudent.get(key);
    if (!existing) {
      byStudent.set(key, record);
      continue;
    }
    const preferDay =
      record.classId === DAY_ATTENDANCE_CLASS_ID &&
      existing.classId !== DAY_ATTENDANCE_CLASS_ID;
    if (preferDay) {
      byStudent.set(key, record);
      continue;
    }
    if (
      existing.classId === DAY_ATTENDANCE_CLASS_ID &&
      record.classId !== DAY_ATTENDANCE_CLASS_ID
    ) {
      continue;
    }
    if ((rank[record.status] || 0) > (rank[existing.status] || 0)) {
      byStudent.set(key, record);
    }
  }

  let present = 0;
  let absent = 0;
  let late = 0;
  for (const record of byStudent.values()) {
    if (record.status === 'present' || record.status === 'make_up') present += 1;
    else if (record.status === 'absent') absent += 1;
    else if (record.status === 'late' || record.status === 'early_leave') late += 1;
  }
  return { present, absent, late };
}
