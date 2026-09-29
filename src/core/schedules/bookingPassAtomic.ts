/**
 * appointment Booking 상태 + 이용권 차감/복구 원자 클라이언트.
 * DB: core.update_booking_status_with_pass 가 source of truth (core.schedules + session_passes).
 * reservations / attendance / customer_sessions 상태를 바꾸지 않는다.
 * 온라인 경로에서 SCHEDULES/SESSION_PASSES 전체 snapshot flush·diff-delete 금지.
 */
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { getOrganizationId, getStorageAdapter, STORAGE_KEYS } from '@/services/adapters';
import { setItem } from '@/services/storage/helpers';
import type { Booking, BookingStatus, SessionPass } from '@/core/types/schedule';
import { StorageService } from '@/services/storage';
import { sessionPassService } from './sessionPassService';
import { applyLocalBookingPassChange } from './bookingPassLocalApply';
import { rowToSessionPass } from '@/services/adapters/sync/sessionPassMappers';
import {
  mergeSessionPasses,
  patchBookingInList,
  runOnlineBookingPassUpdate,
} from './bookingPassAtomicMirror';

/** demo/offline: 이용권 스냅샷 롤백으로 best-effort 원자성 */
export function updateBookingStatusLocally(
  existing: Booking,
  status: BookingStatus,
  options?: { consumeOnNoShow?: boolean }
): Booking | null {
  const passesBefore = sessionPassService.list().map((p) => ({ ...p }));

  try {
    const next = applyLocalBookingPassChange(
      existing,
      status,
      {
        consume: (customerId) => sessionPassService.consume(customerId),
        refund: (passId) => sessionPassService.refund(passId),
        hasEntitlement: (customerId) => sessionPassService.hasEntitlement(customerId),
      },
      options
    );
    if (!next) return null;

    return StorageService.saveBooking(next);
  } catch (err) {
    setItem(STORAGE_KEYS.SESSION_PASSES, passesBefore);
    throw err;
  }
}

export function writeBookingMirror(
  existing: Booking,
  payload: { status: BookingStatus; session_pass_id?: string | null }
): Booking {
  const adapter = getStorageAdapter();
  const list = adapter.getItem<Booking[]>(STORAGE_KEYS.SCHEDULES, []);
  const { list: next, booking } = patchBookingInList(list, existing, payload);
  if (adapter.writeLocalMirror) {
    adapter.writeLocalMirror(STORAGE_KEYS.SCHEDULES, next);
  }
  return booking;
}

/** 해당 이용권만 SELECT 후 mirror. org 전체 목록 persist 없음 */
export async function refreshAffectedPassMirror(
  orgId: string,
  passIds: string[]
): Promise<void> {
  if (passIds.length === 0) return;
  try {
    const client = getCoreClient();
    const adapter = getStorageAdapter();
    const { data: passRows, error } = await client
      .from('session_passes' as never)
      .select('*')
      .eq('organization_id', orgId)
      .in('id', passIds);
    if (error || !Array.isArray(passRows)) return;
    const incoming: SessionPass[] = passRows.map((row) =>
      rowToSessionPass(row as Parameters<typeof rowToSessionPass>[0])
    );
    const current = adapter.getItem<SessionPass[]>(STORAGE_KEYS.SESSION_PASSES, []);
    if (adapter.writeLocalMirror) {
      adapter.writeLocalMirror(
        STORAGE_KEYS.SESSION_PASSES,
        mergeSessionPasses(current, incoming)
      );
    }
  } catch {
    /* mirror refresh best-effort */
  }
}

/**
 * 운영(Supabase+org): RPC → 해당 booking/pass local mirror.
 * demo: local fallback (동일 규칙).
 */
export async function updateBookingStatusAtomic(
  bookingId: string,
  status: BookingStatus,
  options?: { consumeOnNoShow?: boolean; idempotencyKey?: string }
): Promise<Booking | null> {
  const existing = StorageService.getBookings().find((b) => b.id === bookingId);
  if (!existing) return null;

  const orgId = getOrganizationId();
  const useRpc = Boolean(isSupabaseConfigured() && orgId);

  if (!useRpc) {
    return updateBookingStatusLocally(existing, status, options);
  }

  return runOnlineBookingPassUpdate(existing, status, {
    rpc: async () => {
      const client = getCoreClient();
      const idempotencyKey = options?.idempotencyKey?.trim();
      const rpcName = idempotencyKey
        ? 'update_booking_status_with_pass_idempotent'
        : 'update_booking_status_with_pass';
      const { data, error } = await client.rpc(rpcName as never, {
        p_organization_id: orgId,
        p_booking_id: bookingId,
        p_new_status: status,
        p_consume_on_no_show: options?.consumeOnNoShow === true,
        ...(idempotencyKey ? { p_idempotency_key: idempotencyKey } : {}),
      } as never);
      return {
        data: data as {
          action?: string;
          status: BookingStatus;
          session_pass_id?: string | null;
        } | null,
        error,
      };
    },
    writeBookingMirror: (payload) => writeBookingMirror(existing, payload),
    refreshPassMirror: (passIds) => refreshAffectedPassMirror(orgId!, passIds),
  });
}
