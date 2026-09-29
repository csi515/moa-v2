/**
 * Consumer는 at-least-once를 전제로 멱등해야 한다.
 * 파일럿: reservation.confirmed — 실제 push/SMS는 보내지 않는다.
 */
import { isDuplicateDelivery } from './evaluate';
import type { OutboxConsumer, OutboxConsumerResult, OutboxEvent } from './types';

export function handleReservationConfirmed(
  event: OutboxEvent,
  deliveredIds: ReadonlySet<string>
): OutboxConsumerResult {
  if (event.eventType !== 'reservation.confirmed') return 'retry';
  if (isDuplicateDelivery(deliveredIds, event.id)) return 'processed';
  if (!event.payload.organizationId || !event.payload.reservationId) return 'retry';
  return 'processed';
}

export const reservationConfirmedConsumer: OutboxConsumer = {
  eventType: 'reservation.confirmed',
  handle: handleReservationConfirmed,
};

export function markDelivered(deliveredIds: ReadonlySet<string>, eventId: string): Set<string> {
  return new Set(deliveredIds).add(eventId);
}
