import type { AttendanceRecord, AttendanceStatus, Student } from '@/types';
import type { AttendanceSession } from '@/capabilities/attendance';
import { StorageService } from '@/services/storage';
import { saveAttendanceWithPass } from '@/core/schedules/attendancePassAtomic';
import {
  DAY_ATTENDANCE_CLASS_ID,
  DAY_ATTENDANCE_CLASS_NAME,
} from '@/capabilities/attendance';
import { isDayAttendanceClassId } from '@/capabilities/attendance';

export {
  DAY_ATTENDANCE_CLASS_ID,
  DAY_ATTENDANCE_CLASS_NAME,
} from '@/capabilities/attendance';
export { todayIsoLocal, shiftDateIso } from '@/shared/utils/localDate';
export {
  getExpectedStudentsOnDate,
  formatExpectedScheduleLabel,
  type ExpectedStudentOnDate,
} from './pianoExpectedAttendance';

export type DayStatus = 'unchecked' | 'present' | 'absent' | 'late';
export type StatusFilter = 'ALL' | DayStatus;

export const STATUS_META: Record<
  DayStatus,
  { label: string; tone: string; button: string; active: string }
> = {
  unchecked: {
    label: '미등원',
    tone: 'bg-slate-100 text-slate-600',
    button: 'border-slate-200 text-slate-600 hover:bg-slate-50',
    active: 'bg-slate-700 text-white border-slate-700',
  },
  present: {
    label: '등원',
    tone: 'bg-emerald-50 text-emerald-700',
    button: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
    active: 'bg-emerald-600 text-white border-emerald-600',
  },
  absent: {
    label: '결석',
    tone: 'bg-rose-50 text-rose-700',
    button: 'border-rose-200 text-rose-700 hover:bg-rose-50',
    active: 'bg-rose-600 text-white border-rose-600',
  },
  late: {
    label: '지각',
    tone: 'bg-amber-50 text-amber-700',
    button: 'border-amber-200 text-amber-700 hover:bg-amber-50',
    active: 'bg-amber-500 text-white border-amber-500',
  },
};

export function resolveDayStatus(
  record: AttendanceRecord | undefined,
  checkedInViaPin: boolean
): DayStatus {
  if (record?.status === 'present') return 'present';
  if (record?.status === 'late') return 'late';
  if (record?.status === 'absent') return 'absent';
  if (checkedInViaPin) return 'present';
  return 'unchecked';
}

/** DAY_ATTENDANCE(c-default) 일자별 학생→기록 맵 */
export function buildDayAttendanceRecordMap(
  dateIso: string,
  records: AttendanceRecord[] = StorageService.getAttendance()
): Map<string, AttendanceRecord> {
  const map = new Map<string, AttendanceRecord>();
  for (const r of records) {
    if (r.date === dateIso && isDayAttendanceClassId(r.classId)) {
      map.set(r.studentId, r);
    }
  }
  return map;
}

/** 해당일 PIN 체크인 고객 ID 집합 */
export function buildPinCheckInIdSet(
  dateIso: string,
  sessions: AttendanceSession[] = StorageService.getAttendanceSessions()
): Set<string> {
  const set = new Set<string>();
  for (const s of sessions) {
    if (s.sessionDate === dateIso && s.checkInAt) set.add(s.customerId);
  }
  return set;
}

export type DayStatusCounts = {
  total: number;
  present: number;
  absent: number;
  late: number;
  unchecked: number;
};

export function countDayStatuses(statuses: Iterable<DayStatus>): DayStatusCounts {
  let present = 0;
  let absent = 0;
  let late = 0;
  let unchecked = 0;
  let total = 0;
  for (const status of statuses) {
    total += 1;
    if (status === 'present') present += 1;
    else if (status === 'absent') absent += 1;
    else if (status === 'late') late += 1;
    else unchecked += 1;
  }
  return { total, present, absent, late, unchecked };
}

export function toAttendanceStatus(status: Exclude<DayStatus, 'unchecked'>): AttendanceStatus {
  return status;
}

function syncDayCheckInSession(student: Student, date: string): void {
  const sessions = StorageService.getAttendanceSessions();
  const existing = sessions.find((s) => s.sessionDate === date && s.customerId === student.id);
  const now = new Date().toISOString();
  StorageService.saveAttendanceSession({
    id: existing?.id || crypto.randomUUID(),
    customerId: student.id,
    customerName: student.name,
    sessionDate: date,
    checkInAt: existing?.checkInAt || now,
    checkInMethod: existing?.checkInMethod || 'manual',
    memo: existing?.memo,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  });
}

export type PersistDayAttendanceResult =
  | { ok: true }
  | { ok: false; warning: string };

/** day attendance(DAY_ATTENDANCE) 기록 저장 — 등원/지각/결석 공통 */
export async function persistDayAttendance(params: {
  student: Student;
  date: string;
  status: Exclude<DayStatus, 'unchecked'>;
  createdBy: string;
  existing?: AttendanceRecord | null;
  memo?: string;
}): Promise<PersistDayAttendanceResult> {
  const { student, date, status, createdBy, memo } = params;
  const existing =
    params.existing ??
    StorageService.getAttendance().find(
      (r) =>
        r.date === date &&
        r.studentId === student.id &&
        isDayAttendanceClassId(r.classId)
    );

  const nextStatus = toAttendanceStatus(status);
  const result = await saveAttendanceWithPass({
    student,
    nextStatus,
    previous: existing || null,
    date,
    classId: DAY_ATTENDANCE_CLASS_ID,
    className: DAY_ATTENDANCE_CLASS_NAME,
    createdBy,
    memo: memo?.trim() || undefined,
    absentReason: status === 'absent' ? memo?.trim() || undefined : undefined,
  });
  if (!result.ok) {
    return { ok: false, warning: result.warning || '출결 저장에 실패했습니다.' };
  }

  if (status === 'present' || status === 'late') {
    syncDayCheckInSession(student, date);
  }

  return { ok: true };
}

/** 원장 홈 등원 1탭용 */
export async function markDayPresent(params: {
  student: Student;
  date: string;
  createdBy: string;
  existing?: AttendanceRecord | null;
}): Promise<PersistDayAttendanceResult> {
  return persistDayAttendance({
    ...params,
    status: 'present',
  });
}
