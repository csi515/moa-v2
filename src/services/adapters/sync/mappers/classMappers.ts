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


// ─── Services (Classes) ───────────────────────────────────────────

interface ServiceMetadata {
  teacherId: string;
  teacherName: string;
  daysOfWeek: ClassItem['daysOfWeek'];
  startTime: string;
  endTime: string;
  capacity: number;
  level?: string;
  targetLevel?: string;
  textbook?: string;
  room: string;
  color?: string;
}

function parseDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return Math.max(1, eh * 60 + em - (sh * 60 + sm));
}

export function classToServiceRow(cls: ClassItem, organizationId: string) {
  const metadata: ServiceMetadata = {
    teacherId: cls.teacherId,
    teacherName: cls.teacherName,
    daysOfWeek: cls.daysOfWeek,
    startTime: cls.startTime,
    endTime: cls.endTime,
    capacity: cls.capacity,
    level: cls.level,
    targetLevel: cls.targetLevel,
    textbook: cls.textbook,
    room: cls.room,
    color: cls.color,
  };

  return {
    id: cls.id,
    organization_id: organizationId,
    name: cls.name,
    description: cls.memo || null,
    price: cls.fee ?? 0,
    duration_minutes: parseDurationMinutes(cls.startTime, cls.endTime),
    is_active: true,
    is_schedulable: true,
    metadata: metadata as unknown as Json,
  };
}

export function serviceRowToClass(row: {
  id: string;
  name: string;
  price: number;
  metadata: Json;
  description: string | null;
}): ClassItem {
  const meta = (row.metadata || {}) as unknown as ServiceMetadata;
  return {
    id: row.id,
    name: row.name,
    teacherId: meta.teacherId || '',
    teacherName: meta.teacherName || '',
    daysOfWeek: meta.daysOfWeek || [],
    startTime: meta.startTime || '09:00',
    endTime: meta.endTime || '09:50',
    capacity: meta.capacity ?? 10,
    level: meta.level,
    targetLevel: meta.targetLevel,
    fee: row.price,
    textbook: meta.textbook,
    room: meta.room || '',
    memo: row.description || undefined,
    color: meta.color,
  };
}

