/**
 * 기구·비품 대여 및 회수 엔진 (Pure Function Domain)
 *
 * 대상: 골프채, 렌탈 스튜디오 조명/카메라, 볼링화, 보드게임
 * 상태 머신: AVAILABLE -> RENTED -> RETURNED / DAMAGED / LOST
 */

export type RentalStatus = 'AVAILABLE' | 'RENTED' | 'RETURNED' | 'DAMAGED' | 'LOST';

export type RentalAction =
  | 'RENT'
  | 'RETURN'
  | 'REPORT_DAMAGE'
  | 'REPORT_LOST'
  | 'REPAIR_OR_RESTOCK';

export interface EquipmentItem {
  id: string;
  name: string;
  assetTag: string; // 바코드 / RFID / 관리번호
  status: RentalStatus;
  currentRenterId?: string;
  rentedAt?: string; // ISO String
  dueAt?: string; // ISO String
  damageNote?: string;
}

export function transitionRentalStatus(
  current: EquipmentItem,
  action: RentalAction,
  payload?: {
    renterId?: string;
    rentedAt?: string;
    dueAt?: string;
    note?: string;
  }
): { nextItem: EquipmentItem; success: boolean; error?: string } {
  switch (action) {
    case 'RENT': {
      if (current.status !== 'AVAILABLE') {
        return {
          nextItem: current,
          success: false,
          error: `대여 불가능한 상태입니다 (현재 상태: ${current.status})`,
        };
      }
      return {
        nextItem: {
          ...current,
          status: 'RENTED',
          currentRenterId: payload?.renterId,
          rentedAt: payload?.rentedAt ?? new Date().toISOString(),
          dueAt: payload?.dueAt,
          damageNote: undefined,
        },
        success: true,
      };
    }

    case 'RETURN': {
      if (current.status !== 'RENTED') {
        return {
          nextItem: current,
          success: false,
          error: `대여 중인 비품이 아닙니다 (현재 상태: ${current.status})`,
        };
      }
      return {
        nextItem: {
          ...current,
          status: 'AVAILABLE', // 반납 완료 후 즉시 재대여 가능 또는 RETURNED 거쳐 AVAILABLE
          currentRenterId: undefined,
          rentedAt: undefined,
          dueAt: undefined,
        },
        success: true,
      };
    }

    case 'REPORT_DAMAGE': {
      if (current.status !== 'RENTED' && current.status !== 'AVAILABLE') {
        return {
          nextItem: current,
          success: false,
          error: `파손 보고 가능한 상태가 아닙니다 (현재 상태: ${current.status})`,
        };
      }
      return {
        nextItem: {
          ...current,
          status: 'DAMAGED',
          damageNote: payload?.note ?? '파손 보고됨',
        },
        success: true,
      };
    }

    case 'REPORT_LOST': {
      if (current.status !== 'RENTED' && current.status !== 'AVAILABLE') {
        return {
          nextItem: current,
          success: false,
          error: `분실 보고 가능한 상태가 아닙니다 (현재 상태: ${current.status})`,
        };
      }
      return {
        nextItem: {
          ...current,
          status: 'LOST',
          damageNote: payload?.note ?? '분실 보고됨',
        },
        success: true,
      };
    }

    case 'REPAIR_OR_RESTOCK': {
      if (current.status !== 'DAMAGED' && current.status !== 'LOST') {
        return {
          nextItem: current,
          success: false,
          error: `수리/재입고 대상이 아닙니다 (현재 상태: ${current.status})`,
        };
      }
      return {
        nextItem: {
          ...current,
          status: 'AVAILABLE',
          damageNote: undefined,
          currentRenterId: undefined,
          rentedAt: undefined,
          dueAt: undefined,
        },
        success: true,
      };
    }

    default:
      return { nextItem: current, success: false, error: '알 수 없는 동작' };
  }
}

export interface OverdueEvaluationResult {
  isOverdue: boolean;
  overdueHours: number;
  lateFee: number;
}

export function evaluateRentalOverdue(params: {
  dueAt: string;
  returnedAt: string;
  lateFeePerHour: number;
}): OverdueEvaluationResult {
  const due = new Date(params.dueAt).getTime();
  const returned = new Date(params.returnedAt).getTime();

  const diffMs = returned - due;
  if (diffMs <= 0) {
    return { isOverdue: false, overdueHours: 0, lateFee: 0 };
  }

  // 올림 기준 시간 계산
  const overdueHours = Math.ceil(diffMs / (1000 * 3600));
  const lateFee = overdueHours * params.lateFeePerHour;

  return {
    isOverdue: true,
    overdueHours,
    lateFee,
  };
}
