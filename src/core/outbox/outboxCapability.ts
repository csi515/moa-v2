/**
 * Transactional Outbox Capability.
 * 업무 RPC 안에서 enqueue만 하고, push/SMS/외부 API는 worker가 처리한다.
 */
import { reservationConfirmedConsumer } from './consumers';
import {
  claimOutboxBatch,
  completeOutboxEvent,
  dispatchOutboxEvent,
  failOutboxEvent,
  isDuplicateDelivery,
} from './evaluate';
import { reservationConfirmedPayload, withOutboxContext } from './payload';
import { outboxService } from './outboxService';
import { processOutboxBatch } from './outboxWorker';
import { OUTBOX_EVENT_TYPES, OUTBOX_PILOT_EVENT } from './types';

export const outboxCapability = {
  eventTypes: OUTBOX_EVENT_TYPES,
  pilot: OUTBOX_PILOT_EVENT,
  withContext: withOutboxContext,
  reservationConfirmedPayload,
  enqueue: outboxService.enqueue,
  list: outboxService.list,
  claim: outboxService.claim,
  processBatch: processOutboxBatch,
  claimBatch: claimOutboxBatch,
  complete: completeOutboxEvent,
  fail: failOutboxEvent,
  isDuplicate: isDuplicateDelivery,
  dispatch: dispatchOutboxEvent,
  reservationConsumer: reservationConfirmedConsumer,
} as const;

export type OutboxCapability = typeof outboxCapability;
