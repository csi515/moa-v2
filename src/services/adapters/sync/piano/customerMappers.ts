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
import { selectedStudentGender } from '../mappers/customerMappers';


type PianoCustomerRow = {
  customer_id: string;
  organization_id: string;
  student_number: string;
  gender: string;
  birth_date: string | null;
  school: string | null;
  grade: string | null;
  level: string;
  tuition_fee: number;
  payment_day: number;
  teacher_id: string | null;
  join_date: string | null;
  leave_date: string | null;
  special_notes: string | null;
  avatar_color: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};


// ─── Piano Customers (Student extension) ──────────────────────────

export function studentToPianoCustomerRow(student: Student, organizationId: string) {
  const gender = selectedStudentGender(student.gender);
  return {
    customer_id: student.id,
    organization_id: organizationId,
    student_number: student.studentNumber,
    ...(gender ? { gender } : {}),
    birth_date: student.birthDate || null,
    school: student.school || null,
    grade: student.grade || null,
    level: student.level,
    tuition_fee: student.tuitionFee,
    payment_day: student.paymentDay,
    teacher_id: student.teacherId || null,
    join_date: student.joinDate || null,
    leave_date: student.leaveDate || null,
    special_notes: student.specialNotes || null,
    avatar_color: student.avatarColor || null,
    metadata: {
      billingMode: student.billingMode || 'monthly',
    } as Json,
  };
}

export function mergeStudentWithPiano(
  base: Student,
  row: PianoCustomerRow,
  classIds: string[],
  teacherName?: string
): Student {
  return {
    ...base,
    studentNumber: row.student_number || base.studentNumber,
    gender: selectedStudentGender(base.gender) ?? ('' as Student['gender']),
    birthDate: row.birth_date || base.birthDate,
    school: row.school || base.school,
    grade: row.grade || base.grade,
    level: (row.level as Student['level']) || base.level,
    tuitionFee: Number(row.tuition_fee) ?? base.tuitionFee,
    paymentDay: row.payment_day ?? base.paymentDay,
    teacherId: row.teacher_id || base.teacherId,
    teacherName: teacherName || base.teacherName,
    joinDate: row.join_date || base.joinDate,
    leaveDate: row.leave_date || undefined,
    specialNotes: row.special_notes || base.specialNotes,
    billingMode:
      ((row.metadata as { billingMode?: string } | null)?.billingMode === 'session_pass'
        ? 'session_pass'
        : base.billingMode) || 'monthly',
    avatarColor: row.avatar_color || base.avatarColor,
    classIds,
    createdAt: row.created_at || base.createdAt,
    updatedAt: row.updated_at || base.updatedAt,
  };
}

