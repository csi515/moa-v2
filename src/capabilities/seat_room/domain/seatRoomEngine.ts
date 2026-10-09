/**
 * 공간·좌석 시간 점유 엔진 (Pure Function Domain)
 *
 * 대상: 스터디카페, 연습실, 파티룸, 코워킹스페이스
 * 상태 머신: VACANT -> IN_USE -> CLEANING_REQUIRED -> OVERDUE
 */

export type SeatRoomStatus = 'VACANT' | 'IN_USE' | 'CLEANING_REQUIRED' | 'OVERDUE';

export type SeatRoomAction =
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'TIME_EXPIRE'
  | 'COMPLETE_CLEANING';

export interface SeatRoomState {
  id: string;
  roomName: string;
  status: SeatRoomStatus;
  currentOccupantId?: string;
  startTime?: string; // ISO String
  allottedMinutes?: number;
  requiresCleaning: boolean;
}

export function transitionSeatStatus(
  current: SeatRoomState,
  action: SeatRoomAction,
  context?: {
    occupantId?: string;
    startTime?: string;
    allottedMinutes?: number;
  }
): { nextState: SeatRoomState; success: boolean; error?: string } {
  switch (action) {
    case 'CHECK_IN': {
      if (current.status !== 'VACANT') {
        return {
          nextState: current,
          success: false,
          error: `공간이 비어있지 않습니다 (현재 상태: ${current.status})`,
        };
      }
      return {
        nextState: {
          ...current,
          status: 'IN_USE',
          currentOccupantId: context?.occupantId,
          startTime: context?.startTime ?? new Date().toISOString(),
          allottedMinutes: context?.allottedMinutes ?? 60,
        },
        success: true,
      };
    }

    case 'TIME_EXPIRE': {
      if (current.status !== 'IN_USE') {
        return {
          nextState: current,
          success: false,
          error: `사용 중인 상태가 아닙니다 (현재 상태: ${current.status})`,
        };
      }
      return {
        nextState: {
          ...current,
          status: 'OVERDUE',
        },
        success: true,
      };
    }

    case 'CHECK_OUT': {
      if (current.status !== 'IN_USE' && current.status !== 'OVERDUE') {
        return {
          nextState: current,
          success: false,
          error: `퇴실 가능한 상태가 아닙니다 (현재 상태: ${current.status})`,
        };
      }
      const nextStatus: SeatRoomStatus = current.requiresCleaning
        ? 'CLEANING_REQUIRED'
        : 'VACANT';
      return {
        nextState: {
          ...current,
          status: nextStatus,
          currentOccupantId: undefined,
          startTime: undefined,
          allottedMinutes: undefined,
        },
        success: true,
      };
    }

    case 'COMPLETE_CLEANING': {
      if (current.status !== 'CLEANING_REQUIRED') {
        return {
          nextState: current,
          success: false,
          error: `청소 대기 상태가 아닙니다 (현재 상태: ${current.status})`,
        };
      }
      return {
        nextState: {
          ...current,
          status: 'VACANT',
        },
        success: true,
      };
    }

    default:
      return { nextState: current, success: false, error: '알 수 없는 동작' };
  }
}

export interface OverdueFeeCalculationParams {
  usedMinutes: number;
  allottedMinutes: number;
  baseRatePerMinute: number;
  overduePenaltyRate: number; // e.g. 1.5 = 150%
}

export interface OverdueFeeResult {
  isOverdue: boolean;
  overdueMinutes: number;
  baseFee: number;
  overdueFee: number;
  totalFee: number;
}

export function calculateOverdueFee(
  params: OverdueFeeCalculationParams
): OverdueFeeResult {
  const { usedMinutes, allottedMinutes, baseRatePerMinute, overduePenaltyRate } = params;

  const overdueMinutes = Math.max(0, usedMinutes - allottedMinutes);
  const isOverdue = overdueMinutes > 0;

  const baseMinutes = Math.min(usedMinutes, allottedMinutes);
  const baseFee = baseMinutes * baseRatePerMinute;

  const overdueFee = Math.round(
    overdueMinutes * baseRatePerMinute * overduePenaltyRate
  );

  return {
    isOverdue,
    overdueMinutes,
    baseFee,
    overdueFee,
    totalFee: baseFee + overdueFee,
  };
}
