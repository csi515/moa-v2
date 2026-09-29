/** Transactional Outbox. 업무 TX와 외부 side effect를 분리한다. */

export const OUTBOX_EVENT_TYPES = [
  'reservation.confirmed',
  'reservation.requested',
  'booking.completed',
  'payment.completed',
  'refund.completed',
  'pass.purchased',
  'staff.assigned',
  'waitlist.notified',
] as const;

export type OutboxEventType = (typeof OUTBOX_EVENT_TYPES)[number];

export const OUTBOX_STATUSES = ['pending', 'processing', 'processed', 'failed'] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const OUTBOX_PILOT_EVENT: OutboxEventType = 'reservation.confirmed';

export const OUTBOX_MAX_ATTEMPTS = 8;
export const OUTBOX_LEASE_MS = 5 * 60 * 1000;

export type OutboxEvent = {
  id: string;
  organizationId: string;
  locationId: string | null;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  /** durable business identity. 없으면 eventType+aggregate 로 계산한다. */
  dedupeKey?: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  attempts: number;
  availableAt: string;
  processedAt: string | null;
  lastError: string | null;
  createdAt: string;
};

export type EnqueueOutboxInput = {
  organizationId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: OutboxEventType | string;
  payload?: Record<string, unknown>;
  locationId?: string | null;
};

/** 조직 안에서 같은 비즈니스 이벤트를 가리키는 durable key. row id 와 다르다. */
export function outboxDedupeKey(
  eventType: string,
  aggregateType: string,
  aggregateId: string
): string {
  return `${eventType.trim()}\u001f${aggregateType.trim()}\u001f${aggregateId.trim()}`;
}

export function outboxEventDedupeKey(
  event: Pick<OutboxEvent, 'dedupeKey' | 'eventType' | 'aggregateType' | 'aggregateId'>
): string {
  const explicit = event.dedupeKey?.trim();
  if (explicit) return explicit;
  return outboxDedupeKey(event.eventType, event.aggregateType, event.aggregateId);
}

/** 같은 비즈니스 이벤트가 두 번 와도 부작용을 한 번만 수행한다. */
export type OutboxConsumerResult = 'processed' | 'retry';

export type OutboxConsumer = {
  eventType: OutboxEventType | string;
  handle: (event: OutboxEvent, deliveredIds: ReadonlySet<string>) => OutboxConsumerResult;
};
