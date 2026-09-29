import { getCoreClient } from '@/lib/supabase';
import { ScheduleService } from '@/core/services/scheduleService';
import { getPassRemaining } from '@/core/schedules/sessionPassUtils';

export interface StudentPortalEnrollment {
  enrollmentId: string;
  organizationId: string;
  organizationName: string;
  industryType: string;
  customerId: string;
  status: string;
  enrolledAt: string | null;
  leftAt: string | null;
}

export interface StudentPortalContext {
  student: {
    studentId: string;
    displayName: string;
    birthDate: string | null;
    userId: string | null;
  } | null;
  enrollments: StudentPortalEnrollment[];
}

function mapEnrollment(raw: Record<string, unknown>): StudentPortalEnrollment {
  return {
    enrollmentId: String(raw.enrollment_id),
    organizationId: String(raw.organization_id),
    organizationName: String(raw.organization_name),
    industryType: String(raw.industry_type || 'piano'),
    customerId: String(raw.customer_id),
    status: String(raw.status),
    enrolledAt: (raw.enrolled_at as string) || null,
    leftAt: (raw.left_at as string) || null,
  };
}

/** 성인 수강생 포털 컨텍스트 (RPC) */
export async function fetchStudentPortalContext(): Promise<StudentPortalContext> {
  const { data, error } = await getCoreClient().rpc('get_my_student_portal_context' as never);
  if (error) {
    throw new Error(error.message || '수강생 정보를 불러오지 못했습니다.');
  }
  const payload = (data || {}) as {
    student?: {
      studentId?: string;
      displayName?: string;
      birthDate?: string | null;
      userId?: string | null;
    } | null;
    enrollments?: Record<string, unknown>[] | string;
  };

  const enrollmentsRaw = Array.isArray(payload.enrollments)
    ? payload.enrollments
    : typeof payload.enrollments === 'string'
      ? (JSON.parse(payload.enrollments || '[]') as Record<string, unknown>[])
      : [];

  return {
    student: payload.student?.studentId
      ? {
          studentId: payload.student.studentId,
          displayName: payload.student.displayName || '',
          birthDate: payload.student.birthDate ?? null,
          userId: payload.student.userId ?? null,
        }
      : null,
    enrollments: enrollmentsRaw.map(mapEnrollment),
  };
}

/** 잔여 이용권 (org hydrate 이후 Storage/ScheduleService) */
export function getMyPassSummary(customerId: string): {
  remaining: number;
  passes: { id: string; label: string; remaining: number; total: number; expiresAt?: string }[];
} {
  const passes = ScheduleService.getCustomerSessionPasses(customerId);
  return {
    remaining: ScheduleService.getCustomerRemainingSessions(customerId),
    passes: passes.map((p) => ({
      id: p.id,
      label: p.label,
      remaining: getPassRemaining(p),
      total: p.totalSessions,
      expiresAt: p.expiresAt,
    })),
  };
}
