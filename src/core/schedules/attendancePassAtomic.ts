/**
 * Piano 수업 출석 + 이용권 원자 클라이언트.
 * 온라인: piano.update_attendance_status_with_pass → core.apply_attendance_session_pass
 * Attendance SoT는 piano.attendance. PIN 체크인(attendance_sessions)과 미러하지 않는다.
 * demo/offline: lessonPass 규칙 + local save (트랜잭션 없음)
 */
import { getCoreClient, getPianoClient, isSupabaseConfigured } from '@/lib/supabase';
import { getOrganizationId, getStorageAdapter, STORAGE_KEYS } from '@/services/adapters';
import { StorageService } from '@/services/storage';
import { isSessionPassBillingStudent } from '@/core/academy/utils/billingMode';
import type { AttendanceRecord, AttendanceStatus, Student } from '@/types';
import type { SessionPass } from '@/core/types/schedule';
import { sessionPassService } from './sessionPassService';
import { planAttendancePassChange } from './attendancePassPlan';
import { rowToSessionPass } from '@/services/adapters/sync/sessionPassMappers';
import { mergeSessionPasses } from './bookingPassAtomicMirror';

export type SaveAttendanceWithPassInput = {
  student: Student;
  nextStatus: AttendanceStatus;
  previous?: Pick<AttendanceRecord, 'id' | 'status' | 'sessionPassId'> | null;
  date: string;
  classId: string;
  className: string;
  createdBy: string;
  memo?: string;
  absentReason?: string;
};

export type SaveAttendanceWithPassResult = {
  ok: boolean;
  record?: AttendanceRecord;
  sessionPassId?: string;
  warning?: string;
};

function writeAttendanceMirror(record: AttendanceRecord): void {
  const adapter = getStorageAdapter();
  const list = adapter.getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
  const idx = list.findIndex((r) => r.id === record.id);
  const next = list.slice();
  if (idx >= 0) next[idx] = record;
  else next.unshift(record);
  if (adapter.writeLocalMirror) adapter.writeLocalMirror(STORAGE_KEYS.ATTENDANCE, next);
  else StorageService.saveAttendanceRecord(record);
}

async function refreshPassMirror(orgId: string, passIds: string[]): Promise<void> {
  const ids = passIds.filter(Boolean);
  if (ids.length === 0) return;
  try {
    const client = getCoreClient();
    const adapter = getStorageAdapter();
    const { data, error } = await client
      .from('session_passes' as never)
      .select('*')
      .eq('organization_id', orgId)
      .in('id', ids);
    if (error || !Array.isArray(data)) return;
    const incoming = data.map((row) =>
      rowToSessionPass(row as Parameters<typeof rowToSessionPass>[0])
    );
    const current = adapter.getItem<SessionPass[]>(STORAGE_KEYS.SESSION_PASSES, []);
    if (adapter.writeLocalMirror) {
      adapter.writeLocalMirror(STORAGE_KEYS.SESSION_PASSES, mergeSessionPasses(current, incoming));
    }
  } catch {
    /* best-effort */
  }
}

