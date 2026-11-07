import {
  seoulDateFromIso,
  seoulTimeFromIso,
  toSeoulIso,
  type RoomReservationRow,
} from '@/core/customer/services/practiceRoomReservationService';

export type RoomLiveState = 'vacant' | 'occupied' | 'imminent' | 'overdue';

export interface RoomLiveInfo {
  state: RoomLiveState;
  currentReservation?: RoomReservationRow;
  nextReservation?: RoomReservationRow;
  remainingMinutes: number;
  elapsedMinutes: number;
  totalMinutes: number;
  progressPercent: number;
}

/**
 * 특정 방의 오늘 예약 목록을 바탕으로 현재 시각 기준 실시간 점유 상태를 도출합니다.
 */
export function resolveRoomLiveInfo(
  now: Date,
  reservations: RoomReservationRow[],
  imminentThresholdMinutes = 5
): RoomLiveInfo {
  const nowMs = now.getTime();

  // 유효한(취소되지 않은) 예약만 처리
  const activeReservations = reservations.filter(
    (r) => r.status !== 'cancelled' && r.status !== 'rejected'
  );

  let currentReservation: RoomReservationRow | undefined;
  let overdueReservation: RoomReservationRow | undefined;
  let nextReservation: RoomReservationRow | undefined;

  for (const r of activeReservations) {
    const startMs = new Date(r.starts_at).getTime();
    const endMs = new Date(r.ends_at).getTime();

    if (startMs <= nowMs && nowMs <= endMs) {
      // 현재 진행 중
      currentReservation = r;
      break;
    } else if (nowMs > endMs && nowMs <= endMs + 10 * 60 * 1000) {
      // 종료 후 10분 이내 (아직 퇴실 미확인 상태)
      if (!overdueReservation || endMs > new Date(overdueReservation.ends_at).getTime()) {
        overdueReservation = r;
      }
    } else if (startMs > nowMs) {
      // 다가오는 예약
      if (!nextReservation || startMs < new Date(nextReservation.starts_at).getTime()) {
        nextReservation = r;
      }
    }
  }

  // 1. 현재 이용 중인 예약이 있는 경우
  if (currentReservation) {
    const startMs = new Date(currentReservation.starts_at).getTime();
    const endMs = new Date(currentReservation.ends_at).getTime();
    const totalMs = Math.max(1, endMs - startMs);
    const elapsedMs = Math.max(0, nowMs - startMs);
    const remainingMs = Math.max(0, endMs - nowMs);

    const totalMinutes = Math.max(1, Math.round(totalMs / 60000));
    const elapsedMinutes = Math.min(totalMinutes, Math.floor(elapsedMs / 60000));
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));

    const isImminent = remainingMinutes <= imminentThresholdMinutes;

    return {
      state: isImminent ? 'imminent' : 'occupied',
      currentReservation,
      nextReservation,
      remainingMinutes,
      elapsedMinutes,
      totalMinutes,
      progressPercent,
    };
  }

  // 2. 방금 종료되었으나 퇴실 미처리인 경우 (10분 이내)
  if (overdueReservation) {
    const startMs = new Date(overdueReservation.starts_at).getTime();
    const endMs = new Date(overdueReservation.ends_at).getTime();
    const totalMs = Math.max(1, endMs - startMs);
    const overdueMinutes = Math.ceil((nowMs - endMs) / 60000);

    return {
      state: 'overdue',
      currentReservation: overdueReservation,
      nextReservation,
      remainingMinutes: -overdueMinutes,
      elapsedMinutes: Math.round((nowMs - startMs) / 60000),
      totalMinutes: Math.round(totalMs / 60000),
      progressPercent: 100,
    };
  }

  // 3. 비어 있는 경우
  return {
    state: 'vacant',
    nextReservation,
    remainingMinutes: 0,
    elapsedMinutes: 0,
    totalMinutes: 0,
    progressPercent: 0,
  };
}

/**
 * 서울 기준 현재 시각을 HH:mm 형식으로 반환합니다.
 */
export function formatSeoulTime(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * 서울 기준 현재 날짜를 YYYY-MM-DD 형식으로 반환합니다.
 */
export function formatSeoulDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * 현재 시각에 분을 더해 시작/종료 시각(HH:mm)을 반환합니다.
 */
export function calculateSlotRange(
  startDate: Date,
  durationMinutes: number
): { startTime: string; endTime: string } {
  const startTime = formatSeoulTime(startDate);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  const endTime = formatSeoulTime(endDate);
  return { startTime, endTime };
}

/**
 * 예약 행으로부터 학생 표시 이름을 추출합니다.
 */
export function getBookingDisplayName(reservation?: RoomReservationRow): string {
  if (!reservation) return '원생 미지정';
  if (reservation.customers?.name) return `${reservation.customers.name} 학생`;
  if (reservation.memo) return reservation.memo;
  return '이용 중';
}
