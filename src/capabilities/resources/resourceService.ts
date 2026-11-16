/**
 * 공통 Resource 카탈로그. Reservation 원장과 분리한다.
 * practice_room kind는 기존 upsert_practice_room 호환 경로를 유지한다.
 */
import { getCoreClient } from '@/lib/supabase';
import { normalizeBookableResource, toPracticeRoomRow, toResource } from './resourceMappers';
import { PRACTICE_ROOM_RESOURCE_KIND } from './types';
import type {
  BookableResource,
  ListResourcesQuery,
  PracticeRoomRow,
  Resource,
  UpsertBookableResourceInput,
} from './types';

function client() {
  return getCoreClient();
}

export async function listBookableResources(params: {
  organizationId: string;
  kind?: string;
}): Promise<BookableResource[]> {
  const { data, error } = await client().rpc('list_org_bookable_resources' as never, {
    p_org_id: params.organizationId,
    p_kind: params.kind ?? null,
  } as never);
  if (error) throw new Error(error.message || '자원 목록을 불러오지 못했습니다.');
  return ((data as BookableResource[] | null) ?? []).map(normalizeBookableResource);
}

export async function listResources(query: ListResourcesQuery): Promise<Resource[]> {
  const rows = await listBookableResources({
    organizationId: query.organizationId,
    kind: query.kind,
  });
  const resources = rows.map(toResource);
  if (query.activeOnly) return resources.filter((row) => row.active);
  return resources;
}

export async function getResourceById(
  organizationId: string,
  resourceId: string
): Promise<Resource | null> {
  const { data, error } = await client()
    .from('bookable_resources' as never)
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', resourceId)
    .maybeSingle();
  if (error) throw new Error(error.message || '자원을 불러오지 못했습니다.');
  return data ? toResource(normalizeBookableResource(data as BookableResource)) : null;
}

export async function upsertBookableResource(params: UpsertBookableResourceInput): Promise<string> {
  if (params.kind === PRACTICE_ROOM_RESOURCE_KIND) {
    const { data, error } = await client().rpc('upsert_practice_room' as never, {
      p_org_id: params.organizationId,
      p_name: params.name,
      p_capacity: params.capacity ?? 1,
      p_open_time: params.openTime ?? '09:00',
      p_close_time: params.closeTime ?? '22:00',
      p_id: params.id ?? null,
    } as never);
    if (error) throw new Error(error.message || '자원 저장에 실패했습니다.');
    return data as string;
  }

  const { data, error } = await client().rpc('upsert_bookable_resource' as never, {
    p_org_id: params.organizationId,
    p_kind: params.kind,
    p_name: params.name,
    p_capacity: params.capacity ?? 1,
    p_open_time: params.openTime ?? '09:00',
    p_close_time: params.closeTime ?? '22:00',
    p_id: params.id ?? null,
    p_memo: params.memo ?? null,
  } as never);
  if (error) throw new Error(error.message || '자원 저장에 실패했습니다.');

  const resourceId = data as string;

  // metadata가 제공된 경우 DB에 JSONB 메타데이터 반영
  if (params.metadata && resourceId) {
    try {
      await (client()
        .from('bookable_resources')
        .update({ metadata: params.metadata } as never)
        .eq('id', resourceId));
    } catch (err) {
      console.warn('Failed to update resource metadata in DB:', err);
    }
  }

  return resourceId;
}

/**
 * 특정 사용자가 해당 자원의 예약 건에 대한 승인/반려 권한을 가지고 있는지 판별합니다.
 */
export function canUserApproveReservation(
  resource: Resource | BookableResource,
  user: {
    userId?: string | null;
    staffId?: string | null;
    role?: string | null;
  }
): boolean {
  // 최고 관리자, 원장, 총괄 관리자는 기본 승인 권한 보유
  const roleLower = (user.role || '').toLowerCase();
  if (['owner', 'admin', 'director', 'super_admin'].includes(roleLower)) {
    return true;
  }

  const meta = (resource.metadata || {}) as Record<string, unknown>;
  if (!meta.require_approval) return false;

  // 방식 A: 특정 담당자(staff) 지정
  if (meta.approver_type === 'staff') {
    if (user.staffId && meta.approver_id === user.staffId) return true;
    if (user.userId && meta.approver_id === user.userId) return true;
    return false;
  }

  // 방식 B: 역할/직급(role) 지정
  if (meta.approver_type === 'role') {
    if (user.role && meta.approver_id === user.role) return true;
    return false;
  }

  return false;
}

export async function setResourceActive(
  organizationId: string,
  resourceId: string,
  active: boolean
): Promise<void> {
  const { error } = await client().rpc('set_bookable_resource_active' as never, {
    p_org_id: organizationId,
    p_id: resourceId,
    p_active: active,
  } as never);
  if (error) throw new Error(error.message || '자원 상태를 변경하지 못했습니다.');
}

export async function listPracticeRooms(organizationId: string): Promise<PracticeRoomRow[]> {
  const rows = await listBookableResources({
    organizationId,
    kind: PRACTICE_ROOM_RESOURCE_KIND,
  });
  return rows.map(toPracticeRoomRow);
}
