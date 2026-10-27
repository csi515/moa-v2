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


// ─── Lesson Records ───────────────────────────────────────────────

export function lessonToPianoRow(rec: LessonRecord, organizationId: string) {
  return {
    id: rec.id,
    organization_id: organizationId,
    customer_id: rec.studentId,
    staff_id: rec.teacherId || null,
    service_id: rec.classId || null,
    lesson_date: rec.date,
    song_title: rec.songTitle,
    progress: rec.progress || null,
    lesson_content: rec.lessonContent || null,
    strengths: rec.strengths || null,
    weaknesses: rec.weaknesses || null,
    homework: rec.homework || null,
    next_plan: rec.nextPlan || null,
    teacher_notes: rec.teacherNotes || null,
    memo: rec.memo || null,
    metadata: {
      studentName: rec.studentName,
      className: rec.className,
      teacherName: rec.teacherName,
    } as Json,
  };
}

export function pianoRowToLesson(row: {
  id: string;
  customer_id: string;
  staff_id: string | null;
  service_id: string | null;
  lesson_date: string;
  song_title: string;
  progress: string | null;
  lesson_content: string | null;
  strengths: string | null;
  weaknesses: string | null;
  homework: string | null;
  next_plan: string | null;
  teacher_notes: string | null;
  memo: string | null;
  metadata: Json;
  created_at: string;
}): LessonRecord {
  const meta = (row.metadata || {}) as { studentName?: string; className?: string; teacherName?: string };
  return {
    id: row.id,
    studentId: row.customer_id,
    studentName: meta.studentName || '',
    date: row.lesson_date,
    classId: row.service_id || undefined,
    className: meta.className,
    songTitle: row.song_title,
    progress: row.progress || '',
    lessonContent: row.lesson_content || '',
    strengths: row.strengths || undefined,
    weaknesses: row.weaknesses || undefined,
    homework: row.homework || undefined,
    nextPlan: row.next_plan || undefined,
    teacherNotes: row.teacher_notes || undefined,
    memo: row.memo || undefined,
    teacherId: row.staff_id || '',
    teacherName: meta.teacherName || '',
    createdAt: row.created_at,
  };
}

