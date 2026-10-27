/**
 * 결석 보강 티켓 & 보강 슬롯 매칭 도메인 엔진
 *
 * 비용 0원 원칙: 순수 도메인 함수로 상태 전이 및 알림 텍스트 조립
 */

export type TokenStatus = 'available' | 'reserved' | 'used' | 'expired' | 'canceled';
export type SlotStatus = 'open' | 'full' | 'closed';
export type ReservationStatus = 'reserved' | 'attended' | 'absent' | 'canceled';

export interface MakeupToken {
  id: string;
  organizationId: string;
  studentId: string;
  studentName: string;
  originReason: 'absence' | 'advance_request' | 'instructor_cancel';
  originDate: string; // YYYY-MM-DD
  expiresAt: string;  // YYYY-MM-DD
  status: TokenStatus;
  usedAt?: string | null;
}

export interface MakeupSlot {
  id: string;
  organizationId: string;
  instructorId?: string | null;
  instructorName: string;
  roomName: string;
  slotDate: string;   // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  capacity: number;
  reservedCount: number;
  status: SlotStatus;
}

export interface MakeupReservation {
  id: string;
  organizationId: string;
  tokenId: string;
  slotId: string;
  studentId: string;
  studentName: string;
  status: ReservationStatus;
  createdAt: string;
}

/**
 * 1. 결석 또는 사전 요청에 따른 보강 토큰 발행 (기본 유효기간 30일)
 */
export function issueMakeupToken(params: {
  id: string;
  organizationId: string;
  studentId: string;
  studentName: string;
  originReason: 'absence' | 'advance_request' | 'instructor_cancel';
  originDate: string; // YYYY-MM-DD
  validityDays?: number;
}): MakeupToken {
  const validity = params.validityDays ?? 30;
  const baseDate = new Date(params.originDate);
  const expiryDate = new Date(baseDate);
  expiryDate.setDate(expiryDate.getDate() + validity);

  const expiresAt = expiryDate.toISOString().slice(0, 10);

  return {
    id: params.id,
    organizationId: params.organizationId,
    studentId: params.studentId,
    studentName: params.studentName,
    originReason: params.originReason,
    originDate: params.originDate,
    expiresAt,
    status: 'available',
    usedAt: null,
  };
}

/**
 * 2. 토큰 유효성 및 만료 여부 판정
 */
export function evaluateTokenValidity(token: MakeupToken, currentDateStr: string): {
  isValid: boolean;
  isExpired: boolean;
  daysRemaining: number;
} {
  const current = new Date(currentDateStr);
  const expiry = new Date(token.expiresAt);
  const diffTime = expiry.getTime() - current.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isExpired = daysRemaining < 0;
  const isValid = token.status === 'available' && !isExpired;

  return {
    isValid,
    isExpired,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

/**
 * 3. 보강 슬롯 예약 가능 여부 검증
 */
export function canReserveSlot(slot: MakeupSlot): boolean {
  if (slot.status === 'closed') return false;
  return slot.reservedCount < slot.capacity;
}

/**
 * 4. 원자적 보강 예약 실행 (슬롯 카운트 증가 및 토큰 상태 전이)
 */
export function reserveMakeupLesson(
  token: MakeupToken,
  slot: MakeupSlot,
  currentDateStr: string,
  reservationId: string
): {
  success: boolean;
  error?: string;
  reservation?: MakeupReservation;
  updatedToken?: MakeupToken;
  updatedSlot?: MakeupSlot;
} {
  const tokenCheck = evaluateTokenValidity(token, currentDateStr);
  if (!tokenCheck.isValid) {
    return {
      success: false,
      error: tokenCheck.isExpired ? '만료된 보강권입니다.' : `사용 불가 상태인 보강권입니다 (${token.status}).`,
    };
  }

  if (!canReserveSlot(slot)) {
    return {
      success: false,
      error: '해당 보강 슬롯 정원이 마감되었습니다.',
    };
  }

  const newReservedCount = slot.reservedCount + 1;
  const updatedSlot: MakeupSlot = {
    ...slot,
    reservedCount: newReservedCount,
    status: newReservedCount >= slot.capacity ? 'full' : 'open',
  };

  const updatedToken: MakeupToken = {
    ...token,
    status: 'reserved',
  };

  const reservation: MakeupReservation = {
    id: reservationId,
    organizationId: token.organizationId,
    tokenId: token.id,
    slotId: slot.id,
    studentId: token.studentId,
    studentName: token.studentName,
    status: 'reserved',
    createdAt: new Date().toISOString(),
  };

  return {
    success: true,
    reservation,
    updatedToken,
    updatedSlot,
  };
}

/**
 * 5. 보강 예약 취소 및 토큰 상태 복구
 */
export function cancelMakeupReservation(
  token: MakeupToken,
  slot: MakeupSlot,
  reservation: MakeupReservation
): {
  updatedToken: MakeupToken;
  updatedSlot: MakeupSlot;
  updatedReservation: MakeupReservation;
} {
  const newReservedCount = Math.max(0, slot.reservedCount - 1);
  const updatedSlot: MakeupSlot = {
    ...slot,
    reservedCount: newReservedCount,
    status: 'open',
  };

  const updatedToken: MakeupToken = {
    ...token,
    status: 'available',
    usedAt: null,
  };

  const updatedReservation: MakeupReservation = {
    ...reservation,
    status: 'canceled',
  };

  return {
    updatedToken,
    updatedSlot,
    updatedReservation,
  };
}

/**
 * 6. 학부모 안내용 보강 확정 문자/카톡 텍스트 조립 (0원 발송)
 */
export function assembleMakeupConfirmationMessage(params: {
  studentName: string;
  instructorName: string;
  roomName: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  originDate: string;
}): string {
  return [
    `[보강 수업 확정 안내]`,
    `안녕하세요, ${params.studentName} 보호자님.`,
    `결석 처리되었던 ${params.originDate} 수업의 보강 일정이 아래와 같이 확정되었습니다.`,
    ``,
    `■ 일시: ${params.slotDate} ${params.startTime} ~ ${params.endTime}`,
    `■ 담당: ${params.instructorName} 선생님`,
    `■ 강의실: ${params.roomName}`,
    ``,
    `* 당일 원활한 진행을 위해 5분 전까지 입실 부탁드립니다. 감사합니다.`,
  ].join('\n');
}
