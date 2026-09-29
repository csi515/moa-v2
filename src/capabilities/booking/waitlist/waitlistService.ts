/**
 * 공통 대기열. 상태 변경은 RPC. 예약 원장을 만들지 않는다.
 */
import { getCoreClient } from '@/lib/supabase';
import type { WaitlistJoinInput, WaitlistListQuery, WaitlistMutationResult } from './types';
import { mapWaitlistRpcError } from './waitlistErrors';
import { rpcPayloadToWaitlistResult, type WaitlistEntryRow } from './waitlistMappers';
import {
  getWaitlistEntryById,
  listOpenWaitlistEntries,
  listWaitlistEntries,
} from './waitlistRepository';

async function callWaitlistRpc(
  name:
    | 'join_waitlist'
    | 'cancel_waitlist'
    | 'expire_waitlist'
    | 'notify_waitlist'
    | 'claim_waitlist_vacancy',
  args: Record<string, unknown>
): Promise<WaitlistMutationResult> {
  const client = getCoreClient();
  const { data, error } = await client.rpc(name, args as never);
  if (error) throw new Error(mapWaitlistRpcError(error).message);
  if (!data) throw new Error('대기열 처리에 실패했습니다.');
  return rpcPayloadToWaitlistResult(data as WaitlistEntryRow);
}

export const waitlistService = {
  list(organizationId: string, query: WaitlistListQuery = {}) {
    return listWaitlistEntries(organizationId, query);
  },

  listOpen(organizationId: string, targetType: string, targetId: string) {
    return listOpenWaitlistEntries(organizationId, targetType, targetId);
  },

  getById(organizationId: string, entryId: string) {
    return getWaitlistEntryById(organizationId, entryId);
  },

  join(organizationId: string, input: WaitlistJoinInput): Promise<WaitlistMutationResult> {
    return callWaitlistRpc('join_waitlist', {
      p_organization_id: organizationId,
      p_target_type: input.targetType,
      p_target_id: input.targetId,
      p_customer_id: input.customerId,
      p_schedule_id: input.scheduleId ?? null,
      p_requested_time: input.requestedTime ?? null,
      p_booking_id: input.bookingId ?? null,
      p_reservation_id: input.reservationId ?? null,
      p_metadata: input.metadata ?? {},
    });
  },

  cancel(organizationId: string, entryId: string): Promise<WaitlistMutationResult> {
    return callWaitlistRpc('cancel_waitlist', {
      p_organization_id: organizationId,
      p_entry_id: entryId,
    });
  },

  expire(organizationId: string, entryId: string): Promise<WaitlistMutationResult> {
    return callWaitlistRpc('expire_waitlist', {
      p_organization_id: organizationId,
      p_entry_id: entryId,
    });
  },

  notify(organizationId: string, entryId: string): Promise<WaitlistMutationResult> {
    return callWaitlistRpc('notify_waitlist', {
      p_organization_id: organizationId,
      p_entry_id: entryId,
    });
  },

  claimVacancy(
    organizationId: string,
    targetType: string,
    targetId: string,
    links?: { bookingId?: string; reservationId?: string }
  ): Promise<WaitlistMutationResult> {
    return callWaitlistRpc('claim_waitlist_vacancy', {
      p_organization_id: organizationId,
      p_target_type: targetType,
      p_target_id: targetId,
      p_booking_id: links?.bookingId ?? null,
      p_reservation_id: links?.reservationId ?? null,
    });
  },
};
