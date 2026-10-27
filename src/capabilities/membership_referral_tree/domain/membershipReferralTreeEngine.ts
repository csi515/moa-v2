export interface FamilyMember {
  memberId: string;
  name: string;
  relationship: 'head' | 'child' | 'spouse' | 'sibling' | 'other';
  enrolledCoursesCount: number;
  monthlyTuition: number;
}

export interface FamilyGroup {
  groupId: string;
  familyName: string;
  representativeMemberId: string;
  representativeName: string;
  members: FamilyMember[];
  sharedCreditBalance: number; // 가족 공용 선불 크레딧
  createdAt: string;
}

export interface ReferralRecord {
  referralId: string;
  referrerMemberId: string;
  referrerName: string;
  refereeMemberId: string;
  refereeName: string;
  registeredDate: string;
  rewardType: 'credit_cash' | 'free_pass_days' | 'discount_coupon';
  rewardValue: number; // 예: 30000 (3만 크레딧) 또는 7 (7일 연장)
  status: 'pending' | 'rewarded' | 'expired';
}

export interface FamilyBillingCalculation {
  groupId: string;
  totalOriginalTuition: number;
  discountRatePercent: number;
  discountAmount: number;
  netPayableAmount: number;
  coveredBySharedCredit: number;
  finalOutOfPocketAmount: number;
  remainingSharedCredit: number;
}

/**
 * 형제/자매 결합 할인율 산출 규칙:
 * 1인: 0%
 * 2인 동시 재원: 기본 10% 감면
 * 3인 이상 동시 재원: 15% 감면
 */
export function calculateFamilyDiscountRate(activeMemberCount: number, baseRatePercent: number = 10): number {
  if (activeMemberCount <= 1) return 0;
  if (activeMemberCount === 2) return baseRatePercent;
  return baseRatePercent + 5; // 3인 이상 +5% 추가 우대
}

/**
 * 패밀리 그룹 결제 및 가족 공용 크레딧 차감 시뮬레이션
 */
export function calculateFamilyBilling(
  group: FamilyGroup,
  baseDiscountRate: number = 10,
  useCredit: boolean = true
): FamilyBillingCalculation {
  const totalOriginalTuition = group.members.reduce((sum, m) => sum + m.monthlyTuition, 0);
  const activeMembersWithTuition = group.members.filter(m => m.monthlyTuition > 0).length;
  const discountRatePercent = calculateFamilyDiscountRate(activeMembersWithTuition, baseDiscountRate);
  
  const discountAmount = Math.round(totalOriginalTuition * (discountRatePercent / 100));
  const netPayableAmount = Math.max(0, totalOriginalTuition - discountAmount);

  let coveredBySharedCredit = 0;
  let remainingSharedCredit = group.sharedCreditBalance;

  if (useCredit && group.sharedCreditBalance > 0) {
    coveredBySharedCredit = Math.min(group.sharedCreditBalance, netPayableAmount);
    remainingSharedCredit = group.sharedCreditBalance - coveredBySharedCredit;
  }

  const finalOutOfPocketAmount = netPayableAmount - coveredBySharedCredit;

  return {
    groupId: group.groupId,
    totalOriginalTuition,
    discountRatePercent,
    discountAmount,
    netPayableAmount,
    coveredBySharedCredit,
    finalOutOfPocketAmount,
    remainingSharedCredit,
  };
}

/**
 * 신규 회원을 기존 패밀리 그룹에 바인딩
 */
export function bindMemberToFamilyGroup(
  group: FamilyGroup,
  newMember: FamilyMember
): FamilyGroup {
  const exists = group.members.some(m => m.memberId === newMember.memberId);
  if (exists) {
    return group;
  }
  return {
    ...group,
    members: [...group.members, newMember],
  };
}

/**
 * 가족 공용 크레딧 충전
 */
export function depositSharedFamilyCredit(
  group: FamilyGroup,
  amount: number
): FamilyGroup {
  return {
    ...group,
    sharedCreditBalance: group.sharedCreditBalance + Math.max(0, amount),
  };
}

/**
 * 가족 공용 크레딧 차감
 */
export function deductSharedFamilyCredit(
  group: FamilyGroup,
  amount: number
): { updatedGroup: FamilyGroup; actualDeducted: number; success: boolean } {
  if (amount <= 0) {
    return { updatedGroup: group, actualDeducted: 0, success: true };
  }
  if (group.sharedCreditBalance < amount) {
    return { updatedGroup: group, actualDeducted: 0, success: false };
  }
  return {
    updatedGroup: {
      ...group,
      sharedCreditBalance: group.sharedCreditBalance - amount,
    },
    actualDeducted: amount,
    success: true,
  };
}

/**
 * 지인 추천 리워드 지급 처리
 */
export function grantReferralReward(record: ReferralRecord): ReferralRecord {
  if (record.status === 'rewarded') {
    return record;
  }
  return {
    ...record,
    status: 'rewarded',
  };
}
