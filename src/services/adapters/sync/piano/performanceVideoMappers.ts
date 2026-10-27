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


// ─── Performance Videos ───────────────────────────────────────────

export function performanceVideoToPianoRow(video: PerformanceVideo, organizationId: string) {
  return {
    id: video.id,
    organization_id: organizationId,
    customer_id: video.studentId,
    title: video.title,
    youtube_url: video.youtubeUrl,
    recorded_date: video.recordedDate || null,
    event_type: video.eventType,
    song_title: video.songTitle || null,
    memo: video.memo || null,
    metadata: {
      studentName: video.studentName,
      eventId: video.eventId || null,
      eventTitle: video.eventTitle || null,
    } as Json,
  };
}

export function pianoRowToPerformanceVideo(row: {
  id: string;
  customer_id: string;
  title: string;
  youtube_url: string;
  recorded_date: string | null;
  event_type: string;
  song_title: string | null;
  memo: string | null;
  metadata: Json;
  created_at: string;
}): PerformanceVideo {
  const meta = (row.metadata || {}) as {
    studentName?: string;
    eventId?: string | null;
    eventTitle?: string | null;
  };
  return {
    id: row.id,
    studentId: row.customer_id,
    studentName: meta.studentName || '',
    title: row.title,
    youtubeUrl: row.youtube_url,
    recordedDate: row.recorded_date || undefined,
    eventType: row.event_type as PerformanceVideo['eventType'],
    songTitle: row.song_title || undefined,
    memo: row.memo || undefined,
    eventId: meta.eventId || undefined,
    eventTitle: meta.eventTitle || undefined,
    createdAt: row.created_at,
  };
}

