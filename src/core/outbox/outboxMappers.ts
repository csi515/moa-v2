import type { OutboxEvent, OutboxStatus } from './types';

export type OutboxEventRow = {
  id: string;
  organization_id: string;
  location_id: string | null;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  status: string;
  attempts: number;
  available_at: string;
  processed_at: string | null;
  last_error: string | null;
  created_at: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function rowToOutboxEvent(row: OutboxEventRow): OutboxEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    locationId: row.location_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    eventType: row.event_type,
    payload: asRecord(row.payload),
    status: row.status as OutboxStatus,
    attempts: row.attempts,
    availableAt: row.available_at,
    processedAt: row.processed_at,
    lastError: row.last_error,
    createdAt: row.created_at,
  };
}
