export interface StudyGroupMember {
  memberId: string;
  memberName: string;
  depositAmount: number;
  attendanceRate: number; // 0 ~ 100
  penaltyDeducted: number;
  refundAmount: number;
}

export interface StudyGroup {
  id: string;
  groupName: string;
  subject: string;
  minAttendanceRate: number; // e.g. 80
  members: StudyGroupMember[];
  status: 'recruiting' | 'active' | 'settled';
}

export function calculateMemberSettlement(
  deposit: number,
  attendanceRate: number,
  minRate: number
): { penalty: number; refund: number } {
  if (attendanceRate >= minRate) {
    return { penalty: 0, refund: deposit };
  }

  // 기준 대비 부족한 비율만큼 보증금 차감 (비례 감액)
  const deficitRatio = (minRate - attendanceRate) / minRate;
  const penalty = Math.min(deposit, Math.round(deposit * deficitRatio));
  const refund = deposit - penalty;

  return { penalty, refund };
}

export function settleStudyGroup(group: StudyGroup): StudyGroup {
  const settledMembers = group.members.map((member) => {
    const { penalty, refund } = calculateMemberSettlement(
      member.depositAmount,
      member.attendanceRate,
      group.minAttendanceRate
    );
    return {
      ...member,
      penaltyDeducted: penalty,
      refundAmount: refund,
    };
  });

  return {
    ...group,
    members: settledMembers,
    status: 'settled',
  };
}

export function calculateGroupTotalPenalty(group: StudyGroup): number {
  return group.members.reduce((sum, m) => sum + m.penaltyDeducted, 0);
}
