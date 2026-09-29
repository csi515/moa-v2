/**
 * 보강 일정 원자 클라이언트.
 * 온라인: core.schedule_makeup (강사·연습실 충돌 + room_reservations EXCLUDE)
 * demo/offline: 로컬 scheduleMakeup
 */
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { getOrganizationId, getStorageAdapter, STORAGE_KEYS } from '@/services/adapters';
import { StorageService } from '@/services/storage';
import type { AttendanceRecord, MakeupScheduleInput } from '@/types';
import { mapMakeupScheduleError } from './makeupScheduleErrors';

export { mapMakeupScheduleError } from './makeupScheduleErrors';

export type ScheduleMakeupAtomicInput = {
  attendanceId: string;
  makeup: MakeupScheduleInput;
};

export type ScheduleMakeupAtomicResult = {
  ok: boolean;
  record?: AttendanceRecord;
  warning?: string;
};

function writeAttendanceMirror(record: AttendanceRecord): void {
  const adapter = getStorageAdapter();
  const list = adapter.getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
  const idx = list.findIndex((r) => r.id === record.id);
  const next = list.slice();
  if (idx >= 0) next[idx] = { ...list[idx], ...record };
  else next.unshift(record);
  if (adapter.writeLocalMirror) adapter.writeLocalMirror(STORAGE_KEYS.ATTENDANCE, next);
  else StorageService.saveAttendanceRecord(record);
}

function scheduleMakeupLocally(input: ScheduleMakeupAtomicInput): ScheduleMakeupAtomicResult {
  const record = StorageService.scheduleMakeup(input.attendanceId, input.makeup);
  if (!record) {
    return { ok: false, warning: '결석 기록을 찾을 수 없습니다.' };
  }
  return { ok: true, record };
}

export async function scheduleMakeupAtomic(
  input: ScheduleMakeupAtomicInput
): Promise<ScheduleMakeupAtomicResult> {
  const orgId = getOrganizationId();
  const useRpc = Boolean(isSupabaseConfigured() && orgId);

  if (!useRpc) {
    return scheduleMakeupLocally(input);
  }

  const client = getCoreClient();
  const { error } = await client.rpc('schedule_makeup' as never, {
    p_organization_id: orgId,
    p_attendance_id: input.attendanceId,
    p_makeup_date: input.makeup.date,
    p_start_time: input.makeup.startTime || null,
    p_end_time: input.makeup.endTime || null,
    p_room: input.makeup.room || null,
    p_teacher_id: input.makeup.teacherId || null,
    p_teacher_name: input.makeup.teacherName || null,
  } as never);

  if (error) {
    return { ok: false, warning: mapMakeupScheduleError(error.message || '') };
  }

  const current = StorageService.getAttendance().find((r) => r.id === input.attendanceId);
  const record: AttendanceRecord = {
    id: input.attendanceId,
    date: current?.date || input.makeup.date,
    studentId: current?.studentId || '',
    studentName: current?.studentName || '',
    classId: current?.classId || '',
    className: current?.className || '',
    status: current?.status || 'absent',
    absentReason: current?.absentReason,
    memo: current?.memo,
    createdBy: current?.createdBy || '',
    createdAt: current?.createdAt,
    sessionPassId: current?.sessionPassId,
    makeUpRequired: true,
    makeUpDate: input.makeup.date,
    makeUpStartTime: input.makeup.startTime,
    makeUpEndTime: input.makeup.endTime,
    makeUpRoom: input.makeup.room,
    makeUpTeacherId: input.makeup.teacherId,
    makeUpTeacherName: input.makeup.teacherName,
  };

  writeAttendanceMirror(record);
  return { ok: true, record };
}
