/**
 * 수강권·회원권 원자 엔진 (Pure Function Domain)
 */

import { calculateRemainingDays } from '@/core/utils/businessDate';

export type PassType = 'COUNT_BASED' | 'PERIOD_BASED' | 'HYBRID';
export type PassStatus = 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'PAUSED';

export interface HoldHistoryEntry {
  pausedAt: string; // YYYY-MM-DD
  resumedAt: string; // YYYY-MM-DD
  daysExtended: number;
  reason?: string;
}

export interface PassUsageLog {
  id: string;
  passId: string;
  memberId: string;
  usedAt: string; // ISO String or YYYY-MM-DD
  remainingCountAfter: number;
  note?: string;
}

export interface PassDefinition {
  id: string;
  customerId: string; // 주 계약자(학부모/가족 대표)
  passType: PassType;
  status: PassStatus;
  totalCount: number;
  remainingCount: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  pausedAt?: string;
  pauseReason?: string;
  sharedMemberIds?: string[]; // 가족 공유 대상자 ID 목록 (N:1 풀)
  holdHistory?: HoldHistoryEntry[];
}

export interface PassValidationResult {
  canUse: boolean;
  status: PassStatus;
  reason?:
    | 'EXPIRED'
    | 'NO_REMAINING_COUNT'
    | 'PAUSED'
    | 'NOT_STARTED'
    | 'NOT_AUTHORIZED_MEMBER';
}

function parseDateToUtc(dateStr: string): Date {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateDaysDifference(startStr: string, endStr: string): number {
  const s = parseDateToUtc(startStr);
  const e = parseDateToUtc(endStr);
  const diffMs = e.getTime() - s.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export function addDaysToDate(dateStr: string, days: number): string {
  const d = parseDateToUtc(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateString(d);
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

/**
 * 패밀리 공유 이용권 권한 및 유효성 동시 검증
 */
export function evaluateSharedPassValidity(
  pass: PassDefinition,
  requestingMemberId: string,
  targetDate: string
): PassValidationResult {
  // 1. 요청자가 주 계약자이거나 공유 패밀리 멤버 목록에 포함되어 있는지 검증
  const isAuthorized =
    pass.customerId === requestingMemberId ||
    (pass.sharedMemberIds && pass.sharedMemberIds.includes(requestingMemberId));

  if (!isAuthorized) {
    return {
      canUse: false,
      status: pass.status,
      reason: 'NOT_AUTHORIZED_MEMBER',
    };
  }

  return evaluatePassValidity(pass, targetDate);
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

/**
 * 가족 구성원별 공유 차감 처리 (N:1 풀 차감 및 개별 로그 산출)
 */
export function deductSharedPassUsage(
  pass: PassDefinition,
  requestingMemberId: string,
  targetDate: string,
  note?: string
): {
  updatedPass: PassDefinition;
  success: boolean;
  usageLog?: PassUsageLog;
  error?: string;
} {
  const check = evaluateSharedPassValidity(pass, requestingMemberId, targetDate);
  if (!check.canUse) {
    return { updatedPass: pass, success: false, error: check.reason };
  }

  const baseResult = deductPassUsage(pass, targetDate);
  if (!baseResult.success) {
    return { updatedPass: pass, success: false, error: baseResult.error };
  }

  const log: PassUsageLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    passId: pass.id,
    memberId: requestingMemberId,
    usedAt: targetDate,
    remainingCountAfter: baseResult.updatedPass.remainingCount,
    note,
  };

  return {
    updatedPass: baseResult.updatedPass,
    success: true,
    usageLog: log,
  };
}

/**
 * 이용권 일시 정지(홀딩) 처리 상태머신
 */
export function pausePass(
  pass: PassDefinition,
  pauseDate: string,
  reason?: string
): { updatedPass: PassDefinition; success: boolean; error?: string } {
  if (pass.status === 'PAUSED') {
    return { updatedPass: pass, success: false, error: 'ALREADY_PAUSED' };
  }
  if (pass.status === 'EXPIRED' || pass.status === 'EXHAUSTED') {
    return { updatedPass: pass, success: false, error: 'INVALID_STATUS_FOR_PAUSE' };
  }
  if (pauseDate > pass.endDate) {
    return { updatedPass: pass, success: false, error: 'PAUSE_DATE_AFTER_EXPIRY' };
  }

  return {
    updatedPass: {
      ...pass,
      status: 'PAUSED',
      pausedAt: pauseDate.slice(0, 10),
      pauseReason: reason ?? '고객 요청 홀딩',
    },
    success: true,
  };
}

/**
 * 이용권 정지 해제(재개) 처리 상태머신 (정지 기간만큼 endDate 자동 연장)
 */
export function resumePass(
  pass: PassDefinition,
  resumeDate: string
): {
  updatedPass: PassDefinition;
  success: boolean;
  extendedDays: number;
  error?: string;
} {
  if (pass.status !== 'PAUSED' || !pass.pausedAt) {
    return {
      updatedPass: pass,
      success: false,
      extendedDays: 0,
      error: 'NOT_PAUSED',
    };
  }

  const cleanResumeDate = resumeDate.slice(0, 10);
  const pausedStartDate = pass.pausedAt.slice(0, 10);

  // 정지 일수 계산 (당일 재개여도 최소 1일 연장 처리)
  const diffDays = Math.max(1, calculateDaysDifference(pausedStartDate, cleanResumeDate));
  const newEndDate = addDaysToDate(pass.endDate, diffDays);

  const historyEntry: HoldHistoryEntry = {
    pausedAt: pausedStartDate,
    resumedAt: cleanResumeDate,
    daysExtended: diffDays,
    reason: pass.pauseReason,
  };

  const updatedHoldHistory = [...(pass.holdHistory ?? []), historyEntry];

  return {
    updatedPass: {
      ...pass,
      status: 'ACTIVE',
      endDate: newEndDate,
      pausedAt: undefined,
      pauseReason: undefined,
      holdHistory: updatedHoldHistory,
    },
    success: true,
    extendedDays: diffDays,
  };
}


/**
 * 수강권 만료 잔여일(D-Day)을 계산한다.
 * 자정 마감 경계 및 타임존을 정규화하여 당일 자정 전까지는 D-0(0일)을 유지한다.
 */
export function getPassRemainingDays(
  pass: Pick<PassDefinition, 'endDate'>,
  now?: Date | string,
  timezone?: string
): number {
  return calculateRemainingDays(pass.endDate, now, timezone);
}
