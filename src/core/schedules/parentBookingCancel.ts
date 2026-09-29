/**
 * 부모 전용 예약 취소. staff 전용 상태+이용권 RPC는 호출하지 않는다.
 * 운영: core.cancel_booking_as_parent → local mirror.
 */
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { getOrganizationId } from '@/services/adapters';
import type { Booking } from '@/core/types/schedule';
import { StorageService } from '@/services/storage';
import { runOnlineBookingPassUpdate } from './bookingPassAtomicMirror';
import {
  evaluateParentBookingCancel,
  parentCancelDeniedMessage,
} from './parentBookingCancelPolicy';
import {
  refreshAffectedPassMirror,
  updateBookingStatusLocally,
  writeBookingMirror,
} from './bookingPassAtomic';

export async function cancelBookingAsParent(bookingId: string): Promise<Booking | null> {
  const existing = StorageService.getBookings().find((b) => b.id === bookingId);
  if (!existing) return null;

  const nowIso = new Date().toISOString();
  const decision = evaluateParentBookingCancel(existing, nowIso);
  if (decision.ok === false) {
    throw new Error(parentCancelDeniedMessage(decision.reason));
  }
  if (decision.action === 'idempotent') {
    return existing;
  }

  const orgId = getOrganizationId();
  const useRpc = Boolean(isSupabaseConfigured() && orgId);

  if (!useRpc) {
    return updateBookingStatusLocally(existing, 'cancelled');
  }

  return runOnlineBookingPassUpdate(existing, 'cancelled', {
    rpc: async () => {
      const client = getCoreClient();
      const { data, error } = await client.rpc('cancel_booking_as_parent' as never, {
        p_organization_id: orgId,
        p_booking_id: bookingId,
      } as never);
      return {
        data: data as {
          action?: string;
          status: Booking['status'];
          session_pass_id?: string | null;
        } | null,
        error,
      };
    },
    writeBookingMirror: (payload) => writeBookingMirror(existing, payload),
    refreshPassMirror: (passIds) => refreshAffectedPassMirror(orgId!, passIds),
  });
}
