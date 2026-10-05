import type { Teacher } from '@/types';
import type { TeacherPayType } from '../billingLedgerTypes';

export type PayrollSettlementStatus = 'pending' | 'confirmed' | 'expensed';

export interface TeacherPayrollRow {
  teacherId: string;
  teacherName: string;
  /** Phase 3: 범용 Staff 앨리어스 */
  staffId?: string;
  staffName?: string;
  status: Teacher['status'];
  payType: TeacherPayType;
  /** 정산 대상 실적 (레슨 회수 / 출근 회수 / 근무 시간 / 월급=1) */
  quantity: number;
  /** 자동 집계된 레슨 횟수 (참고용) */
  lessonCount: number;
  /** 단위 지급액 또는 월급 */
  rate: number;
  /** 실적 × 단가 (조정 전) */
  calculatedAmount: number;
  adjustmentAmount: number;
  adjustmentReason?: string;
  /** 최종 정산 금액 */
  finalAmount: number;
  settlementStatus: PayrollSettlementStatus;
  settlementId?: string;
  settledExpenseId?: string;
  settledAmount?: number;
  /** 출근·근무시간처럼 수동 실적 입력이 필요한지 */
  requiresManualQuantity: boolean;
}

export type PayrollAdjustmentDraft = { amount: number; reason?: string };

export interface TeacherPayrollTotals {
  teacherCount: number;
  /** Phase 3: 범용 Staff 앨리어스 */
  staffCount?: number;
  pendingAmount: number;
  pendingCount: number;
  settledAmount: number;
  settledCount: number;
  lessonTotal: number;
  attendanceTotal: number;
  workHoursTotal: number;
}

/** Phase 3: 범용 StaffPayroll 타입 앨리어스 */
export type StaffPayrollRow = TeacherPayrollRow;
export type StaffPayrollTotals = TeacherPayrollTotals;
