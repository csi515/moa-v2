import type {
  AppNotification,
  AttendanceRecord,
  ClassItem,
  Consultation,
  Parent,
  PracticeRoomBooking,
  Student,
  TuitionInvoice,
} from '../../../../types';
import type { Json, PaymentMethod as DbPaymentMethod, PaymentStatus } from '../../../../lib/supabase/database.types';
import type { StaffMetadata } from '../../types';
import type { AcademySettings, Teacher } from '../../../../types';
import type { Booking, ServiceOffering } from '../../../../core/types/schedule';
import type { PickupAddress } from '../../../../core/transport/types';
import {
  schedulePromotedWrite,
  scheduleRoom,
  scheduleRoomId,
  scheduleSessionPassId,
  scheduleStaffId,
} from '@/core/metadata';


// ─── Schedules (Attendance) ───────────────────────────────────────

interface ScheduleMetadata {
  studentName: string;
  classId: string;
  className: string;
  attendanceStatus: AttendanceRecord['status'];
  absentReason?: string;
  makeUpRequired?: boolean;
  makeUpDate?: string;
  createdBy: string;
}

const ATTENDANCE_STATUS_MAP: Record<AttendanceRecord['status'], string> = {
  present: 'completed',
  absent: 'no_show',
  late: 'confirmed',
  early_leave: 'confirmed',
  make_up: 'completed',
};

export function attendanceToScheduleRow(
  record: AttendanceRecord,
  organizationId: string,
  startsAt: string,
  endsAt: string
) {
  const metadata: ScheduleMetadata = {
    studentName: record.studentName,
    classId: record.classId,
    className: record.className,
    attendanceStatus: record.status,
    absentReason: record.absentReason,
    makeUpRequired: record.makeUpRequired,
    makeUpDate: record.makeUpDate,
    createdBy: record.createdBy,
  };

  return {
    id: record.id,
    organization_id: organizationId,
    customer_id: record.studentId,
    staff_id: null,
    service_id: record.classId || null,
    starts_at: startsAt,
    ends_at: endsAt,
    status: ATTENDANCE_STATUS_MAP[record.status] as 'completed' | 'no_show' | 'confirmed',
    memo: record.memo || null,
    metadata: metadata as unknown as Json,
  };
}

export function scheduleRowToAttendance(row: {
  id: string;
  customer_id: string | null;
  service_id: string | null;
  starts_at: string;
  status: string;
  memo: string | null;
  metadata: Json;
  created_at: string;
}): AttendanceRecord {
  const meta = (row.metadata || {}) as unknown as ScheduleMetadata;
  const statusReverse: Record<string, AttendanceRecord['status']> = {
    completed: meta.attendanceStatus || 'present',
    no_show: 'absent',
    confirmed: meta.attendanceStatus || 'late',
    scheduled: 'present',
    cancelled: 'absent',
  };

  return {
    id: row.id,
    date: row.starts_at.slice(0, 10),
    studentId: row.customer_id || '',
    studentName: meta.studentName || '',
    classId: meta.classId || row.service_id || '',
    className: meta.className || '',
    status: statusReverse[row.status] || meta.attendanceStatus || 'present',
    absentReason: meta.absentReason,
    makeUpRequired: meta.makeUpRequired,
    makeUpDate: meta.makeUpDate,
    memo: row.memo || undefined,
    createdBy: meta.createdBy || '',
    createdAt: row.created_at,
  };
}

export function buildScheduleTimes(record: AttendanceRecord, cls?: ClassItem): {
  startsAt: string;
  endsAt: string;
} {
  const startTime = cls?.startTime || '09:00';
  const endTime = cls?.endTime || '09:50';
  return {
    startsAt: `${record.date}T${startTime}:00`,
    endsAt: `${record.date}T${endTime}:00`,
  };
}

// ─── Pilates: Service Offerings & Bookings ────────────────────────

interface PilatesServiceMetadata {
  moduleType: 'pilates';
  maxCapacity: number;
  category: ServiceOffering['category'];
  careIntervalDays?: number;
}

interface BookingMetadata {
  customerName: string;
  staffName?: string;
  serviceName?: string;
  /** 연습실 예약 구분 — 일반 예약과 분리 */
  kind?: 'practice_room';
  room?: string;
  roomId?: string;
  skinCondition?: string;
  chartNote?: string;
  requestedBy?: 'customer' | 'staff';
  depositStatus?: Booking['depositStatus'];
  waitlist?: boolean;
  date?: string;
  startTime?: string;
  endTime?: string;
  createdBy?: string;
  /** 이용권 차감 연결 — hydrate 후 refund/재차감용 */
  sessionPassId?: string;
}

export function serviceOfferingToRow(offering: ServiceOffering, organizationId: string) {
  const metadata: PilatesServiceMetadata = {
    moduleType: 'pilates',
    maxCapacity: offering.maxCapacity,
    category: offering.category,
    careIntervalDays: offering.careIntervalDays,
  };

  return {
    id: offering.id,
    organization_id: organizationId,
    name: offering.name,
    description: offering.description || null,
    price: offering.price,
    duration_minutes: offering.durationMinutes,
    is_active: offering.isActive,
    is_schedulable: offering.isSchedulable,
    metadata: metadata as unknown as Json,
  };
}

