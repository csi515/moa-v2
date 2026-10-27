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


// ─── Notifications ────────────────────────────────────────────────

interface NotificationMetadata {
  targetGroup?: string;
  recipientCount?: number;
  targetStudentName?: string;
  targetParentPhone?: string;
  eventKey?: string;
  sessionId?: string;
  action?: 'check_in' | 'check_out';
  at?: string;
  customerName?: string;
  method?: string;
  sessionDate?: string;
}

export function notificationToRow(notif: AppNotification, organizationId: string) {
  const metadata: NotificationMetadata = {
    targetGroup: notif.targetGroup,
    recipientCount: notif.recipientCount,
    targetStudentName: notif.targetStudentName,
    targetParentPhone: notif.targetParentPhone,
    eventKey: notif.eventKey,
  };

  return {
    id: notif.id,
    organization_id: organizationId,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    target_type: notif.targetStudentId ? 'customer' : notif.targetGroup || null,
    target_id: notif.targetStudentId || null,
    status: (notif.status || 'pending') as 'pending' | 'sent' | 'failed',
    channel: 'app' as const,
    scheduled_at: notif.scheduledDate || null,
    sent_at: notif.sentAt || null,
    metadata: metadata as unknown as Json,
  };
}

export function notificationRowToApp(row: {
  id: string;
  type: string;
  title: string;
  message: string;
  target_type: string | null;
  target_id: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  metadata: Json;
  created_at: string;
}): AppNotification {
  const meta = (row.metadata || {}) as NotificationMetadata;
  return {
    id: row.id,
    type: row.type as AppNotification['type'],
    title: row.title,
    message: row.message,
    targetGroup: meta.targetGroup || row.target_type || undefined,
    recipientCount: meta.recipientCount,
    targetStudentId: row.target_id || undefined,
    targetStudentName: meta.targetStudentName,
    targetParentPhone: meta.targetParentPhone,
    eventKey: meta.eventKey,
    scheduledDate: row.scheduled_at || undefined,
    status: row.status as AppNotification['status'],
    sentAt: row.sent_at || undefined,
    createdAt: row.created_at,
  };
}

