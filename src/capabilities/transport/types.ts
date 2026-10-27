/** 셔틀 픽업·하원 방향 */
export type ShuttleDirection = 'pickup' | 'dropoff' | 'both';

/** 학생별 픽업·하원 주소 */
export interface PickupAddress {
  id: string;
  label: string;
  address: string;
  detail?: string;
  contactName?: string;
  contactPhone?: string;
  directions?: string;
  shuttleDirection: ShuttleDirection;
  isDefault?: boolean;
}

/** 일별 차량 운행 신청 상태 */
export type ShuttleRideStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled';

/** 학부모·스태프 차량 운행(셔틀) 신청 */
export interface ShuttleRideRequest {
  id: string;
  studentId: string;
  studentName: string;
  /** YYYY-MM-DD */
  rideDate: string;
  direction: ShuttleDirection;
  addressLabel: string;
  address: string;
  addressDetail?: string;
  pickupAddressId?: string;
  guardianName?: string;
  note?: string;
  status: ShuttleRideStatus;
  confirmedAt?: string;
  confirmedBy?: string;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const SHUTTLE_DIRECTION_LABEL: Record<ShuttleDirection, string> = {
  pickup: '픽업만',
  dropoff: '하원만',
  both: '픽업·하원',
};

export const SHUTTLE_DIRECTION_OPTIONS: { value: ShuttleDirection; label: string }[] = [
  { value: 'both', label: SHUTTLE_DIRECTION_LABEL.both },
  { value: 'pickup', label: SHUTTLE_DIRECTION_LABEL.pickup },
  { value: 'dropoff', label: SHUTTLE_DIRECTION_LABEL.dropoff },
];

export const SHUTTLE_RIDE_STATUS_LABEL: Record<ShuttleRideStatus, string> = {
  requested: '신청 접수',
  confirmed: '운행 확정',
  completed: '운행 완료',
  cancelled: '취소',
};

export const PICKUP_ADDRESS_LABEL_PRESETS = ['집', '할머니댁', '학교', '기타'] as const;
