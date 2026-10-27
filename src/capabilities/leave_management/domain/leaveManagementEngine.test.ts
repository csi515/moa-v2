import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getScheduledDailyHours,
  calculateDeductionHours,
  validateLeaveRequest,
  applyLeaveApproval,
  accrueAnnualLeaveHours,
  type StaffLeaveBalance,
  type StaffLeaveRequest,
} from './leaveManagementEngine';

describe('LeaveManagementEngine', () => {
  describe('getScheduledDailyHours (유연근무제 소정근로시간 매핑)', () => {
    it('9-9-9-9-4제에서 월요일은 9시간, 금요일은 4시간, 일요일은 0시간이어야 한다', () => {
      // 2026-10-19는 월요일
      const monday = getScheduledDailyHours('2026-10-19', 'flexible_four_point_five');
      assert.equal(monday.scheduledHours, 9);
      assert.match(monday.dayLabel, /월요일/);

      // 2026-10-23은 금요일
      const friday = getScheduledDailyHours('2026-10-23', 'flexible_four_point_five');
      assert.equal(friday.scheduledHours, 4);
      assert.match(friday.dayLabel, /금요일/);

      // 2026-10-25는 일요일
      const sunday = getScheduledDailyHours('2026-10-25', 'flexible_four_point_five');
      assert.equal(sunday.scheduledHours, 0);
    });

    it('표준 8시간제에서는 월요일과 금요일 모두 8시간이어야 한다', () => {
      const monday = getScheduledDailyHours('2026-10-19', 'standard_eight');
      assert.equal(monday.scheduledHours, 8);

      const friday = getScheduledDailyHours('2026-10-23', 'standard_eight');
      assert.equal(friday.scheduledHours, 8);
    });

    it('커스텀 근무표 맵이 제공되면 해당 시간이 최우선 적용되어야 한다', () => {
      const custom = getScheduledDailyHours('2026-10-23', 'flexible_four_point_five', {
        '2026-10-23': 6,
      });
      assert.equal(custom.scheduledHours, 6);
    });
  });

  describe('calculateDeductionHours (차감 시간 계산)', () => {
    it('full_day 모드에서는 당일 소정근로시간을 그대로 반환해야 한다', () => {
      assert.equal(calculateDeductionHours('full_day', 4), 4);
      assert.equal(calculateDeductionHours('full_day', 9), 9);
    });

    it('time_slot 모드에서는 14:00 ~ 16:00 지정 시 정확히 2시간을 반환해야 한다', () => {
      const hours = calculateDeductionHours('time_slot', 8, {
        startTime: '14:00',
        endTime: '16:00',
      });
      assert.equal(hours, 2);
    });

    it('time_slot 모드에서 30분 단위(13:30 ~ 15:00) 지정 시 1.5시간을 반환해야 한다', () => {
      const hours = calculateDeductionHours('time_slot', 8, {
        startTime: '13:30',
        endTime: '15:00',
      });
      assert.equal(hours, 1.5);
    });

    it('종료 시간이 시작 시간보다 앞서거나 같으면 0을 반환해야 한다', () => {
      const hours = calculateDeductionHours('time_slot', 8, {
        startTime: '16:00',
        endTime: '15:00',
      });
      assert.equal(hours, 0);
    });
  });

  describe('validateLeaveRequest', () => {
    const mockBalance: StaffLeaveBalance = {
      staffId: 'staff-1',
      staffName: '홍길동',
      totalAccruedHours: 120,
      usedHours: 40,
      remainingHours: 80,
    };

    it('잔여 시간 범위 내이고 승인권자가 지정되어 있으면 유효해야 한다', () => {
      const res = validateLeaveRequest(mockBalance, 4, 'mgr-1', '개인 사유');
      assert.equal(res.valid, true);
    });

    it('승인권자 미지정 시 유효하지 않아야 한다', () => {
      const res = validateLeaveRequest(mockBalance, 4, '', '개인 사유');
      assert.equal(res.valid, false);
      assert.match(res.error || '', /승인권자/);
    });

    it('사유 미입력 시 유효하지 않아야 한다', () => {
      const res = validateLeaveRequest(mockBalance, 4, 'mgr-1', '  ');
      assert.equal(res.valid, false);
      assert.match(res.error || '', /사유/);
    });

    it('잔여 시간을 초과하여 신청하면 차단되어야 한다', () => {
      const res = validateLeaveRequest(mockBalance, 85, 'mgr-1', '장기 휴가');
      assert.equal(res.valid, false);
      assert.match(res.error || '', /부족합니다/);
    });
  });

  describe('applyLeaveApproval', () => {
    const mockBalance: StaffLeaveBalance = {
      staffId: 'staff-1',
      staffName: '김철수',
      totalAccruedHours: 120,
      usedHours: 20,
      remainingHours: 100,
    };

    const mockRequest: StaffLeaveRequest = {
      id: 'req-1',
      organizationId: 'org-1',
      staffId: 'staff-1',
      staffName: '김철수',
      requestDate: '2026-10-23',
      deductionHours: 4,
      leaveType: 'annual',
      reason: '금요일 반일 휴가',
      approverId: 'mgr-1',
      status: 'pending',
      createdAt: '2026-10-18T10:00:00Z',
    };

    it('승인 시 잔여 시간이 원자적으로 차감되고 근무표 태그가 생성되어야 한다', () => {
      const result = applyLeaveApproval(mockBalance, mockRequest, {
        approverId: 'mgr-1',
        isApproved: true,
      });

      assert.equal(result.updatedRequest.status, 'approved');
      assert.equal(result.updatedBalance.usedHours, 24);
      assert.equal(result.updatedBalance.remainingHours, 96);
      assert.equal(result.scheduleTag, '휴가(4h)');
    });

    it('반려 시에는 시간이 차감되지 않고 사유가 기록되어야 한다', () => {
      const result = applyLeaveApproval(mockBalance, mockRequest, {
        approverId: 'mgr-1',
        isApproved: false,
        rejectionReason: '당일 긴급 납품 일정으로 인한 반려',
      });

      assert.equal(result.updatedRequest.status, 'rejected');
      assert.equal(result.updatedRequest.rejectionReason, '당일 긴급 납품 일정으로 인한 반려');
      assert.equal(result.updatedBalance.usedHours, 20);
      assert.equal(result.updatedBalance.remainingHours, 100);
      assert.equal(result.scheduleTag, undefined);
    });
  });

  describe('accrueAnnualLeaveHours', () => {
    it('연차 시간 추가 부여 시 총 발생 시간과 잔여 시간이 함께 증가해야 한다', () => {
      const initial: StaffLeaveBalance = {
        staffId: 'staff-1',
        staffName: '이영희',
        totalAccruedHours: 80,
        usedHours: 30,
        remainingHours: 50,
      };

      const accrued = accrueAnnualLeaveHours(initial, 16);
      assert.equal(accrued.totalAccruedHours, 96);
      assert.equal(accrued.usedHours, 30);
      assert.equal(accrued.remainingHours, 66);
    });
  });
});
