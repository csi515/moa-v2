import { getCoreClient } from '@/lib/supabase';
import type { AttendanceSession } from '@/core/attendance/types';
import { coreRowToSession } from '@/services/adapters/sync/attendanceEntityMappers';

/** 학부모 포털: Supabase RLS로 자녀 출결 세션 조회 */
export async function fetchParentAttendanceSessions(
  organizationId: string,
  customerId: string,
  limit = 30
): Promise<AttendanceSession[]> {
  const { data, error } = await getCoreClient()
    .from('attendance_sessions')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('customer_id', customerId)
    .order('session_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(coreRowToSession);
}
