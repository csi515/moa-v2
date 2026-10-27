/**
 * 공간·좌석 정비/청소 버퍼 엔진 (Pure Domain Function)
 * 이전 예약 종료 시각과 회전 정비(turnaround) 시간을 기반으로 다음 이용 가능 시각 계산
 */

export type CleaningStatus = 'DIRTY' | 'CLEANING' | 'READY';

export interface SpaceCleaningRecord {
  id?: string;
  tenant_id?: string;
  resource_id: string;
  turnaround_min: number;
  status: CleaningStatus;
  cleaned_by?: string | null;
  cleaned_at?: string | null;
}

/**
 * calculateNextAvailableTime:
 * 이전 예약 종료 시각에 정비/청소 버퍼(turnaroundMin)를 합산하여
 * 다음 예약이 가능한 최초 시작 일시(Date)를 계산하는 순수 함수
 *
 * @param bookingEndTime 예약 종료 시각 (Date 객체 또는 ISO 문자열)
 * @param turnaroundMin 정비/청소 버퍼 시간 (분 단위, 기본 15분)
 * @returns 다음 예약 가능 시작 시각 (Date)
 */
export function calculateNextAvailableTime(
  bookingEndTime: Date | string,
  turnaroundMin: number = 15
): Date {
  const endDate = typeof bookingEndTime === 'string' ? new Date(bookingEndTime) : bookingEndTime;
  if (isNaN(endDate.getTime())) {
    throw new Error('유효하지 않은 예약 종료 시각입니다.');
  }

  const validBufferMin = Math.max(0, turnaroundMin || 0);
  const nextAvailableMs = endDate.getTime() + validBufferMin * 60 * 1000;
  return new Date(nextAvailableMs);
}

/**
 * 공간 상태 전이 가드 (DIRTY -> CLEANING -> READY)
 */
export function canTransitionCleaningStatus(
  currentStatus: CleaningStatus,
  nextStatus: CleaningStatus
): boolean {
  if (currentStatus === nextStatus) return true;
  if (currentStatus === 'DIRTY' && nextStatus === 'CLEANING') return true;
  if (currentStatus === 'CLEANING' && nextStatus === 'READY') return true;
  if (currentStatus === 'READY' && nextStatus === 'DIRTY') return true; // 새 퇴실 발생 시
  return false;
}
