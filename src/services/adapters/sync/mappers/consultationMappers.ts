import type {
  AppNotification,
  AttendanceRecord,
  ClassItem,
  Consultation,
  Parent,
  Student,
  TuitionInvoice,
} from '../../../../types';
import type { Json, PaymentMethod as DbPaymentMethod, PaymentStatus } from '../../../../lib/supabase/database.types';
import type { StaffMetadata } from '../../types';
import type { AcademySettings, Teacher } from '../../../../types';
import type { Booking, ServiceOffering } from '../../../../core/types/schedule';
import type { PickupAddress } from '../../../../core/transport/types';


// ─── Consultations ────────────────────────────────────────────────

export function consultationToRow(cst: Consultation, organizationId: string) {
  return {
    id: cst.id,
    organization_id: organizationId,
    customer_id: cst.studentId,
    staff_id: cst.counselorId || null,
    consultation_date: cst.date,
    type: cst.type,
    content: cst.content,
    result: cst.result,
    follow_up: cst.followUp || null,
    next_date: cst.nextDate || null,
  };
}

export function consultationRowToApp(row: {
  id: string;
  customer_id: string;
  staff_id: string | null;
  consultation_date: string;
  type: string;
  content: string | null;
  result: string | null;
  follow_up: string | null;
  next_date: string | null;
  created_at: string;
}, studentName = '', counselorName = ''): Consultation {
  return {
    id: row.id,
    studentId: row.customer_id,
    studentName,
    date: row.consultation_date,
    type: row.type as Consultation['type'],
    content: row.content || '',
    result: row.result || '',
    followUp: row.follow_up || undefined,
    nextDate: row.next_date || undefined,
    counselorId: row.staff_id || '',
    counselorName,
    createdAt: row.created_at,
  };
}

