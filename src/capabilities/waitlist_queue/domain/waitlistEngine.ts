/**
 * 시간표/수업 마감 취소 대기열 FIFO 엔진 (Pure Domain Function)
 * 비용 0원 원칙: 외부 Cron 없이 조회 시점 타임스탬프 기반 순수 함수로 대기 제안 만료 판정
 */

export type WaitlistStatus = 'WAITING' | 'OFFERED' | 'EXPIRED' | 'CONVERTED';

export interface BookingWaitlistEntry {
  id?: string;
  tenant_id?: string;
  booking_slot_id: string;
  customer_id: string;
  pass_id?: string | null;
  queue_order: number;
  status: WaitlistStatus;
  offered_at?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * isOfferExpired:
 * 대기열 제안 발송 시각(offeredAt)과 유효 대기 시간(timeoutMinutes)을 기준으로
 * 현재 시점(currentTime)에 제안이 만료되었는지 여부를 판정하는 순수 함수.
 *
 * @param offeredAt 제안 발송 일시 (Date | string | null | undefined)
 * @param timeoutMinutes 만료 허용 시간(분 단위, 기본 30분)
 * @param currentTime 현재 기준 일시 (Date | string, 기본값 new Date())
 * @returns 만료 여부 boolean (제안되지 않은 경우 false)
 */
export function isOfferExpired(
  offeredAt: Date | string | null | undefined,
  timeoutMinutes: number = 30,
  currentTime: Date | string = new Date()
): boolean {
  if (!offeredAt) {
    return false;
  }

  const offerDate = typeof offeredAt === 'string' ? new Date(offeredAt) : offeredAt;
  const currentDate = typeof currentTime === 'string' ? new Date(currentTime) : currentTime;

  if (isNaN(offerDate.getTime()) || isNaN(currentDate.getTime())) {
    throw new Error('유효하지 않은 일시 형식입니다.');
  }

  const timeoutMs = Math.max(0, timeoutMinutes) * 60 * 1000;
  const expireTimestamp = offerDate.getTime() + timeoutMs;

  return currentDate.getTime() > expireTimestamp;
}

/**
 * 대기열 FIFO 우선순위 정렬 순수 함수
 * queue_order 오름차순 -> created_at 오름차순
 */
export function sortWaitlistQueue(entries: BookingWaitlistEntry[]): BookingWaitlistEntry[] {
  return [...entries].sort((a, b) => {
    if (a.queue_order !== b.queue_order) {
      return a.queue_order - b.queue_order;
    }
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return aTime - bTime;
  });
}

/**
 * 다음 제안 대상 후보자 추출 (WAITING 상태 중 queue_order 최우선)
 */
export function getNextWaitlistCandidate(
  entries: BookingWaitlistEntry[]
): BookingWaitlistEntry | null {
  const waitingEntries = entries.filter((e) => e.status === 'WAITING');
  if (waitingEntries.length === 0) return null;
  const sorted = sortWaitlistQueue(waitingEntries);
  return sorted[0];
}
