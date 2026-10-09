/**
 * 수강권·회원권 원자 엔진 (Pure Function Domain)
 */

export type PassType = 'COUNT_BASED' | 'PERIOD_BASED' | 'HYBRID';
export type PassStatus = 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'PAUSED';

export interface PassDefinition {
  id: string;
  customerId: string;
  passType: PassType;
  status: PassStatus;
  totalCount: number;
  remainingCount: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  pausedAt?: string;
}

export interface PassValidationResult {
  canUse: boolean;
  status: PassStatus;
  reason?: 'EXPIRED' | 'NO_REMAINING_COUNT' | 'PAUSED' | 'NOT_STARTED';
}

export function evaluatePassValidity(
  pass: PassDefinition,
  targetDate: string
): PassValidationResult {
  if (pass.status === 'PAUSED') {
    return { canUse: false, status: 'PAUSED', reason: 'PAUSED' };
  }

  if (targetDate < pass.startDate) {
    return { canUse: false, status: pass.status, reason: 'NOT_STARTED' };
  }

  if (targetDate > pass.endDate) {
    return { canUse: false, status: 'EXPIRED', reason: 'EXPIRED' };
  }

  if (pass.passType === 'COUNT_BASED' || pass.passType === 'HYBRID') {
    if (pass.remainingCount <= 0) {
      return { canUse: false, status: 'EXHAUSTED', reason: 'NO_REMAINING_COUNT' };
    }
  }

  return { canUse: true, status: 'ACTIVE' };
}

export function deductPassUsage(
  pass: PassDefinition,
  targetDate: string
): { updatedPass: PassDefinition; success: boolean; error?: string } {
  const check = evaluatePassValidity(pass, targetDate);
  if (!check.canUse) {
    return { updatedPass: pass, success: false, error: check.reason };
  }

  const nextRemaining =
    pass.passType === 'PERIOD_BASED'
      ? pass.remainingCount
      : Math.max(0, pass.remainingCount - 1);

  const nextStatus: PassStatus =
    pass.passType !== 'PERIOD_BASED' && nextRemaining === 0 ? 'EXHAUSTED' : 'ACTIVE';

  return {
    updatedPass: {
      ...pass,
      remainingCount: nextRemaining,
      status: nextStatus,
    },
    success: true,
  };
}
