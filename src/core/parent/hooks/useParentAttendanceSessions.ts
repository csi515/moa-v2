import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AttendanceSession } from '@/core/attendance/types';
import { isSupabaseConfigured } from '@/lib/supabase';
import { StorageService } from '@/services/storage';
import { fetchParentAttendanceSessions } from '../services/parentAttendanceService';

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getLocalSessions(customerId: string, limit: number): AttendanceSession[] {
  return StorageService.getAttendanceSessions()
    .filter((s) => s.customerId === customerId)
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
    .slice(0, limit);
}

export interface UseParentAttendanceSessionsResult {
  sessions: AttendanceSession[];
  todaySession: AttendanceSession | undefined;
  loading: boolean;
  error: string | null;
  isRemote: boolean;
  refresh: () => Promise<void>;
}

/** 학부모 포털: Supabase RLS 출결 조회 (오프라인 시 로컬 fallback) */
export function useParentAttendanceSessions(
  organizationId: string | undefined,
  customerId: string,
  limit = 30
): UseParentAttendanceSessionsResult {
  const [sessions, setSessions] = useState<AttendanceSession[]>(() =>
    getLocalSessions(customerId, limit)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRemote, setIsRemote] = useState(false);

  const refresh = useCallback(async () => {
    const local = getLocalSessions(customerId, limit);
    setSessions(local);
    setIsRemote(false);
    setError(null);

    if (!isSupabaseConfigured() || !organizationId) {
      return;
    }

    setLoading(true);
    try {
      const remote = await fetchParentAttendanceSessions(organizationId, customerId, limit);
      setSessions(remote);
      setIsRemote(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '출결 정보를 불러오지 못했습니다.');
      setSessions(local);
      setIsRemote(false);
    } finally {
      setLoading(false);
    }
  }, [organizationId, customerId, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const today = todayDateString();
  const todaySession = useMemo(
    () => sessions.find((s) => s.sessionDate === today),
    [sessions, today]
  );

  return { sessions, todaySession, loading, error, isRemote, refresh };
}
