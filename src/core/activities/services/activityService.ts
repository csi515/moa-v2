/**
 * 전사 단일 활동 스트림 서비스 (Universal Activity Stream).
 *
 * 고객(customer), 프로젝트(project), 과업(task), 계약(contract), 자원(resource) 등
 * 모든 엔터티에 일어난 활동(Activity)을 다형성(Polymorphic) 단일 스트림으로 적재·조회합니다.
 *
 * 아키텍처 규칙:
 * - core 계층에 위치하므로 capability/industry 모듈을 직접 import하지 않습니다.
 * - @/types barrel을 import하지 않습니다.
 */

import { getTenantStorageKey } from '../../../shared/utils/tenantStorage';

export interface ActivityItem {
  id?: string;
  organizationId: string;
  actorId?: string | null;
  actorName?: string | null;
  targetType: string; // 'customer', 'project', 'task', 'contract', 'resource', 'order'
  targetId: string;
  activityType: string; // 'created', 'status_changed', 'comment_added', 'payment_received', 'signed'
  title: string;
  content?: string | null;
  metadata?: Record<string, any>;
  createdAt?: string;
}

function getLocalActivityKey(orgId: string, targetType: string, targetId: string): string {
  return getTenantStorageKey(`moa_activities_${orgId}_${targetType}_${targetId}`);
}

/**
 * 신규 활동 기록
 */
export async function recordActivity(
  activity: ActivityItem,
  supabaseClient?: any
): Promise<ActivityItem> {
  const now = new Date().toISOString();
  const itemToSave: ActivityItem = {
    ...activity,
    id: activity.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `act_${Date.now()}`),
    createdAt: activity.createdAt || now,
    metadata: activity.metadata || {},
  };

  // 1. Supabase DB 저장 시도
  if (supabaseClient && typeof supabaseClient.from === 'function') {
    try {
      const dbPayload = {
        id: itemToSave.id,
        organization_id: itemToSave.organizationId,
        actor_id: itemToSave.actorId || null,
        actor_name: itemToSave.actorName || null,
        target_type: itemToSave.targetType,
        target_id: itemToSave.targetId,
        activity_type: itemToSave.activityType,
        title: itemToSave.title,
        content: itemToSave.content || null,
        metadata: itemToSave.metadata,
        created_at: itemToSave.createdAt,
      };

      const { data, error } = await supabaseClient
        .from('activities')
        .insert(dbPayload)
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          organizationId: data.organization_id,
          actorId: data.actor_id,
          actorName: data.actor_name,
          targetType: data.target_type,
          targetId: data.target_id,
          activityType: data.activity_type,
          title: data.title,
          content: data.content,
          metadata: data.metadata,
          createdAt: data.created_at,
        };
      }
    } catch {
      // 로컬 폴백
    }
  }

  // 2. 로컬스토리지 폴백 저장
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const key = getLocalActivityKey(activity.organizationId, activity.targetType, activity.targetId);
      const raw = window.localStorage.getItem(key);
      const existing: ActivityItem[] = raw ? JSON.parse(raw) : [];
      existing.unshift(itemToSave);
      window.localStorage.setItem(key, JSON.stringify(existing.slice(0, 100))); // 최근 100건 보관
    } catch {}
  }

  return itemToSave;
}

/**
 * 특정 대상(Target)의 활동 스트림 타임라인 조회
 */
export async function listActivities(
  organizationId: string,
  targetType: string,
  targetId: string,
  supabaseClient?: any
): Promise<ActivityItem[]> {
  // 1. Supabase DB 조회 시도
  if (supabaseClient && typeof supabaseClient.from === 'function') {
    try {
      const { data, error } = await supabaseClient
        .from('activities')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          id: d.id,
          organizationId: d.organization_id,
          actorId: d.actor_id,
          actorName: d.actor_name,
          targetType: d.target_type,
          targetId: d.target_id,
          activityType: d.activity_type,
          title: d.title,
          content: d.content,
          metadata: d.metadata,
          createdAt: d.created_at,
        }));
      }
    } catch {
      // 로컬 폴백
    }
  }

  // 2. 로컬스토리지 폴백 조회
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const key = getLocalActivityKey(organizationId, targetType, targetId);
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  return [];
}
