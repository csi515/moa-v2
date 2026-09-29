import { getCoreClient } from '@/lib/supabase';
import { notificationRowToApp } from '@/services/adapters/sync/entityMappers';
import type { AppNotification } from '@/types';

/** 학부모 포털: Supabase RLS로 자녀 관련 알림 조회 (클래스/전체 대상 포함) */
export async function fetchParentNotificationsForStudent(
  organizationId: string,
  _customerId: string,
  limit = 30
): Promise<AppNotification[]> {
  const { data, error } = await getCoreClient()
    .from('notifications')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'sent')
    .in('type', ['notice', 'announcement', 'attendance'])
    .order('sent_at', { ascending: false })
    .limit(limit * 3);

  if (error) throw error;

  return (data ?? []).map(notificationRowToApp);
}
