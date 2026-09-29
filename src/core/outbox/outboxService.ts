import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { listOutboxEvents } from './outboxRepository';
import { rowToOutboxEvent, type OutboxEventRow } from './outboxMappers';
import { outboxDedupeKey, type EnqueueOutboxInput, type OutboxEvent } from './types';

function envValue(name: string): string | undefined {
  const meta = (import.meta as { env?: Record<string, string | undefined> }).env;
  if (meta?.[name]) return meta[name];
  if (typeof process !== 'undefined') return process.env[name];
  return undefined;
}

/** claim/complete/fail 전용. 사용자 JWT/anon 키를 쓰지 않는다. */
function getOutboxWorkerClient(): SupabaseClient<Database, 'core'> {
  const url = envValue('SUPABASE_URL') || envValue('VITE_SUPABASE_URL');
  const key = envValue('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Outbox worker는 service_role 권한이 필요합니다.');
  }
  return createClient<Database, 'core'>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'core' },
  });
}

/** enqueue는 confirm_reservation 등 업무 RPC TX 안에서만 수행한다. */
export async function enqueueOutboxEvent(_input: EnqueueOutboxInput): Promise<string> {
  throw new Error('Outbox enqueue는 업무 트랜잭션 RPC 내부에서만 호출할 수 있습니다.');
}

type ClaimRow = OutboxEventRow & { dedupe_key?: string | null };

function toClaimedEvent(row: ClaimRow): OutboxEvent {
  const mapped = rowToOutboxEvent(row);
  return {
    ...mapped,
    dedupeKey:
      row.dedupe_key?.trim() ||
      outboxDedupeKey(mapped.eventType, mapped.aggregateType, mapped.aggregateId),
  };
}

export async function claimOutboxEvents(organizationId: string, limit = 10): Promise<OutboxEvent[]> {
  const { data, error } = await getOutboxWorkerClient().rpc('claim_outbox_events', {
    p_organization_id: organizationId,
    p_limit: limit,
  });
  if (error) throw new Error(error.message || 'Outbox claim에 실패했습니다.');
  return ((data as ClaimRow[] | null) ?? []).map(toClaimedEvent);
}

export async function completeOutboxEvent(eventId: string): Promise<void> {
  const { error } = await getOutboxWorkerClient().rpc('complete_outbox_event', {
    p_event_id: eventId,
  });
  if (error) throw new Error(error.message || 'Outbox complete에 실패했습니다.');
}

export async function failOutboxEvent(eventId: string, lastError: string): Promise<void> {
  const { error } = await getOutboxWorkerClient().rpc('fail_outbox_event', {
    p_event_id: eventId,
    p_last_error: lastError,
  });
  if (error) throw new Error(error.message || 'Outbox fail에 실패했습니다.');
}

export const outboxService = {
  enqueue: enqueueOutboxEvent,
  list: listOutboxEvents,
  claim: claimOutboxEvents,
  complete: completeOutboxEvent,
  fail: failOutboxEvent,
};
