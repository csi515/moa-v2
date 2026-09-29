/**
 * 공통 고객 Session(방문 사실). 상태 변경은 RPC.
 * 결제/이용권 차감 없음. 예약·출석 status를 미러하지 않는다.
 */
import { getCoreClient } from '@/lib/supabase';
import type {
  CustomerSession,
  CustomerSessionListQuery,
  CustomerSessionMutationResult,
  CustomerSessionStartInput,
} from './types';
import { mapCustomerSessionRpcError } from './sessionErrors';
import { rpcPayloadToSessionResult, type CustomerSessionRow } from './sessionMappers';
import {
  getActiveCustomerSession,
  getCustomerSessionById,
  listActiveCustomerSessions,
  listCustomerSessions,
} from './sessionRepository';

async function callSessionRpc(
  name: 'start_customer_session' | 'finish_customer_session' | 'cancel_customer_session',
  args: Record<string, unknown>
): Promise<CustomerSessionMutationResult> {
  const client = getCoreClient();
  const { data, error } = await client.rpc(name, args as never);
  if (error) throw new Error(mapCustomerSessionRpcError(error).message);
  if (!data) throw new Error('세션 처리에 실패했습니다.');
  return rpcPayloadToSessionResult(data as CustomerSessionRow);
}

export const customerSessionService = {
  list(organizationId: string, query: CustomerSessionListQuery = {}) {
    return listCustomerSessions(organizationId, query);
  },

  listActive(organizationId: string) {
    return listActiveCustomerSessions(organizationId);
  },

  getById(organizationId: string, sessionId: string) {
    return getCustomerSessionById(organizationId, sessionId);
  },

  getActive(organizationId: string, customerId: string) {
    return getActiveCustomerSession(organizationId, customerId);
  },

  start(
    organizationId: string,
    input: CustomerSessionStartInput
  ): Promise<CustomerSessionMutationResult> {
    return callSessionRpc('start_customer_session', {
      p_organization_id: organizationId,
      p_customer_id: input.customerId,
      p_staff_id: input.staffId ?? null,
      p_source: input.source ?? 'walk_in',
      p_context: input.context ?? null,
      p_booking_id: input.bookingId ?? null,
      p_reservation_id: input.reservationId ?? null,
      p_pass_id: input.passId ?? null,
      p_payment_id: input.paymentId ?? null,
      p_resource_id: input.resourceId ?? null,
      p_memo: input.memo ?? null,
      p_metadata: input.metadata ?? {},
    });
  },

  finish(organizationId: string, sessionId: string): Promise<CustomerSessionMutationResult> {
    return callSessionRpc('finish_customer_session', {
      p_organization_id: organizationId,
      p_session_id: sessionId,
    });
  },

  async finishActive(
    organizationId: string,
    customerId: string
  ): Promise<CustomerSessionMutationResult> {
    const active = await getActiveCustomerSession(organizationId, customerId);
    if (!active) throw new Error('진행 중인 세션이 없습니다.');
    return customerSessionService.finish(organizationId, active.id);
  },

  cancel(organizationId: string, sessionId: string): Promise<CustomerSessionMutationResult> {
    return callSessionRpc('cancel_customer_session', {
      p_organization_id: organizationId,
      p_session_id: sessionId,
    });
  },
};

export type { CustomerSession };
