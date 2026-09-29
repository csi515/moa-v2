/**
 * claim / retry / duplicate-delivery 계약.
 * worker는 at-least-once. consumer는 event.id 로 멱등해야 한다.
 */
import {
  OUTBOX_LEASE_MS,
  OUTBOX_MAX_ATTEMPTS,
  type OutboxConsumer,
  type OutboxConsumerResult,
  type OutboxEvent,
} from './types';

export function isOutboxDue(event: OutboxEvent, now: number): boolean {
  return Date.parse(event.availableAt) <= now;
}

export function canClaimOutbox(event: OutboxEvent, now: number): boolean {
  if (event.status === 'processed') return false;
  if (event.attempts >= OUTBOX_MAX_ATTEMPTS && event.status === 'failed') return false;
  if (!isOutboxDue(event, now)) return false;
  return event.status === 'pending' || event.status === 'failed' || event.status === 'processing';
}

export function claimOutboxBatch(
  events: readonly OutboxEvent[],
  now: number,
  limit = 10
): OutboxEvent[] {
  return events
    .filter((row) => canClaimOutbox(row, now))
    .sort((a, b) => Date.parse(a.availableAt) - Date.parse(b.availableAt))
    .slice(0, limit)
    .map((row) => ({
      ...row,
      status: 'processing' as const,
      attempts: row.attempts + 1,
      availableAt: new Date(now + OUTBOX_LEASE_MS).toISOString(),
    }));
}

export function retryDelayMs(attempts: number): number {
  const minutes = Math.min(2 ** Math.min(Math.max(attempts, 1), 6), 60);
  return minutes * 60 * 1000;
}

export function failOutboxEvent(event: OutboxEvent, now: number, error: string): OutboxEvent {
  const exhausted = event.attempts >= OUTBOX_MAX_ATTEMPTS;
  return {
    ...event,
    status: exhausted ? 'failed' : 'pending',
    lastError: error,
    availableAt: new Date(now + (exhausted ? 0 : retryDelayMs(event.attempts))).toISOString(),
  };
}

export function completeOutboxEvent(event: OutboxEvent, now: number): OutboxEvent {
  return {
    ...event,
    status: 'processed',
    processedAt: new Date(now).toISOString(),
    lastError: null,
  };
}

export function isDuplicateDelivery(deliveredIds: ReadonlySet<string>, eventId: string): boolean {
  return deliveredIds.has(eventId);
}

export function dispatchOutboxEvent(
  event: OutboxEvent,
  consumer: OutboxConsumer,
  deliveredIds: ReadonlySet<string>
): OutboxConsumerResult {
  if (consumer.eventType !== event.eventType) return 'retry';
  return consumer.handle(event, deliveredIds);
}