export function serviceRowToOffering(row: {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  is_schedulable: boolean;
  metadata: Json;
}): ServiceOffering {
  const meta = (row.metadata || {}) as Partial<PilatesServiceMetadata>;
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    price: row.price,
    durationMinutes: row.duration_minutes,
    maxCapacity: meta.maxCapacity ?? 1,
    category: meta.category ?? 'private',
    isActive: row.is_active,
    isSchedulable: row.is_schedulable,
    careIntervalDays: meta.careIntervalDays,
  };
}

export function isPilatesServiceRow(metadata: Json): boolean {
  const meta = (metadata || {}) as Partial<PilatesServiceMetadata>;
  return meta.moduleType === 'pilates';
}

export function bookingToScheduleRow(booking: Booking, organizationId: string) {
  const metadata: BookingMetadata = {
    customerName: booking.customerName,
    staffName: booking.staffName,
    serviceName: booking.serviceName,
    room: booking.roomName,
    roomId: booking.roomId,
    skinCondition: booking.skinCondition,
    chartNote: booking.chartNote,
    requestedBy: booking.requestedBy,
    depositStatus: booking.depositStatus,
    waitlist: booking.waitlist,
    sessionPassId: booking.sessionPassId,
  };

  const promoted = schedulePromotedWrite({
    staffId: booking.staffId,
    sessionPassId: booking.sessionPassId,
    room: booking.roomName,
    roomId: booking.roomId,
  });

  return {
    id: booking.id,
    organization_id: organizationId,
    customer_id: booking.customerId,
    staff_id: promoted.staff_id,
    service_id: booking.serviceId || null,
    starts_at: booking.startsAt,
    ends_at: booking.endsAt,
    status: booking.status,
    memo: booking.memo || null,
    session_pass_id: promoted.session_pass_id,
    room: promoted.room,
    room_id: promoted.room_id,
    metadata: metadata as unknown as Json,
  };
}

export function scheduleRowToBooking(row: {
  id: string;
  customer_id: string | null;
  staff_id: string | null;
  service_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  memo: string | null;
  metadata: Json;
  created_at: string;
  session_pass_id?: string | null;
  room?: string | null;
  room_id?: string | null;
}): Booking {
  const meta = (row.metadata || {}) as unknown as BookingMetadata;
  return {
    id: row.id,
    customerId: row.customer_id || '',
    customerName: meta.customerName || '',
    staffId: scheduleStaffId(row),
    staffName: meta.staffName,
    serviceId: row.service_id || undefined,
    serviceName: meta.serviceName,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status as Booking['status'],
    memo: row.memo || undefined,
    createdAt: row.created_at,
    roomId: scheduleRoomId(row),
    roomName: meta.kind === 'practice_room' ? undefined : scheduleRoom(row),
    skinCondition: meta.skinCondition,
    chartNote: meta.chartNote,
    requestedBy: meta.requestedBy,
    depositStatus: meta.depositStatus,
    waitlist: meta.waitlist,
    sessionPassId: scheduleSessionPassId(row),
  };
}

export function isPracticeRoomScheduleRow(metadata: Json): boolean {
  const meta = (metadata || {}) as Partial<BookingMetadata>;
  return meta.kind === 'practice_room';
}

const PRACTICE_STATUS_TO_DB: Record<PracticeRoomBooking['status'], Booking['status']> = {
  scheduled: 'scheduled',
  cancelled: 'cancelled',
  completed: 'completed',
  pending: 'scheduled',
  approved: 'confirmed',
  rejected: 'cancelled',
};

const DB_STATUS_TO_PRACTICE: Record<string, PracticeRoomBooking['status']> = {
  scheduled: 'scheduled',
  confirmed: 'approved',
  cancelled: 'cancelled',
  completed: 'completed',
  no_show: 'cancelled',
};

/** 연습실 예약 → core.schedules */
export function practiceRoomBookingToScheduleRow(
  booking: PracticeRoomBooking,
  organizationId: string
) {
  const metadata: BookingMetadata = {
    kind: 'practice_room',
    customerName: booking.studentName,
    staffName: booking.teacherName,
    room: booking.room,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    createdBy: booking.createdBy,
  };

  const promoted = schedulePromotedWrite({
    staffId: booking.teacherId,
    room: booking.room,
  });

  return {
    id: booking.id,
    organization_id: organizationId,
    customer_id: booking.studentId || null,
    staff_id: promoted.staff_id,
    service_id: null,
    starts_at: `${booking.date}T${booking.startTime}:00`,
    ends_at: `${booking.date}T${booking.endTime}:00`,
    status: PRACTICE_STATUS_TO_DB[booking.status] || 'scheduled',
    memo: booking.memo || null,
    room: promoted.room,
    metadata: metadata as unknown as Json,
  };
}

export function scheduleRowToPracticeRoomBooking(row: {
  id: string;
  customer_id: string | null;
  staff_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  memo: string | null;
  metadata: Json;
  created_at: string;
  room?: string | null;
}): PracticeRoomBooking {
  const meta = (row.metadata || {}) as unknown as BookingMetadata;
  const date = meta.date || row.starts_at.slice(0, 10);
  const startTime = meta.startTime || row.starts_at.slice(11, 16);
  const endTime = meta.endTime || row.ends_at.slice(11, 16);

  return {
    id: row.id,
    studentId: row.customer_id || '',
    studentName: meta.customerName || '',
    room: scheduleRoom(row) || '',
    date,
    startTime,
    endTime,
    teacherId: scheduleStaffId(row),
    teacherName: meta.staffName,
    memo: row.memo || undefined,
    createdBy: meta.createdBy || '',
    status: DB_STATUS_TO_PRACTICE[row.status] || 'scheduled',
    createdAt: row.created_at,
  };
}

