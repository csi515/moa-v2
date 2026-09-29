import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppNotification, Student } from '@/types';
import { isSupabaseConfigured } from '@/lib/supabase';
import { StorageService } from '@/services/storage';
import { getPortalFeedForStudent } from '@/core/notices/noticeHelpers';
import { fetchParentNotificationsForStudent } from '../services/parentNotificationService';

function getLocalFeed(student: Student): AppNotification[] {
  return getPortalFeedForStudent(StorageService.getNotifications(), student);
}

export interface UseParentPortalNotificationsResult {
  notifications: AppNotification[];
  loading: boolean;
  error: string | null;
  isRemote: boolean;
  refresh: () => Promise<void>;
}

/** 학부모 포털 알림 피드 — 안내장 + 출결 알림 (Supabase RLS, 오프라인 fallback) */
export function useParentPortalNotifications(
  organizationId: string | undefined,
  student: Student,
  limit = 30
): UseParentPortalNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getLocalFeed(student));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRemote, setIsRemote] = useState(false);

  const refresh = useCallback(async () => {
    const local = getLocalFeed(student);
    setNotifications(local);
    setIsRemote(false);
    setError(null);

    if (!isSupabaseConfigured() || !organizationId) {
      return;
    }

    setLoading(true);
    try {
      const remote = await fetchParentNotificationsForStudent(organizationId, student.id, limit);
      setNotifications(getPortalFeedForStudent(remote, student));
      setIsRemote(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알림을 불러오지 못했습니다.');
      setNotifications(local);
      setIsRemote(false);
    } finally {
      setLoading(false);
    }
  }, [organizationId, student, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sorted = useMemo(
    () =>
      [...notifications].sort((a, b) =>
        (b.sentAt || b.createdAt || '').localeCompare(a.sentAt || a.createdAt || '')
      ),
    [notifications]
  );

  return { notifications: sorted, loading, error, isRemote, refresh };
}
