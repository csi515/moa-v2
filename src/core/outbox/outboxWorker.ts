/**
 * retry 가능한 outbox worker.
 * claim/complete/fail 은 service_role 전용이다. 사용자 세션으로 상태를 바꾸지 않는다.
 * 외부 side effect는 consumer에서만 수행한다. 업무 TX를 대체하지 않는다.
 */
import { reservationConfirmedConsumer } from './consumers';
import { dispatchOutboxEvent } from './evaluate';
import { outboxService } from './outboxService';
import { outboxEventDedupeKey, type OutboxConsumer, type OutboxEvent } from './types';

const DEFAULT_CONSUMERS: readonly OutboxConsumer[] = [reservationConfirmedConsumer];

export async function processOutboxBatch(
  organizationId: string,
  options?: {
    limit?: number;
    consumers?: readonly OutboxConsumer[];
    /** 프로세스 안 최적화용. durable dedupe 의 대체재가 아니다. */
    deliveredIds?: Set<string>;
  }
): Promise<{ processed: number; retried: number }> {
  const consumers = options?.consumers ?? DEFAULT_CONSUMERS;
  const deliveredIds = options?.deliveredIds ?? new Set<string>();
  const claimed = await outboxService.claim(organizationId, options?.limit ?? 10);
  let processed = 0;
  let retried = 0;

  for (const event of claimed) {
    const result = await processClaimedEvent(event, consumers, deliveredIds);
    if (result === 'processed') processed += 1;
    else retried += 1;
  }
  return { processed, retried };
}

export async function processClaimedEvent(
  event: OutboxEvent,
  consumers: readonly OutboxConsumer[],
  deliveredIds: Set<string>
): Promise<'processed' | 'retry'> {
  const consumer = consumers.find((row) => row.eventType === event.eventType);
  const identity = outboxEventDedupeKey(event);
  if (deliveredIds.has(identity)) {
    await outboxService.complete(event.id);
    return 'processed';
  }
  if (!consumer) {
    await outboxService.fail(event.id, `No consumer for ${event.eventType}`);
    return 'retry';
  }
  try {
    const result = dispatchOutboxEvent(event, consumer, deliveredIds);
    if (result === 'processed') {
      deliveredIds.add(identity);
      await outboxService.complete(event.id);
      return 'processed';
    }
    await outboxService.fail(event.id, 'Consumer requested retry');
    return 'retry';
  } catch (error) {
    await outboxService.fail(event.id, error instanceof Error ? error.message : 'Outbox consumer failed');
    return 'retry';
  }
}
