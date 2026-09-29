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


// ─── Events ───────────────────────────────────────────────────────

export function eventToPianoRow(event: AcademyEvent, organizationId: string) {
  return {
    id: event.id,
    organization_id: organizationId,
    title: event.title,
    start_date: event.startDate,
    end_date: event.endDate || null,
    event_type: event.type,
    description: event.description || null,
    color: event.color || null,
    metadata: {
      participantIds: event.participantIds || [],
      participationFee: event.participationFee || 0,
    } as Json,
  };
}

export function pianoRowToEvent(row: {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  event_type: string;
  description: string | null;
  color: string | null;
  metadata?: Json;
}): AcademyEvent {
  const meta = (row.metadata || {}) as {
    participantIds?: string[];
    participationFee?: number;
  };
  return {
    id: row.id,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date || undefined,
    type: row.event_type as AcademyEvent['type'],
    description: row.description || undefined,
    color: row.color || undefined,
    participantIds: meta.participantIds || [],
    participationFee: meta.participationFee || undefined,
  };
}

