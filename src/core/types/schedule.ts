/**
 * Appointment Booking 타입 (core.schedules 행).
 * bookable 슬롯 신청(core.reservations)이나 Session/Attendance가 아니다.
 */

export type BookingStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface ServiceOffering {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  maxCapacity: number;
  category: 'private' | 'group' | 'reformer' | 'other';
  isActive: boolean;
  isSchedulable: boolean;
  /** 피부관리 권장 재방문 간격(일) */
  careIntervalDays?: number;
}

/** 고객이 배정된 수업/시술 예약. source of truth = core.schedules.status */
export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  staffId?: string;
  staffName?: string;
  serviceId?: string;
  serviceName?: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  memo?: string;
  createdAt?: string;
  /** 수업 완료 시 차감한 이용권 id */
  sessionPassId?: string;
  /** 피부관리 관리실 */
  roomId?: string;
  roomName?: string;
  /** 피부관리 시술 기록 */
  skinCondition?: string;
  chartNote?: string;
  /** 고객 신청 vs 직원 등록 */
  requestedBy?: 'customer' | 'staff';
  /** 예약금 입금 표시. 결제 원장은 만들지 않는다 */
  depositStatus?: 'pending' | 'claimed' | 'confirmed';
  /** 대기. 정원·겹침에서 제외 */
  waitlist?: boolean;
}

/** 횟수권. Session(방문 사실)이 아니다. source of truth = core.session_passes */
export type SessionPassStatus = 'active' | 'exhausted' | 'cancelled';

export interface SessionPass {
  id: string;
  customerId: string;
  customerName: string;
  label: string;
  totalSessions: number;
  usedSessions: number;
  status: SessionPassStatus;
  purchasedAt: string;
  expiresAt?: string;
  memo?: string;
}

/** 시간대 모집 수동 마감 (수업 + 강사 + 시작시각) */
export interface SlotRecruitment {
  id: string;
  serviceId: string;
  /** 강사별 슬롯. 미지정은 빈 문자열 */
  staffId: string;
  startsAt: string;
  closedManually: boolean;
  /** 없으면 수업 종류 정원 */
  maxCapacity?: number;
}
