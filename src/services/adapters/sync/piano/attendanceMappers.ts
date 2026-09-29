import type {
  AttendanceRecord,
  AcademyEvent,
  Expense,
  LessonRecord,
  PerformanceVideo,
  PracticeRecord,
  Song,
  Student,
  Textbook,
  TextbookInventoryTransaction,
  TextbookPayment,
  TextbookSale,
} from '../../../../types';
import type {
  Json,
  PaymentMethod as DbPaymentMethod,
  PianoAttendanceStatus,
  PianoInventoryTransactionType,
  PianoTextbookPaymentStatus,
} from '../../../../lib/supabase/database.types';
import { attendanceClassKey, isAttendanceServiceUuid } from '../../../../core/attendance/attendanceClassKey';


// ─── Attendance ───────────────────────────────────────────────────

const ATTENDANCE_TO_DB: Record<AttendanceRecord['status'], PianoAttendanceStatus> = {
  present: 'present',
  absent: 'absent',
  late: 'late',
  early_leave: 'early_leave',
  make_up: 'make_up',
};

const DB_TO_ATTENDANCE: Record<PianoAttendanceStatus, AttendanceRecord['status']> = {
  present: 'present',
  absent: 'absent',
  late: 'late',
  early_leave: 'early_leave',
  make_up: 'make_up',
};

export function attendanceToPianoRow(record: AttendanceRecord, organizationId: string) {
  const classId = attendanceClassKey(record.classId);
  return {
    id: record.id,
    organization_id: organizationId,
    customer_id: record.studentId,
    service_id: isAttendanceServiceUuid(record.classId) ? record.classId : null,
    attendance_date: record.date,
    status: ATTENDANCE_TO_DB[record.status],
    absent_reason: record.absentReason || null,
    make_up_required: record.makeUpRequired ?? false,
    make_up_date: record.makeUpDate || null,
    memo: record.memo || null,
    created_by: record.createdBy || null,
    metadata: {
      classId,
      studentName: record.studentName,
      className: record.className,
      makeUpStartTime: record.makeUpStartTime || null,
      makeUpEndTime: record.makeUpEndTime || null,
      makeUpRoom: record.makeUpRoom || null,
      makeUpTeacherId: record.makeUpTeacherId || null,
      makeUpTeacherName: record.makeUpTeacherName || null,
      sessionPassId: record.sessionPassId || null,
    } as Json,
  };
}

export function pianoRowToAttendance(row: {
  id: string;
  customer_id: string;
  service_id: string | null;
  attendance_date: string;
  status: PianoAttendanceStatus;
  absent_reason: string | null;
  make_up_required: boolean;
  make_up_date: string | null;
  memo: string | null;
  created_by: string | null;
  metadata: Json;
  created_at: string;
}): AttendanceRecord {
  const meta = (row.metadata || {}) as {
    classId?: string | null;
    studentName?: string;
    className?: string;
    makeUpStartTime?: string | null;
    makeUpEndTime?: string | null;
    makeUpRoom?: string | null;
    makeUpTeacherId?: string | null;
    makeUpTeacherName?: string | null;
    sessionPassId?: string | null;
  };
  return {
    id: row.id,
    date: row.attendance_date,
    studentId: row.customer_id,
    studentName: meta.studentName || '',
    classId: attendanceClassKey(meta.classId, row.service_id),
    className: meta.className || '',
    status: DB_TO_ATTENDANCE[row.status],
    absentReason: row.absent_reason || undefined,
    makeUpRequired: row.make_up_required,
    makeUpDate: row.make_up_date || undefined,
    makeUpStartTime: meta.makeUpStartTime || undefined,
    makeUpEndTime: meta.makeUpEndTime || undefined,
    makeUpRoom: meta.makeUpRoom || undefined,
    makeUpTeacherId: meta.makeUpTeacherId || undefined,
    makeUpTeacherName: meta.makeUpTeacherName || undefined,
    memo: row.memo || undefined,
    createdBy: row.created_by || '',
    createdAt: row.created_at,
    sessionPassId: meta.sessionPassId || undefined,
  };
}

