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
  return data as string;
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