function saveAttendanceLocally(input: SaveAttendanceWithPassInput): SaveAttendanceWithPassResult {
  const applyPass = isSessionPassBillingStudent(input.student);
  const siblings = StorageService.getAttendance()
    .filter((r) => r.studentId === input.student.id && r.date === input.date)
    .map((r) => ({ id: r.id, status: r.status, sessionPassId: r.sessionPassId }));

  const plan = planAttendancePassChange({
    applyPass,
    previousStatus: input.previous?.status,
    nextStatus: input.nextStatus,
    previousSessionPassId: input.previous?.sessionPassId,
    previousId: input.previous?.id,
    siblings,
  });

  const passesBefore = sessionPassService.list().map((p) => ({ ...p }));
  let sessionPassId = plan.sessionPassId;

  try {
    if (plan.action === 'consume') {
      const consumed = sessionPassService.consume(input.student.id);
      if (!consumed) {
        return {
          ok: false,
          warning: `${input.student.name} 학생의 회차권이 없거나 잔여 횟수가 없습니다.`,
        };
      }
      sessionPassId = consumed;
    } else if (plan.action === 'refund') {
      const ok = sessionPassService.refund(plan.sessionPassId);
      if (!ok) {
        return {
          ok: false,
          warning: `${input.student.name} 학생의 회차권을 복구할 수 없습니다.`,
        };
      }
      sessionPassId = undefined;
    } else if (plan.action === 'reuse') {
      sessionPassId = plan.sessionPassId;
    } else if (plan.action === 'keep') {
      sessionPassId = undefined;
    }

    const record = StorageService.saveAttendanceRecord({
      ...(input.previous?.id ? { id: input.previous.id } : {}),
      date: input.date,
      studentId: input.student.id,
      studentName: input.student.name,
      classId: input.classId,
      className: input.className,
      status: input.nextStatus,
      memo: input.memo,
      absentReason: input.absentReason,
      createdBy: input.createdBy,
      sessionPassId,
    });
    return { ok: true, record, sessionPassId };
  } catch (err) {
    const adapter = getStorageAdapter();
    if (adapter.writeLocalMirror) {
      adapter.writeLocalMirror(STORAGE_KEYS.SESSION_PASSES, passesBefore);
    }
    throw err;
  }
}

export async function saveAttendanceWithPass(
  input: SaveAttendanceWithPassInput
): Promise<SaveAttendanceWithPassResult> {
  const orgId = getOrganizationId();
  const useRpc = Boolean(isSupabaseConfigured() && orgId);

  if (!useRpc) {
    return saveAttendanceLocally(input);
  }

  const client = getPianoClient();
  const applyPass = isSessionPassBillingStudent(input.student);
  const { data, error } = await client.rpc('update_attendance_status_with_pass' as never, {
    p_organization_id: orgId,
    p_attendance_id: input.previous?.id || null,
    p_customer_id: input.student.id,
    p_service_id: input.classId,
    p_attendance_date: input.date,
    p_new_status: input.nextStatus,
    p_apply_pass: applyPass,
    p_student_name: input.student.name,
    p_class_name: input.className,
    p_created_by: input.createdBy,
    p_memo: input.memo ?? null,
    p_absent_reason: input.absentReason ?? null,
  } as never);

  if (error) {
    const message = error.message || '';
    if (message.includes('Insufficient session pass')) {
      return {
        ok: false,
        warning: `${input.student.name} 학생의 회차권이 없거나 잔여 횟수가 없습니다.`,
      };
    }
    if (message.includes('Session pass refund failed')) {
      return {
        ok: false,
        warning: `${input.student.name} 학생의 회차권을 복구할 수 없습니다.`,
      };
    }
    return { ok: false, warning: message || '출결 저장에 실패했습니다.' };
  }

  const payload = data as {
    attendance_id?: string;
    status?: AttendanceStatus;
    session_pass_id?: string | null;
    action?: string;
  } | null;

  const sessionPassId = payload?.session_pass_id || undefined;
  const record: AttendanceRecord = {
    id: payload?.attendance_id || input.previous?.id || crypto.randomUUID(),
    date: input.date,
    studentId: input.student.id,
    studentName: input.student.name,
    classId: input.classId,
    className: input.className,
    status: (payload?.status as AttendanceStatus) || input.nextStatus,
    memo: input.memo,
    absentReason: input.absentReason,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
    sessionPassId,
    makeUpRequired: input.nextStatus === 'absent',
  };
  writeAttendanceMirror(record);
  const passIds = [sessionPassId, input.previous?.sessionPassId].filter(
    (id): id is string => Boolean(id)
  );
  await refreshPassMirror(orgId!, passIds);
  return { ok: true, record, sessionPassId };
}

