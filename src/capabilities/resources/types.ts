/** Piano 연습실 호환 kind. 공통 유형은 RESOURCE_KINDS. */
export const PRACTICE_ROOM_RESOURCE_KIND = 'practice_room';

/** 업종 무관 Resource 유형. Core는 이 값으로 분기하지 않는다. */
export const RESOURCE_KINDS = ['room', 'station', 'equipment', 'seat', 'facility'] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const RESOURCE_RESERVATION_BLOCKING_STATUSES = ['pending', 'approved'] as const;

export type ResourceReservationStatus =
  | 'pending'
  | 'approved'
  | 'cancelled'
  | 'rejected'
  | 'completed';

export type BookableResource = {
  id: string;
  organization_id: string;
  kind: string;
  name: string;
  capacity: number;
  open_time: string;
  close_time: string;
  is_active: boolean;
  memo?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

/** 공통 Resource. bookable_resources 행의 도메인 표현. */
export type Resource = {
  id: string;
  organizationId: string;
  name: string;
  kind: string;
  active: boolean;
  capacity: number;
  openTime: string;
  closeTime: string;
  memo?: string;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

/** 자원 점유 예약. core.room_reservations. Schedule Reservation(core.reservations)과 별도. */
export type ResourceReservation = {
  id: string;
  organization_id: string;
  resourceId: string;
  customer_id: string;
  requested_by: string;
  starts_at: string;
  ends_at: string;
  status: ResourceReservationStatus;
  memo?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
  resourceName?: string;
  resourceKind?: string;
  customerName?: string;
};

/** Piano UI 호환 — room_id = bookable_resources.id */
export type PracticeRoomRow = {
  id: string;
  organization_id: string;
  name: string;
  capacity: number;
  open_time: string;
  close_time: string;
  is_active: boolean;
  memo?: string | null;
};

export type RoomReservationRow = {
  id: string;
  organization_id: string;
  room_id: string;
  customer_id: string;
  requested_by: string;
  starts_at: string;
  ends_at: string;
  status: ResourceReservationStatus;
  memo?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
  practice_rooms?: { name: string } | null;
  customers?: { name: string } | null;
};

export type UpsertBookableResourceInput = {
  organizationId: string;
  kind: string;
  name: string;
  capacity?: number;
  openTime?: string;
  closeTime?: string;
  id?: string;
  memo?: string;
};

export type ListResourcesQuery = {
  organizationId: string;
  kind?: string;
  activeOnly?: boolean;
};

export type CreateResourceReservationInput = {
  organizationId: string;
  resourceId: string;
  customerId: string;
  startsAt: string;
  endsAt: string;
  memo?: string;
};

export type RequestResourceReservationInput = {
  organizationId: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  memo?: string;
};

export type ListResourceReservationsQuery = {
  organizationId: string;
  customerId?: string;
  resourceId?: string;
  status?: ResourceReservationStatus | ResourceReservationStatus[];
  fromIso?: string;
  toIso?: string;
  limit?: number;
  order?: 'asc' | 'desc';
};

/** 로컬 연습실 예약 행. ResourceReservation(core.room_reservations)과 별도 persist. */
export type PracticeRoomBookingStatus =
  | 'scheduled'
  | 'cancelled'
  | 'completed'
  | 'pending'
  | 'approved'
  | 'rejected';

export interface PracticeRoomBooking {
  id: string;
  studentId: string;
  studentName: string;
  room: string;
  date: string;
  startTime: string;
  endTime: string;
  teacherId?: string;
  teacherName?: string;
  memo?: string;
  createdBy: string;
  status: PracticeRoomBookingStatus;
  createdAt?: string;
}
