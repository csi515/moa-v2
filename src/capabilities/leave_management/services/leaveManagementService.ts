/**
 * Leave Management Service
 *
 * Core-Capability-Preset 원칙을 준수하는 서비스 레이어.
 * - 직원별 휴가 시간 잔여 조회 및 적립
 * - 시간 단위 휴가 신청 및 승인권자 결재 처리
 * - 인메모리/로컬 폴백 및 Supabase DB 연동
 */

import { getCoreClient } from '@/lib/supabase';
import {
  applyLeaveApproval,
  accrueAnnualLeaveHours,
  type StaffLeaveBalance,
  type StaffLeaveRequest,
} from '../domain/leaveManagementEngine';

// 초기 샘플 데이터
export const INITIAL_STAFF_BALANCES: StaffLeaveBalance[] = [
  {
    staffId: 'staff-1',
    staffName: '이지원 매니저',
    departmentId: 'dept-eng',
    departmentName: '플랫폼개발팀',
    roleTitle: 'Frontend Engineer',
    totalAccruedHours: 120,
    usedHours: 37,
    remainingHours: 83,
  },
  {
    staffId: 'staff-2',
    staffName: '박준영 선임',
    departmentId: 'dept-eng',
    departmentName: '플랫폼개발팀',
    roleTitle: 'Backend Engineer',
    totalAccruedHours: 120,
    usedHours: 16,
    remainingHours: 104,
  },
  {
    staffId: 'staff-3',
    staffName: '김수현 팀장',
    departmentId: 'dept-eng',
    departmentName: '플랫폼개발팀',
    roleTitle: 'Team Lead / Approver',
    totalAccruedHours: 140,
    usedHours: 42,
    remainingHours: 98,
  },
  {
    staffId: 'staff-4',
    staffName: '최윤아 대리',
    departmentId: 'dept-ops',
    departmentName: '사업운영팀',
    roleTitle: 'Ops Specialist',
    totalAccruedHours: 120,
    usedHours: 48,
    remainingHours: 72,
  },
];

export const INITIAL_LEAVE_REQUESTS: StaffLeaveRequest[] = [
  {
    id: 'req-init-1',
    organizationId: 'org-sample',
    staffId: 'staff-1',
    staffName: '이지원 매니저',
    requestDate: '2026-10-23',
    deductionHours: 4,
    leaveType: 'annual',
    reason: '금요일 4시간 근무일 전일 휴가 (주말 연결 리프레시)',
    approverId: 'staff-3',
    approverName: '김수현 팀장',
    status: 'pending',
    createdAt: '2026-10-18T09:30:00Z',
  },
  {
    id: 'req-init-2',
    organizationId: 'org-sample',
    staffId: 'staff-2',
    staffName: '박준영 선임',
    requestDate: '2026-10-20',
    startTime: '14:00',
    endTime: '16:00',
    deductionHours: 2,
    leaveType: 'annual',
    reason: '치과 정기 진료를 위한 오후 2시간 외출',
    approverId: 'staff-3',
    approverName: '김수현 팀장',
    status: 'approved',
    createdAt: '2026-10-17T11:00:00Z',
    approvedAt: '2026-10-17T13:20:00Z',
  },
];

/**
 * 전 직원 휴가 잔여 대장 조회
 */
export async function fetchLeaveBalances(): Promise<StaffLeaveBalance[]> {
  try {
    const client = getCoreClient();
    const { data, error } = await client
      .from('staff_leave_balances')
      .select('*');

    if (error || !data || data.length === 0) {
      return [...INITIAL_STAFF_BALANCES];
    }

    return data.map((row: any) => ({
      staffId: row.staff_id,
      staffName: row.staff_name || '임직원',
      totalAccruedHours: row.total_accrued_hours ?? 120,
      usedHours: row.used_hours ?? 0,
      remainingHours: row.remaining_hours ?? 120,
      departmentId: row.department_id,
      departmentName: row.department_name,
      roleTitle: row.role_title,
    }));
  } catch {
    return [...INITIAL_STAFF_BALANCES];
  }
}

/**
 * 휴가 신청 내역 조회
 */
export async function fetchLeaveRequests(): Promise<StaffLeaveRequest[]> {
  try {
    const client = getCoreClient();
    const { data, error } = await client
      .from('staff_leave_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return [...INITIAL_LEAVE_REQUESTS];
    }

    return data.map((row: any) => ({
      id: row.id,
      organizationId: row.organization_id,
      staffId: row.staff_id,
      staffName: row.staff_name,
      requestDate: row.request_date,
      startTime: row.start_time,
      endTime: row.end_time,
      deductionHours: row.deduction_hours,
      leaveType: row.leave_type || 'annual',
      reason: row.reason,
      approverId: row.approver_id,
      approverName: row.approver_name,
      status: row.status || 'pending',
      rejectionReason: row.rejection_reason,
      createdAt: row.created_at,
      approvedAt: row.approved_at,
    }));
  } catch {
    return [...INITIAL_LEAVE_REQUESTS];
  }
}
