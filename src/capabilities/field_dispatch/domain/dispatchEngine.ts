/**
 * 출장 및 방문 파견 도메인 엔진 (Pure Domain Functions)
 * 비용 0원 원칙: 외부 유료 지도/스케줄러 API 없이 타임스탬프와 버퍼 기반 순수 함수로 이동 충돌 판정
 */

export type DispatchStatus =
  | 'BOOKED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'WORKING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface DispatchOrderInput {
  id?: string;
  tenant_id?: string;
  customer_id?: string | null;
  staff_id?: string | null;
  service_name: string;
  service_address: string;
  address_detail?: string | null;
  scheduled_at: string | Date;
  estimated_duration_min: number;
  travel_buffer_min: number;
  status?: DispatchStatus;
  before_photo_url?: string | null;
  after_photo_url?: string | null;
  memo?: string | null;
}

/**
 * 특정 파견 작업의 시작 시각, 작업 종료 시각, 이동 버퍼 포함 종료 시각을 계산
 */
export function getDispatchOrderTimeRange(order: DispatchOrderInput): {
  startTime: Date;
  workEndTime: Date;
  bufferEndTime: Date;
} {
  const startTime = new Date(order.scheduled_at);
  const durationMs = (order.estimated_duration_min || 0) * 60 * 1000;
  const bufferMs = (order.travel_buffer_min || 0) * 60 * 1000;

  const workEndTime = new Date(startTime.getTime() + durationMs);
  const bufferEndTime = new Date(workEndTime.getTime() + bufferMs);

  return { startTime, workEndTime, bufferEndTime };
}

/**
 * evaluateTravelConflict:
 * (기존 작업 시작시각 + 작업시간 + 이동 버퍼)와 신규 방문 일정의 시간 중복 여부 판정 순수 함수.
 * 
 * - 취소(CANCELLED)된 주문은 충돌 검사에서 제외
 * - staff_id가 지정되어 있고 서로 다른 경우 충돌 없음
 * - 두 일정의 [시작시각, 작업종료+이동버퍼] 구간이 서로 겹치면 충돌(true) 판정
 */
export function evaluateTravelConflict(
  existingOrders: DispatchOrderInput[],
  newOrder: DispatchOrderInput
): boolean {
  if (newOrder.status === 'CANCELLED') {
    return false;
  }

  const { startTime: newStart, bufferEndTime: newEnd } = getDispatchOrderTimeRange(newOrder);

  for (const existing of existingOrders) {
    if (existing.status === 'CANCELLED') {
      continue;
    }

    // 동일 주문 자체와의 비교 방지 (수정 시)
    if (newOrder.id && existing.id && newOrder.id === existing.id) {
      continue;
    }

    // 특정 담당자가 둘 다 지정되어 있는데 서로 다르면 충돌 아님
    if (
      newOrder.staff_id &&
      existing.staff_id &&
      newOrder.staff_id !== existing.staff_id
    ) {
      continue;
    }

    const { startTime: existStart, bufferEndTime: existEnd } = getDispatchOrderTimeRange(existing);

    // 두 구간 [existStart, existEnd)와 [newStart, newEnd)의 겹침 판정
    // max(start1, start2) < min(end1, end2)
    const maxStart = Math.max(existStart.getTime(), newStart.getTime());
    const minEnd = Math.min(existEnd.getTime(), newEnd.getTime());

    if (maxStart < minEnd) {
      return true; // 충돌 발생
    }
  }

  return false;
}
