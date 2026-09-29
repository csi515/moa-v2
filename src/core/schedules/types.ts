/**
 * Core Schedule & Reservation Types
 *
 * - CoreSchedule: 슬롯/운영 일정 (core.schedules)
 * - Reservation*: bookable 슬롯 신청 (core.reservations)
 * - Booking 타입은 ../types/schedule.ts — 같은 schedules 행을 예약 행위로 재사용
 */

/** 일정 상태 */
export type ScheduleStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

/** 예약 상태. 전이는 src/core/schedules/reservationMachine.ts */
export type ReservationStatus = 'requested' | 'confirmed' | 'cancelled';

/** Core 일정 (조직의 시간 기반 활동 또는 예약 가능한 슬롯) */
export interface CoreSchedule {
  id: string;
  organization_id: string;
  title: string | null;
  description: string | null;
  customer_id: string | null;
  staff_id: string | null;
  service_id: string | null;
  session_pass_id: string | null;
  starts_at: string;
  ends_at: string;
  status: ScheduleStatus;
  is_bookable: boolean;
  max_capacity: number;
  memo: string | null;
  room: string | null;
  room_id: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookableSchedule {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  max_capacity: number;
  confirmed_count: number;
  available_slots: number;
  service_id: string | null;
  service_name: string | null;
  staff_id: string | null;
  staff_name: string | null;
}

export interface Reservation {
  id: string;
  organization_id: string;
  schedule_id: string;
  customer_id: string | null;
  user_id: string | null;
  applicant_name: string;
  applicant_phone: string | null;
  applicant_email: string | null;
  request_message: string | null;
  status: ReservationStatus;
  confirmed_by: string | null;
  confirmed_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ReservationDetail extends Reservation {
  schedule_title: string;
  schedule_starts_at: string;
  schedule_ends_at: string;
  confirmed_by_name: string | null;
  cancelled_by_name: string | null;
}

export interface MyReservation {
  id: string;
  organization_id: string;
  organization_name: string;
  schedule_id: string;
  schedule_title: string;
  schedule_starts_at: string;
  schedule_ends_at: string;
  status: ReservationStatus;
  request_message: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
}

export interface ReservationRequest {
  schedule_id: string;
  applicant_name: string;
  applicant_phone?: string;
  applicant_email?: string;
  request_message?: string;
}

export interface ScheduleFormData {
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  is_bookable: boolean;
  max_capacity: number;
  service_id?: string;
  staff_id?: string;
  memo?: string;
}
