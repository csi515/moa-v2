/** 시설/공간 연습실 호환 kind. 공통 유형은 RESOURCE_KINDS. */
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
  /** 고객 예약 시 customers.id. 사내 직원 예약은 null. */
  customer_id: string | null;
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
  /** 예약자(requested_by) 표시명 — profiles.full_name */
  requesterName?: string;
};

/** 공간 UI 호환 — room_id = bookable_resources.id */
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
  customer_id: string | null;
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
  requester_name?: string | null;
};

export type ResourceCategory = 'vehicle' | 'meeting_room' | 'health_room' | 'display' | 'other';
export type ApproverType = 'staff' | 'role';

export interface UniversalResourceMetadata {
  category?: ResourceCategory;
  require_approval?: boolean;
  approver_type?: ApproverType;
  approver_id?: string;
  approver_name?: string;

  // 1) 차량 (vehicle)
  plate_number?: string;
  vehicle_model?: string;
  fuel_type?: string;
  parking_location?: string;
  fuel_card_number?: string; // 전용 주유카드 번호
  initial_odometer_km?: number; // 불출 시 주행거리(km)
  return_odometer_km?: number; // 반납 시 최종 주행거리(km)
  inspection_checklist?: {
    exterior_damage_checked?: boolean; // 외관 파손 점검
    fuel_level_percent?: number; // 주유 잔량 (%)
    cleanliness_checked?: boolean; // 실내 청결 점검
  };

  // 2) 회의실 & IT 장비 (meeting_room / equipment)
  has_projector?: boolean;
  has_video_conference?: boolean;
  max_occupancy?: number;
  serial_number?: string; // 시리얼 번호
  asset_tag?: string; // 고유 자산번호
  accessories_checklist?: {
    power_adapter?: boolean; // 전원 어댑터 누락 여부
    remote_controller?: boolean; // 리모컨 누락 여부
    hdmi_cable?: boolean; // HDMI/디스플레이 케이블 누락 여부
  };

  // 3) 보건실 (health_room)
  slot_duration_minutes?: number;
  is_private_consultation?: boolean;

  // 4) 디스플레이 (display)
  screen_resolution?: string;
  display_location?: string;

  [key: string]: unknown;
}

export type UpsertBookableResourceInput = {
  organizationId: string;
  kind: string;
  name: string;
  capacity?: number;
  openTime?: string;
  closeTime?: string;
  id?: string;
  memo?: string;
  metadata?: UniversalResourceMetadata | Record<string, unknown>;
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
