/**
 * 공통 자원 예약 (core.room_reservations).
 * bookable Schedule 신청(core.reservations)과 원장을 공유하지 않는다.
 * 겹침은 book_room_reservation_guarded / EXCLUDE 재사용.
 */
import { getCoreClient } from '@/lib/supabase';
import { mapResourceReservationError } from './reservationErrors';
import { RESOURCE_RESERVATION_BLOCKING_STATUSES } from './types';
import type {
  CreateResourceReservationInput,
  ListResourceReservationsQuery,
  RequestResourceReservationInput,
  ResourceReservation,
  ResourceReservationStatus,
  RoomReservationRow,
} from './types';
import { dayRangeSeoul } from './seoulTime';

export {
  listBookableResources,
  listPracticeRooms,
  upsertBookableResource,
} from './resourceService';
export { toPracticeRoomRow } from './resourceMappers';

type ReservationQueryRow = RoomReservationRow & {
  bookable_resources?: { name: string; kind: string } | null;
};

type ListOrgReservationRpcRow = {
  id: string;
  organization_id: string;
  room_id: string;
  customer_id: string | null;
  requested_by: string;
  starts_at: string;
  ends_at: string;
  status: ResourceReservationStatus;
  memo: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  resource_name: string | null;
  resource_kind: string | null;
  customer_name: string | null;
  requester_name: string | null;
};

function client() {
  return getCoreClient();
}

export function toRoomReservationRow(row: ReservationQueryRow): RoomReservationRow {
  const name = row.practice_rooms?.name || row.bookable_resources?.name;
  return {
    ...row,
    practice_rooms: name ? { name } : row.practice_rooms ?? null,
  };
}

export function toResourceReservation(row: ReservationQueryRow): ResourceReservation {
  const mapped = toRoomReservationRow(row);
  return {
    id: mapped.id,
    organization_id: mapped.organization_id,
    resourceId: mapped.room_id,
    customer_id: mapped.customer_id,
    requested_by: mapped.requested_by,
    starts_at: mapped.starts_at,
    ends_at: mapped.ends_at,
    status: mapped.status,
    memo: mapped.memo,
    reviewed_by: mapped.reviewed_by,
    reviewed_at: mapped.reviewed_at,
    created_at: mapped.created_at,
    resourceName: mapped.practice_rooms?.name,
    resourceKind: row.bookable_resources?.kind,
    customerName: mapped.customers?.name,
    requesterName: mapped.requester_name ?? undefined,
  };
}

function rpcRowToQueryRow(row: ListOrgReservationRpcRow): ReservationQueryRow {
  return {
    id: row.id,
    organization_id: row.organization_id,
    room_id: row.room_id,
    customer_id: row.customer_id,
    requested_by: row.requested_by,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    memo: row.memo,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    requester_name: row.requester_name,
    bookable_resources:
      row.resource_name || row.resource_kind
        ? { name: row.resource_name ?? '', kind: row.resource_kind ?? '' }
        : null,
    customers: row.customer_name ? { name: row.customer_name } : null,
  };
}

async function listViaRpc(query: ListResourceReservationsQuery): Promise<ReservationQueryRow[] | null> {
  // customerId / status 필터는 RPC에 없으므로 직접 조회 경로 사용
  if (query.customerId || query.status) return null;

  const { data, error } = await client().rpc('list_org_room_reservations' as never, {
    p_org_id: query.organizationId,
    p_room_id: query.resourceId ?? null,
    p_from: query.fromIso ?? null,
    p_to: query.toIso ?? null,
    p_limit: query.limit ?? 200,
  } as never);

  if (error) {
    // 마이그레이션 미적용 환경: 직접 조회로 폴백
    if (/does not exist|not found/i.test(error.message)) return null;
    throw new Error(error.message || '예약 목록을 불러오지 못했습니다.');
  }

  const rows = ((data as ListOrgReservationRpcRow[] | null) ?? []).map(rpcRowToQueryRow);
  if (query.order === 'desc') {
    return [...rows].reverse();
  }
  return rows;
}

export async function listResourceReservationRows(
  query: ListResourceReservationsQuery
): Promise<ReservationQueryRow[]> {
  const viaRpc = await listViaRpc(query);
  if (viaRpc) return viaRpc;

  let builder = client()
    .from('room_reservations')
    .select('*, bookable_resources(name, kind), customers(name)')
    .eq('organization_id', query.organizationId)
    .order('starts_at', { ascending: query.order !== 'desc' })
    .limit(query.limit ?? 200);

  if (query.customerId) builder = builder.eq('customer_id', query.customerId);
  if (query.resourceId) builder = builder.eq('room_id', query.resourceId);
  if (query.fromIso) builder = builder.gte('starts_at', query.fromIso);
  if (query.toIso) builder = builder.lte('starts_at', query.toIso);
  if (Array.isArray(query.status)) builder = builder.in('status', query.status);
  else if (query.status) builder = builder.eq('status', query.status);

  const { data, error } = await builder;
  if (error) throw new Error(error.message || '예약 목록을 불러오지 못했습니다.');
  return (data || []) as ReservationQueryRow[];
}

