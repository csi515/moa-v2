import { getCoreClient } from '@/lib/supabase';
import { rowToOutboxEvent, type OutboxEventRow } from './outboxMappers';
import type { OutboxEvent } from './types';

export async function listOutboxEvents(
  organizationId: string,
  limit = 50
): Promise<OutboxEvent[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('outbox_events')
    .select(
      'id, organization_id, location_id, aggregate_type, aggregate_id, event_type, payload, status, attempts, available_at, processed_at, last_error, created_at'
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data as OutboxEventRow[] | null) ?? []).map(rowToOutboxEvent);
}

export async function claimOutboxEvents(
  organizationId: string,
  limit = 10
): Promise<OutboxEvent[]> {
  const client = getCoreClient();
  const { data, error } = await client.rpc('claim_outbox_events', {
    p_organization_id: organizationId,
    p_limit: limit,
  });
  if (error) throw error;
  return ((data as OutboxEventRow[] | null) ?? []).map(rowToOutboxEvent);
}

export async function completeOutboxEvent(eventId: string): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.rpc('complete_outbox_event', { p_event_id: eventId });
  if (error) throw error;
}

export async function failOutboxEvent(eventId: string, lastError: string): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.rpc('fail_outbox_event', {
    p_event_id: eventId,
    p_last_error: lastError,
  });
  if (error) throw error;
}
