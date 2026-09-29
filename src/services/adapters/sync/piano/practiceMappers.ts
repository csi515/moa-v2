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


// ─── Practice Records ─────────────────────────────────────────────

export function practiceToPianoRow(rec: PracticeRecord, organizationId: string) {
  return {
    id: rec.id,
    organization_id: organizationId,
    customer_id: rec.studentId,
    practice_date: rec.date,
    minutes: rec.minutes,
    song_title: rec.songTitle,
    textbook: rec.textbook || null,
    page: rec.page || null,
    homework: rec.homework || null,
    teacher_evaluation: rec.teacherEvaluation || null,
    difficulty_part: rec.difficultyPart || null,
    next_assignment: rec.nextAssignment || null,
    metadata: {
      studentName: rec.studentName,
      source: rec.source || 'staff',
      staffReviewed: rec.staffReviewed ?? (rec.source !== 'parent'),
      staffReviewedAt: rec.staffReviewedAt,
      staffReviewNote: rec.staffReviewNote,
    } as Json,
  };
}

export function pianoRowToPractice(row: {
  id: string;
  customer_id: string;
  practice_date: string;
  minutes: number;
  song_title: string;
  textbook: string | null;
  page: string | null;
  homework: string | null;
  teacher_evaluation: string | null;
  difficulty_part: string | null;
  next_assignment: string | null;
  metadata: Json;
  created_at: string;
}): PracticeRecord {
  const meta = (row.metadata || {}) as {
    studentName?: string;
    source?: 'staff' | 'parent';
    staffReviewed?: boolean;
    staffReviewedAt?: string;
    staffReviewNote?: string;
  };
  const source = meta.source || 'staff';
  return {
    id: row.id,
    studentId: row.customer_id,
    studentName: meta.studentName || '',
    date: row.practice_date,
    minutes: row.minutes,
    songTitle: row.song_title,
    textbook: row.textbook || undefined,
    page: row.page || undefined,
    homework: row.homework || undefined,
    teacherEvaluation: row.teacher_evaluation || undefined,
    difficultyPart: row.difficulty_part || undefined,
    nextAssignment: row.next_assignment || undefined,
    source,
    staffReviewed: meta.staffReviewed ?? source !== 'parent',
    staffReviewedAt: meta.staffReviewedAt,
    staffReviewNote: meta.staffReviewNote,
    createdAt: row.created_at,
  };
}