export async function listResourceReservations(
  query: ListResourceReservationsQuery
): Promise<ResourceReservation[]> {
  const rows = await listResourceReservationRows(query);
  return rows.map(toResourceReservation);
}

export function listActiveResourceReservationRows(
  organizationId: string,
  fromIso: string,
  toIso?: string
) {
  return listResourceReservationRows({
    organizationId,
    status: [...RESOURCE_RESERVATION_BLOCKING_STATUSES],
    fromIso,
    toIso,
    order: 'asc',
  });
}

/** 사업장·고객 예약 신청 (pending). 연결된 customer 필수. */
export async function requestResourceReservation(
  params: RequestResourceReservationInput
): Promise<string> {
  const { data, error } = await client().rpc('request_room_reservation' as never, {
    p_org_id: params.organizationId,
    p_room_id: params.resourceId,
    p_starts_at: params.startsAt,
    p_ends_at: params.endsAt,
    p_memo: params.memo ?? null,
  } as never);
  if (error) throw mapResourceReservationError(error.message, '예약 신청에 실패했습니다.');
  return data as string;
}

/**
 * 사내 직원 공용자원 예약 (customer_id NULL).
 * 자원 metadata.require_approval=true이면 pending, 아니면 approved.
 */
export async function requestMemberResourceReservation(
  params: RequestResourceReservationInput
): Promise<string> {
  const { data, error } = await client().rpc('request_member_room_reservation' as never, {
    p_org_id: params.organizationId,
    p_room_id: params.resourceId,
    p_starts_at: params.startsAt,
    p_ends_at: params.endsAt,
    p_memo: params.memo ?? null,
  } as never);
  if (error) throw mapResourceReservationError(error.message, '예약에 실패했습니다.');
  return data as string;
}

export async function createStaffResourceReservation(
  params: CreateResourceReservationInput
): Promise<string> {
  const { data, error } = await client().rpc('create_staff_room_reservation' as never, {
    p_org_id: params.organizationId,
    p_room_id: params.resourceId,
    p_customer_id: params.customerId,
    p_starts_at: params.startsAt,
    p_ends_at: params.endsAt,
    p_memo: params.memo ?? null,
  } as never);
  if (error) throw mapResourceReservationError(error.message, '예약 저장에 실패했습니다.');
  return data as string;
}

export async function cancelResourceReservation(reservationId: string): Promise<void> {
  const { error } = await client().rpc('cancel_my_room_reservation' as never, {
    p_reservation_id: reservationId,
  } as never);
  if (error) throw new Error(error.message || '예약 취소에 실패했습니다.');
}

export async function reviewResourceReservation(
  reservationId: string,
  approve: boolean,
  memo?: string
): Promise<void> {
  const { error } = await client().rpc('review_room_reservation' as never, {
    p_reservation_id: reservationId,
    p_approve: approve,
    p_memo: memo ?? null,
  } as never);
  if (error) throw mapResourceReservationError(error.message, '예약 처리에 실패했습니다.');
}

export async function listReservationsByDate(organizationId: string, date: string) {
  const { start, end } = dayRangeSeoul(date);
  const rows = await listActiveResourceReservationRows(organizationId, start, end);
  return rows.map(toRoomReservationRow);
}

export async function listReservationsByRange(
  organizationId: string,
  startDate: string,
  endDate: string
) {
  const { start } = dayRangeSeoul(startDate);
  const { end } = dayRangeSeoul(endDate);
  const rows = await listActiveResourceReservationRows(organizationId, start, end);
  return rows.map(toRoomReservationRow);
}

/**
 * 자원의 require_approval 설정에 따라 예약의 초기 상태를 결정합니다.
 * request_member_room_reservation RPC와 동일한 규칙을 사용합니다.
 */
export function determineInitialReservationStatus(
  resource: { metadata?: Record<string, unknown> | null }
): 'pending' | 'approved' {
  const meta = (resource.metadata || {}) as Record<string, any>;
  return meta.require_approval === true ? 'pending' : 'approved';
}

/**
 * 승인 대기 중인 예약 목록을 조회합니다.
 */
export async function listPendingReservations(
  organizationId: string
): Promise<ResourceReservation[]> {
  return listResourceReservations({
    organizationId,
    status: 'pending',
    order: 'asc',
  });
}
