/**
 * 수강권 홀딩(일시정지) 및 동결 정책 엔진 (Pure Domain Function)
 * W3C / 표준 UTC 일자 기반 계산, 연간 횟수·일수 제한 정책 가드
 */

export interface HoldingPolicy {
  maxHoldCountPerYear: number; // 연간 최대 홀딩 횟수 (예: 3회)
  minHoldDays: number; // 1회 최소 홀딩 일수 (예: 7일)
  maxHoldDaysPerTime: number; // 1회 최대 홀딩 일수 (예: 30일)
  maxTotalHoldDays: number; // 연간 누적 최대 홀딩 일수 (예: 60일)
  allowRetroactiveHold?: boolean; // 소급 적용 허용 여부 (기본 false)
}

export const DEFAULT_HOLDING_POLICY: HoldingPolicy = {
  maxHoldCountPerYear: 3,
  minHoldDays: 7,
  maxHoldDaysPerTime: 30,
  maxTotalHoldDays: 60,
  allowRetroactiveHold: false,
};

export interface HoldRecord {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  days: number;
  reason: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  appliedAt: string; // ISO
}

export interface HoldablePass {
  id: string;
  customerId: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'PAUSED';
  remainingCount: number;
  holdRecords?: HoldRecord[];
}

export interface HoldingValidationResult {
  valid: boolean;
  reason?:
    | 'PASS_NOT_ACTIVE'
    | 'PAST_START_DATE_NOT_ALLOWED'
    | 'HOLD_START_AFTER_EXPIRY'
    | 'HOLD_END_BEFORE_START'
    | 'LESS_THAN_MIN_DAYS'
    | 'EXCEEDS_MAX_DAYS_PER_TIME'
    | 'EXCEEDS_MAX_COUNT_PER_YEAR'
    | 'EXCEEDS_MAX_TOTAL_DAYS'
    | 'OVERLAPPING_HOLD_EXISTS';
  message?: string;
  holdDays: number;
}

function parseUtcDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatUtcDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateDaysBetween(startDateStr: string, endDateStr: string): number {
  const s = parseUtcDate(startDateStr);
  const e = parseUtcDate(endDateStr);
  const diffMs = e.getTime() - s.getTime();
  if (diffMs < 0) return 0;
  // 시작일과 종료일 양편 포함 (예: 2026-06-01 ~ 2026-06-07 => 7일)
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export function addHoldingDaysToDate(dateStr: string, days: number): string {
  const d = parseUtcDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return formatUtcDate(d);
}

/**
 * 홀딩 기간만큼 만료일 자동 연장 계산
 */
export function calculateHoldingExtension(
  currentEndDate: string,
  holdStartDate: string,
  holdEndDate: string
): { newEndDate: string; extendedDays: number } {
  const extendedDays = calculateDaysBetween(holdStartDate, holdEndDate);
  const newEndDate = addHoldingDaysToDate(currentEndDate, extendedDays);
  return { newEndDate, extendedDays };
}

/**
 * 홀딩 신청 정책 사전 검증
 */
export function validateHoldingRequest(
  pass: HoldablePass,
  holdStartDate: string,
  holdEndDate: string,
  policy: HoldingPolicy = DEFAULT_HOLDING_POLICY,
  todayStr: string = formatUtcDate(new Date())
): HoldingValidationResult {
  // 1. 상태 검증
  if (pass.status !== 'ACTIVE' && pass.status !== 'PAUSED') {
    return {
      valid: false,
      reason: 'PASS_NOT_ACTIVE',
      message: '활성 또는 일시정지 상태의 수강권만 홀딩을 신청할 수 있습니다.',
      holdDays: 0,
    };
  }

  // 2. 소급 적용 차단
  if (!policy.allowRetroactiveHold && holdStartDate < todayStr) {
    return {
      valid: false,
      reason: 'PAST_START_DATE_NOT_ALLOWED',
      message: '과거 날짜로는 홀딩을 소급 신청할 수 없습니다.',
      holdDays: 0,
    };
  }

  // 3. 만료일 이후 홀딩 차단
  if (holdStartDate > pass.endDate) {
    return {
      valid: false,
      reason: 'HOLD_START_AFTER_EXPIRY',
      message: '수강권 만료일 이후로는 홀딩을 신청할 수 없습니다.',
      holdDays: 0,
    };
  }

  // 4. 날짜 선후관계 검증
  if (holdEndDate < holdStartDate) {
    return {
      valid: false,
      reason: 'HOLD_END_BEFORE_START',
      message: '홀딩 종료일은 시작일보다 빠를 수 없습니다.',
      holdDays: 0,
    };
  }

  const holdDays = calculateDaysBetween(holdStartDate, holdEndDate);

  // 5. 1회 최소/최대 일수
  if (holdDays < policy.minHoldDays) {
    return {
      valid: false,
      reason: 'LESS_THAN_MIN_DAYS',
      message: `최소 홀딩 일수(${policy.minHoldDays}일) 이상으로 신청해야 합니다. (신청: ${holdDays}일)`,
      holdDays,
    };
  }

  if (holdDays > policy.maxHoldDaysPerTime) {
    return {
      valid: false,
      reason: 'EXCEEDS_MAX_DAYS_PER_TIME',
      message: `1회 최대 홀딩 일수(${policy.maxHoldDaysPerTime}일)를 초과할 수 없습니다. (신청: ${holdDays}일)`,
      holdDays,
    };
  }

  const existingRecords = (pass.holdRecords ?? []).filter((r) => r.status !== 'CANCELLED');

  // 6. 중복 홀딩 구간 검사
  const hasOverlap = existingRecords.some((r) => {
    return !(holdEndDate < r.startDate || holdStartDate > r.endDate);
  });
  if (hasOverlap) {
    return {
      valid: false,
      reason: 'OVERLAPPING_HOLD_EXISTS',
      message: '이미 등록된 홀딩 기간과 중복됩니다.',
      holdDays,
    };
  }

  // 7. 연간 횟수 제한 (시작 연도 기준)
  const targetYear = holdStartDate.slice(0, 4);
  const sameYearRecords = existingRecords.filter((r) => r.startDate.startsWith(targetYear));
  if (sameYearRecords.length >= policy.maxHoldCountPerYear) {
    return {
      valid: false,
      reason: 'EXCEEDS_MAX_COUNT_PER_YEAR',
      message: `연간 최대 홀딩 횟수(${policy.maxHoldCountPerYear}회)를 초과했습니다.`,
      holdDays,
    };
  }

  // 8. 연간 누적 총 일수 제한
  const totalExistingDays = sameYearRecords.reduce((sum, r) => sum + r.days, 0);
  if (totalExistingDays + holdDays > policy.maxTotalHoldDays) {
    return {
      valid: false,
      reason: 'EXCEEDS_MAX_TOTAL_DAYS',
      message: `연간 누적 최대 홀딩 일수(${policy.maxTotalHoldDays}일)를 초과합니다. (기존: ${totalExistingDays}일 + 신청: ${holdDays}일)`,
      holdDays,
    };
  }

  return {
    valid: true,
    holdDays,
  };
}

/**
 * 홀딩 적용 및 만료일 자동 연장 상태머신
 */
export function applyHolding(
  pass: HoldablePass,
  holdStartDate: string,
  holdEndDate: string,
  reason: string,
  policy: HoldingPolicy = DEFAULT_HOLDING_POLICY,
  todayStr: string = formatUtcDate(new Date())
): { updatedPass: HoldablePass; success: boolean; error?: string } {
  const validation = validateHoldingRequest(pass, holdStartDate, holdEndDate, policy, todayStr);
  if (!validation.valid) {
    return { updatedPass: pass, success: false, error: validation.message };
  }

  const { newEndDate, extendedDays } = calculateHoldingExtension(
    pass.endDate,
    holdStartDate,
    holdEndDate
  );

  const isCurrentActiveHold = holdStartDate <= todayStr && todayStr <= holdEndDate;
  const holdStatus = isCurrentActiveHold ? 'ACTIVE' : 'SCHEDULED';

  const newRecord: HoldRecord = {
    id: `hold-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    startDate: holdStartDate,
    endDate: holdEndDate,
    days: extendedDays,
    reason,
    status: holdStatus,
    appliedAt: new Date().toISOString(),
  };

  const nextStatus = isCurrentActiveHold ? 'PAUSED' : pass.status;

  return {
    updatedPass: {
      ...pass,
      status: nextStatus,
      endDate: newEndDate,
      holdRecords: [...(pass.holdRecords ?? []), newRecord],
    },
    success: true,
  };
}

/**
 * 홀딩 조기 종료/복귀 처리 (사용하지 않은 남은 일수만큼 연장일수 재조정)
 */
export function terminateHoldingEarly(
  pass: HoldablePass,
  holdId: string,
  actualResumeDate: string
): { updatedPass: HoldablePass; success: boolean; restoredDays: number; error?: string } {
  const records = pass.holdRecords ?? [];
  const targetRecord = records.find((r) => r.id === holdId && r.status === 'ACTIVE');

  if (!targetRecord) {
    return { updatedPass: pass, success: false, restoredDays: 0, error: '활성 홀딩 기록을 찾을 수 없습니다.' };
  }

  if (actualResumeDate < targetRecord.startDate) {
    return { updatedPass: pass, success: false, restoredDays: 0, error: '복귀일은 홀딩 시작일 이전일 수 없습니다.' };
  }

  // 실제 사용된 일수 계산
  const actualUsedDays = calculateDaysBetween(targetRecord.startDate, actualResumeDate);
  const unusedDays = Math.max(0, targetRecord.days - actualUsedDays);

  // 미사용 일수만큼 endDate 앞당기기
  const adjustedEndDate = addHoldingDaysToDate(pass.endDate, -unusedDays);

  const updatedRecords: HoldRecord[] = records.map((r) => {
    if (r.id === holdId) {
      return {
        ...r,
        endDate: actualResumeDate,
        days: actualUsedDays,
        status: 'COMPLETED',
      };
    }
    return r;
  });

  return {
    updatedPass: {
      ...pass,
      status: 'ACTIVE',
      endDate: adjustedEndDate,
      holdRecords: updatedRecords,
    },
    success: true,
    restoredDays: unusedDays,
  };
}
