/**
 * 공간 블록 대여 & 15분 정비/청소 버퍼 엔진 (Pure Domain Functions)
 * 퇴실 후 정비 버퍼 자동 계산, 예약 중복 방어, 체크리스트 완료 가드
 */

export type TurnaroundStatus =
  | 'in_service'
  | 'cleaning_needed'
  | 'cleaning_in_progress'
  | 'ready_for_next';

export interface TurnaroundChecklistItem {
  id: string;
  item: string;
  done: boolean;
}

export interface SpaceSlot {
  roomId: string;
  serviceStartAt: string; // ISO
  serviceEndAt: string; // ISO
  bufferMinutes: number; // 15분 등
}

export interface CalculatedTurnaround {
  serviceStartAt: string;
  serviceEndAt: string;
  bufferMinutes: number;
  bufferEndAt: string; // ISO
  totalOccupiedMinutes: number;
}

/**
 * 이용 종료 시각에 버퍼 시간을 합산하여 최종 공간 점유 슬롯 계산
 */
export function calculateTurnaroundSlot(
  serviceStartIso: string,
  serviceEndIso: string,
  bufferMinutes: number = 15
): CalculatedTurnaround {
  const startMs = Date.parse(serviceStartIso);
  const endMs = Date.parse(serviceEndIso);

  const bufferEndMs = endMs + bufferMinutes * 60 * 1000;
  const bufferEndAt = new Date(bufferEndMs).toISOString();

  const totalOccupiedMinutes = Math.round((bufferEndMs - startMs) / (60 * 1000));

  return {
    serviceStartAt: serviceStartIso,
    serviceEndAt: serviceEndIso,
    bufferMinutes,
    bufferEndAt,
    totalOccupiedMinutes,
  };
}

/**
 * 두 예약 슬롯이 정비 버퍼를 포함하여 겹치는지 충돌 검사
 */
export function hasTurnaroundConflict(
  slotA: { startAt: string; bufferEndAt: string },
  slotB: { startAt: string; bufferEndAt: string }
): boolean {
  const aStart = Date.parse(slotA.startAt);
  const aEnd = Date.parse(slotA.bufferEndAt);
  const bStart = Date.parse(slotB.startAt);
  const bEnd = Date.parse(slotB.bufferEndAt);

  // A 종료 이전이면서 B 시작 이후인 교집합이 존재하면 충돌
  return aStart < bEnd && bStart < aEnd;
}

export interface StateTransitionResult {
  nextStatus: TurnaroundStatus;
  allowed: boolean;
  error?: string;
  cleanedAt?: string;
}

/**
 * 룸 턴어라운드 상태 전이 및 다음 고객 체크인 가능 가드
 */
export function transitionTurnaroundState(
  currentStatus: TurnaroundStatus,
  action: 'checkout' | 'start_cleaning' | 'complete_cleaning' | 'checkin_next',
  checklist: TurnaroundChecklistItem[] = []
): StateTransitionResult {
  switch (action) {
    case 'checkout':
      // 고객 퇴실 ➔ 정비 대기(청소 필요) 상태로 전환
      return { nextStatus: 'cleaning_needed', allowed: true };

    case 'start_cleaning':
      // 청소/정비 시작
      return { nextStatus: 'cleaning_in_progress', allowed: true };

    case 'complete_cleaning': {
      // 정비 체크리스트 전체 항목이 완료되었는지 검증
      const incomplete = checklist.filter((item) => !item.done);
      if (incomplete.length > 0) {
        return {
          nextStatus: currentStatus,
          allowed: false,
          error: `정비 체크리스트 미완료 항목(${incomplete.length}개)이 있습니다.`,
        };
      }
      return {
        nextStatus: 'ready_for_next',
        allowed: true,
        cleanedAt: new Date().toISOString(),
      };
    }

    case 'checkin_next':
      // 다음 고객 입실 시도: ready_for_next 상태가 아니면 차단
      if (currentStatus !== 'ready_for_next') {
        return {
          nextStatus: currentStatus,
          allowed: false,
          error: '공간 청소 및 정비가 완료되지 않아 다음 고객이 입실할 수 없습니다.',
        };
      }
      return { nextStatus: 'in_service', allowed: true };

    default:
      return { nextStatus: currentStatus, allowed: false, error: '유효하지 않은 동작입니다.' };
  }
}
