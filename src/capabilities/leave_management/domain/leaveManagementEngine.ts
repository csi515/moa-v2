/**
 * Leave Management Domain Engine (시간 단위 정밀 차감형 휴가 관리)
 *
 * Core-Capability-Preset 원칙을 준수하는 순수 비즈니스 로직 도메인 엔진.
 * - 다양한 유연근무제(9-9-9-9-4제, 탄력근무, 파트타임 등)에 맞춘 소정근로시간 자동 매핑
 * - 시간(Hour) 단위 정밀 차감 및 실시간 잔여 시간 계산
 * - 승인권자 결재 워크플로 및 근무표(shift_schedule) 태그 생성
 * - 신규 입사자/정기 연차 시간 적립 및 통계
 */

export type LeaveType = 'annual' | 'official' | 'sick' | 'family_event' | 'special';

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: '연차 휴가',
  official: '공가 (공무/예비군)',
  sick: '병가 (질병/치료)',
  family_event: '경조사 휴가',
  special: '특별 포상 휴가',
};

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';

export interface StaffLeaveBalance {
  staffId: string;
  staffName: string;
  totalAccruedHours: number; // 총 발생 시간 (예: 120시간)
  usedHours: number; // 사용 시간
  remainingHours: number; // 잔여 시간
  departmentId?: string;
  departmentName?: string;
  roleTitle?: string;
}

export interface StaffLeaveRequest {
  id: string;
  organizationId: string;
  staffId: string;
  staffName: string;
  requestDate: string; // YYYY-MM-DD
  startTime?: string | null; // HH:mm
  endTime?: string | null; // HH:mm
  deductionHours: number; // 차감 시간
  leaveType: LeaveType;
  reason: string;
  approverId: string; // 승인권자 ID (필수)
  approverName?: string;
  status: LeaveRequestStatus;
  rejectionReason?: string | null;
  createdAt: string;
  approvedAt?: string | null;
}

export type WorkScheduleType = 'flexible_four_point_five' | 'standard_eight' | 'part_time_custom';

/**
 * 특정 일자의 요일과 유연근무제 스케줄에 따른 당일 소정근로시간을 산출합니다.
 * - flexible_four_point_five (9-9-9-9-4제): 월~목 9시간, 금요일 4시간, 주말 0시간
 * - standard_eight (표준 8시간제): 월~금 8시간, 주말 0시간
 */
export function getScheduledDailyHours(
  dateString: string,
  scheduleType: WorkScheduleType = 'flexible_four_point_five',
  customShiftHoursMap?: Record<string, number>
): { scheduledHours: number; dayLabel: string } {
  // customShiftHoursMap에 해당 날짜가 직접 지정되어 있다면 우선 적용
  if (customShiftHoursMap && typeof customShiftHoursMap[dateString] === 'number') {
    const hours = customShiftHoursMap[dateString];
    return { scheduledHours: hours, dayLabel: '커스텀 지정 근무' };
  }

  const d = new Date(dateString);
  const day = d.getDay(); // 0(일), 1(월), 2(화), 3(수), 4(목), 5(금), 6(토)
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dayLabel = dayNames[day] || '평일';

  if (day === 0 || day === 6) {
    return { scheduledHours: 0, dayLabel: `${dayLabel} (휴무)` };
  }

  if (scheduleType === 'flexible_four_point_five') {
    if (day === 5) {
      // 금요일 4시간 집중 근무
      return { scheduledHours: 4, dayLabel: '금요일 (유연 4시간)' };
    }
    // 월~목 9시간 근무
    return { scheduledHours: 9, dayLabel: `${dayLabel} (유연 9시간)` };
  }

  // standard_eight
  return { scheduledHours: 8, dayLabel: `${dayLabel} (표준 8시간)` };
}

/**
 * 사용 방식(전일 vs 시간 지정)에 따른 차감 시간을 정확하게 계산합니다.
 */
