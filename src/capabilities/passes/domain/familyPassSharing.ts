/**
 * 패밀리(가족/형제/자매) 공유 풀 수강권 엔진 (Pure Domain Function)
 * 주 계약자(보호자) 1인의 이용권을 등록된 가족 구성원 N명이 공동 차감 및 사용 통계 관리
 */

export interface FamilyMember {
  memberId: string;
  name: string;
  relationship: 'CHILD' | 'SPOUSE' | 'PARENT' | 'SIBLING' | 'OTHER';
  isActive: boolean;
  dailyDeductionLimit?: number; // 1일 최대 차감 가능 횟수 (기본 1회)
}

export interface FamilyGroup {
  groupId: string;
  representativeCustomerId: string; // 학부모/대표 보호자 고객 ID
  groupName: string; // 예: "민지·민수 가족"
  members: FamilyMember[];
}

export interface SharedPass {
  id: string;
  primaryCustomerId: string;
  totalCount: number;
  remainingCount: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'PAUSED';
  sharedFamilyGroupId?: string;
}

export interface FamilyDeductionValidationResult {
  valid: boolean;
  reason?:
    | 'PASS_NOT_ACTIVE'
    | 'PASS_EXHAUSTED'
    | 'DATE_OUT_OF_RANGE'
    | 'FAMILY_GROUP_MISMATCH'
    | 'MEMBER_NOT_FOUND'
    | 'MEMBER_INACTIVE'
    | 'DAILY_LIMIT_EXCEEDED';
  message?: string;
}

export interface FamilyPassUsageEntry {
  id: string;
  passId: string;
  familyGroupId: string;
  memberId: string;
  memberName: string;
  deductedCount: number;
  usedAt: string; // YYYY-MM-DD
  timestamp: string; // ISO
  memo?: string;
}

/**
 * 가족 구성원의 공유 수강권 사용 가능 여부 사전 검증
 */
export function validateFamilyPassDeduction(
  pass: SharedPass,
  familyGroup: FamilyGroup,
  requestingMemberId: string,
  targetDate: string,
  memberTodayUsageCount: number = 0
): FamilyDeductionValidationResult {
  // 1. 수강권 상태
  if (pass.status !== 'ACTIVE') {
    return {
      valid: false,
      reason: pass.status === 'EXHAUSTED' ? 'PASS_EXHAUSTED' : 'PASS_NOT_ACTIVE',
      message: `이용권이 활성 상태가 아닙니다. (현재 상태: ${pass.status})`,
    };
  }

  // 2. 잔여 횟수
  if (pass.remainingCount <= 0) {
    return {
      valid: false,
      reason: 'PASS_EXHAUSTED',
      message: '이용권의 잔여 횟수가 모두 소진되었습니다.',
    };
  }

  // 3. 유효 기간
  if (targetDate < pass.startDate || targetDate > pass.endDate) {
    return {
      valid: false,
      reason: 'DATE_OUT_OF_RANGE',
      message: `이용권 유효 기간(${pass.startDate} ~ ${pass.endDate}) 밖입니다.`,
    };
  }

  // 4. 가족 그룹 매칭
  if (pass.sharedFamilyGroupId && pass.sharedFamilyGroupId !== familyGroup.groupId) {
    return {
      valid: false,
      reason: 'FAMILY_GROUP_MISMATCH',
      message: '이용권에 지정된 가족 그룹과 일치하지 않습니다.',
    };
  }

  // 5. 요청자가 가족 대표이거나 구성원인지 확인
  const isRepresentative = requestingMemberId === familyGroup.representativeCustomerId;
  const member = familyGroup.members.find((m) => m.memberId === requestingMemberId);

  if (!isRepresentative && !member) {
    return {
      valid: false,
      reason: 'MEMBER_NOT_FOUND',
      message: '해당 가족 그룹의 등록된 구성원이 아닙니다.',
    };
  }

  // 6. 멤버 활성 상태 확인
  if (member && !member.isActive) {
    return {
      valid: false,
      reason: 'MEMBER_INACTIVE',
      message: '해당 가족 구성원은 현재 이용 정지/비활성 상태입니다.',
    };
  }

  // 7. 1일 차감 한도 검사
  const dailyLimit = member?.dailyDeductionLimit ?? 2; // 기본 1인당 1일 최대 2회까지 허용
  if (memberTodayUsageCount >= dailyLimit) {
    return {
      valid: false,
      reason: 'DAILY_LIMIT_EXCEEDED',
      message: `1일 최대 차감 횟수(${dailyLimit}회)를 초과했습니다.`,
    };
  }

  return { valid: true };
}

/**
 * 가족 구성원 N:1 수강권 원자적 차감 실행
 */
export function deductFamilyPass(
  pass: SharedPass,
  familyGroup: FamilyGroup,
  requestingMemberId: string,
  targetDate: string,
  memberTodayUsageCount: number = 0,
  memo?: string
): {
  success: boolean;
  updatedPass: SharedPass;
  usageEntry?: FamilyPassUsageEntry;
  error?: string;
} {
  const check = validateFamilyPassDeduction(
    pass,
    familyGroup,
    requestingMemberId,
    targetDate,
    memberTodayUsageCount
  );

  if (!check.valid) {
    return {
      success: false,
      updatedPass: pass,
      error: check.message,
    };
  }

  const member = familyGroup.members.find((m) => m.memberId === requestingMemberId);
  const memberName =
    member?.name ??
    (requestingMemberId === familyGroup.representativeCustomerId ? '가족대표(보호자)' : '알 수 없음');

  const nextRemaining = Math.max(0, pass.remainingCount - 1);
  const nextStatus = nextRemaining === 0 ? 'EXHAUSTED' : 'ACTIVE';

  const entry: FamilyPassUsageEntry = {
    id: `fam-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    passId: pass.id,
    familyGroupId: familyGroup.groupId,
    memberId: requestingMemberId,
    memberName,
    deductedCount: 1,
    usedAt: targetDate,
    timestamp: new Date().toISOString(),
    memo,
  };

  const updatedPass: SharedPass = {
    ...pass,
    remainingCount: nextRemaining,
    status: nextStatus,
  };

  return {
    success: true,
    updatedPass,
    usageEntry: entry,
  };
}

/**
 * 가족 구성원별 수강권 누적 사용 통계 집계
 */
export function aggregateFamilyUsageStats(
  usageEntries: FamilyPassUsageEntry[],
  familyGroup: FamilyGroup
): Record<string, { memberName: string; relationship: string; usedCount: number }> {
  const stats: Record<string, { memberName: string; relationship: string; usedCount: number }> = {};

  // 초기화
  familyGroup.members.forEach((m) => {
    stats[m.memberId] = {
      memberName: m.name,
      relationship: m.relationship,
      usedCount: 0,
    };
  });

  // 대표 보호자 항목 추가
  if (!stats[familyGroup.representativeCustomerId]) {
    stats[familyGroup.representativeCustomerId] = {
      memberName: '보호자(대표)',
      relationship: 'PARENT',
      usedCount: 0,
    };
  }

  // 집계
  usageEntries.forEach((entry) => {
    if (stats[entry.memberId]) {
      stats[entry.memberId].usedCount += entry.deductedCount;
    } else {
      stats[entry.memberId] = {
        memberName: entry.memberName,
        relationship: 'OTHER',
        usedCount: entry.deductedCount,
      };
    }
  });

  return stats;
}
