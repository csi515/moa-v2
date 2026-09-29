/**
 * Session: 실제 이용/방문 사실 (core.customer_sessions).
 * 예약 상태·PIN 체크인·수업 출석을 복사하지 않고 결제·이용권을 차감하지 않는다.
 * reservationId는 room_reservations 참조이며 core.reservations가 아니다.
 */
export const CUSTOMER_SESSION_STATUSES = ['active', 'completed', 'cancelled'] as const;
export type CustomerSessionStatus = (typeof CUSTOMER_SESSION_STATUSES)[number];

export const CUSTOMER_SESSION_SOURCES = ['walk_in', 'booking', 'kiosk', 'other'] as const;
export type CustomerSessionSource = (typeof CUSTOMER_SESSION_SOURCES)[number];

export type CustomerSession = {
  id: string;
  organizationId: string;
  customerId: string;
  startedAt: string;
  endedAt?: string;
  status: CustomerSessionStatus;
  source: string;
  context?: string;
  staffId?: string;
  /** 선택 연결. 업종 Booking 원장이 달라 FK 없음 */
  bookingId?: string;
  /** core.room_reservations. core.reservations가 아님 */
  reservationId?: string;
  passId?: string;
  paymentId?: string;
  resourceId?: string;
  memo?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CustomerSessionStartInput = {
  customerId: string;
  staffId?: string;
  source?: string;
  context?: string;
  bookingId?: string;
  reservationId?: string;
  passId?: string;
  paymentId?: string;
  resourceId?: string;
  memo?: string;
  metadata?: Record<string, unknown>;
};

export type CustomerSessionListQuery = {
  customerId?: string;
  status?: CustomerSessionStatus;
  limit?: number;
};

export type CustomerSessionMutationAction = 'created' | 'completed' | 'cancelled' | 'idempotent';

export type CustomerSessionMutationResult = {
  action: CustomerSessionMutationAction;
  session: CustomerSession;
};
