/**
 * Atomic booking RPC 이후 local mirror 패치.
 * persist / flush / 전체 목록 diff-delete 없음.
 */
import type { Booking, BookingStatus, SessionPass } from '@/core/types/schedule';
import { mapBookingPassRpcError } from './mapBookingPassRpcError';

export type BookingPassRpcPayload = {
  action?: string;
  status: BookingStatus;
  session_pass_id?: string | null;
};

export type BookingPassRpcResult = {
  data: BookingPassRpcPayload | null;
  error: { message?: string; code?: string } | null;
};

export function resolveSessionPassId(
  sessionPassId?: string | null
): string | undefined {
  if (sessionPassId == null || sessionPassId === '') return undefined;
  return String(sessionPassId);
}

/** RPC 결과와 기존 연결 이용권만 재조회 — org 전체 SELECT 금지 */
export function collectPassIdsToRefresh(
  existing: Booking,
  payload: Pick<BookingPassRpcPayload, 'session_pass_id'>
): string[] {
  const ids = new Set<string>();
  const fromPayload = resolveSessionPassId(payload.session_pass_id);
  const fromExisting = resolveSessionPassId(existing.sessionPassId);
  if (fromPayload) ids.add(fromPayload);
  if (fromExisting) ids.add(fromExisting);
  return [...ids];
}

export function patchBookingInList(
  bookings: Booking[],
  existing: Booking,
  payload: Pick<BookingPassRpcPayload, 'status' | 'session_pass_id'>
): { list: Booking[]; booking: Booking } {
  const booking: Booking = {
    ...existing,
    status: payload.status,
    sessionPassId: resolveSessionPassId(payload.session_pass_id),
  };

  const idx = bookings.findIndex((entry) => entry.id === existing.id);
  if (idx < 0) {
    return { list: [booking, ...bookings], booking };
  }

  const list = bookings.slice();
  list[idx] = { ...list[idx], ...booking };
  return { list, booking: list[idx] };
}

/** 조회된 이용권 row만 합침. 다른 기기의 이용권은 제거하지 않음 */
export function mergeSessionPasses(
  current: SessionPass[],
  incoming: SessionPass[]
): SessionPass[] {
  if (incoming.length === 0) return current;

  const incomingById = new Map(incoming.map((pass) => [pass.id, pass]));
  const merged = current.map((pass) => incomingById.get(pass.id) ?? pass);
  for (const pass of incoming) {
    if (!current.some((row) => row.id === pass.id)) {
      merged.push(pass);
    }
  }
  return merged;
}

export type OnlineBookingPassDeps = {
  rpc: () => Promise<BookingPassRpcResult>;
  writeBookingMirror: (
    payload: Pick<BookingPassRpcPayload, 'status' | 'session_pass_id'>
  ) => Booking;
  refreshPassMirror: (passIds: string[]) => Promise<void>;
};

/**
 * DB RPC를 source of truth로 사용.
 * 성공 후에만 해당 booking + 관련 session pass local mirror.
 * flushPersist / snapshot diff-delete 호출 경로 없음.
 */
export async function runOnlineBookingPassUpdate(
  existing: Booking,
  requestedStatus: BookingStatus,
  deps: OnlineBookingPassDeps
): Promise<Booking | null> {
  const { data, error } = await deps.rpc();

  if (error) {
    const mapped = mapBookingPassRpcError(error);
    if (
      mapped.code === 'insufficient_pass' ||
      mapped.code === 'not_found' ||
      mapped.code === 'refund_failed'
    ) {
      return null;
    }
    throw new Error(mapped.message);
  }

  const payload: BookingPassRpcPayload = {
    action: data?.action,
    status: data?.status || requestedStatus,
    session_pass_id: data?.session_pass_id,
  };

  const passIds = collectPassIdsToRefresh(existing, payload);
  if (passIds.length > 0) {
    await deps.refreshPassMirror(passIds);
  }

  return deps.writeBookingMirror({
    status: payload.status,
    session_pass_id: payload.session_pass_id,
  });
}
