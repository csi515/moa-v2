/**
 * Bath 방문 서비스.
 * 상태 변경은 bath.check_in/out/cancel_visit RPC. 결제·이용권 차감 없음.
 */
import { isSupabaseConfigured } from '@/lib/supabase';
import { getBathClient } from '@/lib/supabase/bathClient';
import { getOrganizationId } from '@/services/adapters';
import type {
  BathVisit,
  BathVisitCheckInInput,
  BathVisitMutationResult,
} from '../types/visit';
import { mapBathVisitRpcError } from './visitErrors';
import { rpcPayloadToVisitResult, type BathVisitRpcPayload } from './visitMappers';
import { getBathVisitById, listBathVisits, listOpenBathVisits } from './visitRepository';

function requireOrgId(): string {
  if (!isSupabaseConfigured()) {
    throw new Error('온라인 환경에서만 방문을 처리할 수 있습니다.');
  }
  const orgId = getOrganizationId();
  if (!orgId) {
    throw new Error('사업장이 선택되지 않았습니다.');
  }
  return orgId;
}

async function callVisitRpc(
  name: 'check_in_visit' | 'check_out_visit' | 'cancel_visit',
  args: Record<string, unknown>
): Promise<BathVisitMutationResult> {
  const client = getBathClient();
  const { data, error } = await client.rpc(name, args as never);
  if (error) {
    const mapped = mapBathVisitRpcError(error);
    throw new Error(mapped.message);
  }
  if (!data) {
    throw new Error('방문 처리에 실패했습니다.');
  }
  return rpcPayloadToVisitResult(data as BathVisitRpcPayload);
}

export const bathVisitService = {
  list(query: { customerId?: string; status?: BathVisit['status']; limit?: number }) {
    return listBathVisits({
      organizationId: requireOrgId(),
      ...query,
    });
  },

  listOpen() {
    return listOpenBathVisits(requireOrgId());
  },

  getById(visitId: string) {
    return getBathVisitById(requireOrgId(), visitId);
  },

  checkIn(input: BathVisitCheckInInput): Promise<BathVisitMutationResult> {
    return callVisitRpc('check_in_visit', {
      p_organization_id: requireOrgId(),
      p_customer_id: input.customerId,
      p_staff_id: input.staffId ?? null,
      p_entry_product_id: input.entryProductId ?? null,
      p_pass_id: input.passId ?? null,
      p_locker_id: input.lockerId ?? null,
      p_room_reservation_id: input.roomReservationId ?? null,
      p_memo: input.memo ?? null,
      p_metadata: input.metadata ?? {},
    });
  },

  checkOut(visitId: string): Promise<BathVisitMutationResult> {
    return callVisitRpc('check_out_visit', {
      p_organization_id: requireOrgId(),
      p_visit_id: visitId,
    });
  },

  cancel(visitId: string): Promise<BathVisitMutationResult> {
    return callVisitRpc('cancel_visit', {
      p_organization_id: requireOrgId(),
      p_visit_id: visitId,
    });
  },
};
