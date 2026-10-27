/**
 * Transactional outbox foundation.
 * 실행: npm run test:outbox
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleReservationConfirmed, markDelivered, reservationConfirmedConsumer } from './consumers';
import {
  claimOutboxBatch,
  completeOutboxEvent,
  dispatchOutboxEvent,
  failOutboxEvent,
  isDuplicateDelivery,
} from './evaluate';
import { reservationConfirmedPayload, withOutboxContext } from './payload';
import {
  OUTBOX_EVENT_TYPES,
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_PILOT_EVENT,
  outboxDedupeKey,
  outboxEventDedupeKey,
  type OutboxEvent,
} from './types';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const now = Date.parse('2026-09-24T09:00:00.000Z');

function event(partial: Partial<OutboxEvent> & Pick<OutboxEvent, 'id'>): OutboxEvent {
  return {
    organizationId: 'org-a',
    locationId: null,
    aggregateType: 'reservation',
    aggregateId: 'r1',
    eventType: 'reservation.confirmed',
    payload: reservationConfirmedPayload({
      organizationId: 'org-a',
      reservationId: 'r1',
      scheduleId: 's1',
    }),
    status: 'pending',
    attempts: 0,
    availableAt: '2026-09-24T09:00:00.000Z',
    processedAt: null,
    lastError: null,
    createdAt: '2026-09-24T09:00:00.000Z',
    ...partial,
  };
}

function run() {
  assert.equal(OUTBOX_PILOT_EVENT, 'reservation.confirmed');
  assert.equal(OUTBOX_EVENT_TYPES.includes('payment.completed'), true);

  const payload = withOutboxContext({
    organizationId: 'org-a',
    locationId: 'loc-1',
    aggregateType: 'reservation',
    aggregateId: 'r1',
    eventType: 'reservation.confirmed',
    payload: { reservationId: 'r1' },
  });
  assert.equal(payload.organizationId, 'org-a');
  assert.equal(payload.locationId, 'loc-1');
  assert.equal(payload.eventType, 'reservation.confirmed');

  const sameKey = outboxDedupeKey('reservation.confirmed', 'reservation', 'r1');
  assert.equal(sameKey, outboxDedupeKey('reservation.confirmed', 'reservation', 'r1'));
  assert.notEqual(sameKey, outboxDedupeKey('reservation.requested', 'reservation', 'r1'));
  assert.equal(
    outboxEventDedupeKey({
      eventType: 'reservation.confirmed',
      aggregateType: 'reservation',
      aggregateId: 'r1',
    }),
    sameKey
  );
  assert.equal(
    outboxEventDedupeKey({
      eventType: 'reservation.confirmed',
      aggregateType: 'reservation',
      aggregateId: 'r1',
      dedupeKey: 'custom-key',
    }),
    'custom-key'
  );

  const first = event({ id: 'e1' });
  const later = event({ id: 'e2', availableAt: '2026-09-24T10:00:00.000Z' });
  const claimed = claimOutboxBatch([later, first], now, 1);
  assert.equal(claimed.length, 1);
  assert.equal(claimed[0].id, 'e1');
  assert.equal(claimed[0].status, 'processing');
  assert.equal(claimed[0].attempts, 1);

  const done = completeOutboxEvent(claimed[0], now);
  assert.equal(done.status, 'processed');
  assert.ok(done.processedAt);

  const retry = failOutboxEvent({ ...claimed[0], attempts: 1 }, now, 'push failed');
  assert.equal(retry.status, 'pending');
  assert.equal(retry.lastError, 'push failed');

  const exhausted = failOutboxEvent({ ...claimed[0], attempts: OUTBOX_MAX_ATTEMPTS }, now, 'give up');
  assert.equal(exhausted.status, 'failed');

  const delivered = new Set<string>();
  assert.equal(handleReservationConfirmed(first, delivered), 'processed');
  const after = markDelivered(delivered, first.id);
  assert.equal(isDuplicateDelivery(after, first.id), true);
  assert.equal(handleReservationConfirmed(first, after), 'processed');
  assert.equal(dispatchOutboxEvent(first, reservationConfirmedConsumer, after), 'processed');

  const missing = event({
    id: 'e3',
    payload: { eventType: 'reservation.confirmed' },
  });
  assert.equal(handleReservationConfirmed(missing, new Set()), 'retry');

  const sql = readFileSync(
    join(root, 'supabase/migrations/20260924320000_transactional_outbox.sql'),
    'utf8'
  );
  assert.match(sql, /CREATE TABLE core\.outbox_events/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.enqueue_outbox_event/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.claim_outbox_events/);
  assert.match(sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.complete_outbox_event/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.fail_outbox_event/);
  assert.match(sql, /organizationId/);
  assert.match(sql, /locationId/);
  assert.match(sql, /reservation\.confirmed/);
  assert.match(sql, /PERFORM core\.enqueue_outbox_event/);
  assert.match(sql, /dedupe_key/);
  assert.match(sql, /uq_outbox_events_org_dedupe/);
  assert.match(sql, /UNIQUE \(organization_id, dedupe_key\)/);
  assert.match(sql, /ON CONFLICT ON CONSTRAINT uq_outbox_events_org_dedupe DO NOTHING/);
  assert.match(sql, /core\.outbox_dedupe_key/);
  assert.match(sql, /RETURN true/);
  assert.match(sql, /assert_not_overbooked/);
  assert.match(sql, /FOR UPDATE OF s/);
  assert.match(sql, /SECURITY INVOKER/);
  assert.match(sql, /require_outbox_worker/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION core\.claim_outbox_events\(UUID, INT\) TO service_role/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION core\.complete_outbox_event\(UUID\) TO service_role/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION core\.fail_outbox_event\(UUID, TEXT\) TO service_role/);
  assert.match(sql, /REVOKE ALL ON FUNCTION core\.enqueue_outbox_event\(UUID, TEXT, TEXT, TEXT, JSONB, UUID\) FROM anon, authenticated/);
  assert.match(sql, /REVOKE ALL ON FUNCTION core\.claim_outbox_events\(UUID, INT\) FROM anon, authenticated/);
  assert.match(sql, /REVOKE ALL ON FUNCTION core\.complete_outbox_event\(UUID\) FROM anon, authenticated/);
  assert.match(sql, /REVOKE ALL ON FUNCTION core\.fail_outbox_event\(UUID, TEXT\) FROM anon, authenticated/);
  assert.doesNotMatch(
    sql,
    /GRANT EXECUTE ON FUNCTION core\.(enqueue_outbox_event|claim_outbox_events|complete_outbox_event|fail_outbox_event).*TO authenticated/
  );
  assert.doesNotMatch(sql, /twilio|ncp|aligo|solapi|fetch\(/i);
  assert.doesNotMatch(sql, /ALTER TABLE core\.(reservations|schedules|notifications)/);

  const capacitySql = readFileSync(
    join(root, 'supabase/migrations/20260924240000_capacity_capability.sql'),
    'utf8'
  );
  assert.match(capacitySql, /CREATE OR REPLACE FUNCTION core\.confirm_reservation/);

  console.log('outboxCapability.test.ts: ok');
}

run();