export function calculateDeductionHours(
  mode: 'full_day' | 'time_slot',
  scheduledHours: number,
  timeSlot?: { startTime: string; endTime: string }
): number {
  if (mode === 'full_day') {
    return scheduledHours;
  }

  if (!timeSlot || !timeSlot.startTime || !timeSlot.endTime) {
    return 0;
  }

  const [startHour, startMin] = timeSlot.startTime.split(':').map(Number);
  const [endHour, endMin] = timeSlot.endTime.split(':').map(Number);

  if (
    isNaN(startHour) ||
    isNaN(startMin) ||
    isNaN(endHour) ||
    isNaN(endMin)
  ) {
    return 0;
  }

  const startTotalMinutes = startHour * 60 + startMin;
  const endTotalMinutes = endHour * 60 + endMin;

  const diffMinutes = endTotalMinutes - startTotalMinutes;
  if (diffMinutes <= 0) {
    return 0;
  }

  // 30분 단위 소수점 1자리(0.5) 반환
  const hours = Math.round((diffMinutes / 60) * 10) / 10;
  return hours;
}

/**
 * 휴가 신청 유효성 검증
 */
export function validateLeaveRequest(
  balance: StaffLeaveBalance,
  deductionHours: number,
  approverId?: string,
  reason?: string
): { valid: boolean; error?: string } {
  if (!approverId || approverId.trim().length === 0) {
    return { valid: false, error: '사내 결재 승인권자(팀장/관리자)를 반드시 지정해야 합니다.' };
  }

  if (!reason || reason.trim().length === 0) {
    return { valid: false, error: '휴가 사유를 구체적으로 입력해주세요.' };
  }

  if (typeof deductionHours !== 'number' || deductionHours <= 0) {
    return { valid: false, error: '차감 휴가 시간은 0보다 커야 합니다.' };
  }

  if (balance.remainingHours < deductionHours) {
    return {
      valid: false,
      error: `잔여 휴가 시간(${balance.remainingHours}시간)이 신청 시간(${deductionHours}시간)보다 부족합니다.`,
    };
  }

  return { valid: true };
}

/**
 * 승인권자의 결재 처리 및 원자적 잔여 시간 차감
 */
export function applyLeaveApproval(
  balance: StaffLeaveBalance,
  request: StaffLeaveRequest,
  options: {
    approverId: string;
    isApproved: boolean;
    rejectionReason?: string;
  }
): {
  updatedBalance: StaffLeaveBalance;
  updatedRequest: StaffLeaveRequest;
  scheduleTag?: string;
} {
  const { isApproved, rejectionReason } = options;

  if (isApproved) {
    const updatedUsed = balance.usedHours + request.deductionHours;
    const updatedRemaining = Math.max(0, balance.totalAccruedHours - updatedUsed);

    const updatedBalance: StaffLeaveBalance = {
      ...balance,
      usedHours: updatedUsed,
      remainingHours: updatedRemaining,
    };

    const updatedRequest: StaffLeaveRequest = {
      ...request,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      rejectionReason: null,
    };

    const scheduleTag = `휴가(${request.deductionHours}h)`;

    return {
      updatedBalance,
      updatedRequest,
      scheduleTag,
    };
  }

  // 반려 처리 (시간 차감 없음)
  const updatedRequest: StaffLeaveRequest = {
    ...request,
    status: 'rejected',
    rejectionReason: rejectionReason || '승인권자에 의해 반려되었습니다.',
  };

  return {
    updatedBalance: { ...balance },
    updatedRequest,
  };
}

/**
 * 신규 입사자 또는 정기 연차 시간 부여
 */
export function accrueAnnualLeaveHours(
  balance: StaffLeaveBalance,
  hoursToAdd: number
): StaffLeaveBalance {
  const nextAccrued = balance.totalAccruedHours + hoursToAdd;
  const nextRemaining = nextAccrued - balance.usedHours;

  return {
    ...balance,
    totalAccruedHours: nextAccrued,
    remainingHours: nextRemaining,
  };
}
