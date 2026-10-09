/**
 * 락커·사물함 배정 및 만료 관리 엔진 (Pure Function Domain)
 */

export type LockerStatus = 'AVAILABLE' | 'OCCUPIED' | 'EXPIRED' | 'MAINTENANCE';

export interface LockerItem {
  id: string;
  lockerNumber: string;
  section?: string;
  status: LockerStatus;
  assignedCustomerId?: string;
  startDate?: string;
  endDate?: string;
  depositAmount: number;
}

export function assignLocker(
  locker: LockerItem,
  assignment: {
    customerId: string;
    startDate: string;
    endDate: string;
    depositAmount?: number;
  }
): { updatedLocker: LockerItem; success: boolean; error?: string } {
  if (locker.status !== 'AVAILABLE') {
    return {
      updatedLocker: locker,
      success: false,
      error: `락커가 배정 가능한 상태가 아닙니다 (현재: ${locker.status})`,
    };
  }

  if (assignment.startDate > assignment.endDate) {
    return {
      updatedLocker: locker,
      success: false,
      error: '시작일이 종료일보다 늦을 수 없습니다.',
    };
  }

  return {
    updatedLocker: {
      ...locker,
      status: 'OCCUPIED',
      assignedCustomerId: assignment.customerId,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      depositAmount: assignment.depositAmount ?? locker.depositAmount,
    },
    success: true,
  };
}

export function evaluateLockerExpiry(
  locker: LockerItem,
  currentDate: string
): { updatedLocker: LockerItem; isExpired: boolean; daysRemaining: number } {
  if (locker.status !== 'OCCUPIED' && locker.status !== 'EXPIRED') {
    return { updatedLocker: locker, isExpired: false, daysRemaining: 0 };
  }

  if (!locker.endDate) {
    return { updatedLocker: locker, isExpired: false, daysRemaining: 0 };
  }

  const end = new Date(locker.endDate).getTime();
  const cur = new Date(currentDate).getTime();
  const diffDays = Math.ceil((end - cur) / (1000 * 3600 * 24));

  const isExpired = diffDays < 0;
  const status: LockerStatus = isExpired ? 'EXPIRED' : 'OCCUPIED';

  return {
    updatedLocker: { ...locker, status },
    isExpired,
    daysRemaining: diffDays,
  };
}

export function releaseLocker(
  locker: LockerItem
): { updatedLocker: LockerItem; refundDeposit: number } {
  const refund = locker.depositAmount;
  return {
    updatedLocker: {
      ...locker,
      status: 'AVAILABLE',
      assignedCustomerId: undefined,
      startDate: undefined,
      endDate: undefined,
      depositAmount: 0,
    },
    refundDeposit: refund,
  };
}
