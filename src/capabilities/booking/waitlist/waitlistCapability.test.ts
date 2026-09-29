/**
 * Waitlist Capability. 실행: npm run test:waitlist
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  claimVacancySequentially,
  displayPositionOf,
  evaluateWaitlistAssign,
  evaluateWaitlistCancel,
  evaluateWaitlistExpire,
  evaluateWaitlistJoin,
  evaluateWaitlistNotify,
  nextWaitlistPosition,
  pickNextForVacancy,
  resequenceOpenEntries,
} from './transitions';
import { WAITLIST_OPEN_STATUSES, WAITLIST_STATUSES, WAITLIST_TARGET_TYPES } from './types';
import type { WaitlistStatus } from './types';
import { mapWaitlistRpcError } from './waitlistErrors';
import { rowToWaitlistEntry, rpcPayloadToWaitlistResult, type WaitlistEntryRow } from './waitlistMappers';

const here = dirname(fileURLToPath(import.meta.url));

function entry(
  id: string,
  position: number,
  status: WaitlistStatus
): { id: string; position: number; status: WaitlistStatus } {
  return { id, position, status };
}

function run() {
  assert.deepEqual([...WAITLIST_STATUSES], [
    'waiting',
    'notified',
    'assigned',
    'cancelled',
    'expired',
  ]);
  assert.deepEqual([...WAITLIST_OPEN_STATUSES], ['waiting', 'notified']);
  assert.deepEqual([...WAITLIST_TARGET_TYPES], ['schedule', 'resource', 'slot']);

  assert.deepEqual(evaluateWaitlistJoin(false), { ok: true, action: 'create' });
  assert.deepEqual(evaluateWaitlistJoin(true), { ok: true, action: 'idempotent' });
  assert.equal(nextWaitlistPosition([]), 1);
  assert.equal(nextWaitlistPosition([1]), 2);
  assert.equal(nextWaitlistPosition([1, 2]), 3);

  const joined = [entry('a', 1, 'waiting'), entry('b', 2, 'waiting')];
  assert.equal(joined[0].position, 1);
  assert.equal(joined[1].position, 2);

  const afterCancel = resequenceOpenEntries([entry('a', 1, 'cancelled'), entry('b', 2, 'waiting')]);
  assert.equal(afterCancel.length, 1);
  assert.equal(afterCancel[0].id, 'b');
  assert.equal(afterCancel[0].position, 1);
  assert.equal(
    displayPositionOf([entry('a', 1, 'cancelled'), entry('b', 2, 'waiting')], 'b'),
    1
  );

  const queue = [entry('a', 1, 'waiting'), entry('b', 2, 'waiting'), entry('c', 3, 'waiting')];
  const vacancy = pickNextForVacancy(queue);
  assert.equal(vacancy?.id, 'a');

  const concurrent = claimVacancySequentially([
    entry('a', 1, 'waiting'),
    entry('b', 2, 'waiting'),
  ]);
  assert.equal(concurrent.first?.id, 'a');
  assert.equal(concurrent.first?.status, 'assigned');
  assert.equal(concurrent.second?.id, 'b');
  const emptySecond = claimVacancySequentially([entry('only', 1, 'waiting')]);
  assert.equal(emptySecond.first?.id, 'only');
  assert.equal(emptySecond.second, null);

  assert.deepEqual(evaluateWaitlistCancel('waiting'), { ok: true, action: 'cancelled' });
  assert.deepEqual(evaluateWaitlistCancel('cancelled'), { ok: true, action: 'idempotent' });
  assert.deepEqual(evaluateWaitlistCancel('assigned'), { ok: false, reason: 'not_cancellable' });
  assert.deepEqual(evaluateWaitlistExpire('notified'), { ok: true, action: 'expired' });
  assert.deepEqual(evaluateWaitlistExpire('expired'), { ok: true, action: 'idempotent' });
  assert.deepEqual(evaluateWaitlistExpire('assigned'), { ok: false, reason: 'not_expirable' });
  assert.deepEqual(evaluateWaitlistNotify('waiting'), { ok: true, action: 'notified' });
  assert.deepEqual(evaluateWaitlistNotify('notified'), { ok: true, action: 'idempotent' });
  assert.deepEqual(evaluateWaitlistAssign('waiting'), { ok: true, action: 'assigned' });
  assert.deepEqual(evaluateWaitlistAssign('assigned'), { ok: true, action: 'idempotent' });

  assert.equal(mapWaitlistRpcError({ message: 'Permission denied' }).code, 'permission');
  assert.equal(mapWaitlistRpcError({ message: 'Waitlist is empty' }).code, 'empty');
  assert.equal(mapWaitlistRpcError({ message: 'Waitlist entry is not cancellable' }).code, 'not_cancellable');

  const row: WaitlistEntryRow = {
    id: 'w1',
    organization_id: 'org-1',
    target_type: 'slot',
    target_id: 'svc1|st1|2026-09-24T10:00:00',
    customer_id: 'c1',
    schedule_id: null,
    requested_time: '2026-09-24T10:00:00.000Z',
    status: 'waiting',
    position: 1,
    joined_at: '2026-09-24T01:00:00.000Z',
    notified_at: null,
    assigned_at: null,
    cancelled_at: null,
    expired_at: null,
    booking_id: null,
    reservation_id: null,
    notification_id: null,
    metadata: {},
    created_at: '2026-09-24T01:00:00.000Z',
    updated_at: '2026-09-24T01:00:00.000Z',
    action: 'created',
  };
  const mapped = rowToWaitlistEntry(row);
  assert.equal(mapped.targetType, 'slot');
  assert.equal(mapped.bookingId, undefined);
  assert.equal(rpcPayloadToWaitlistResult(row).action, 'created');

  const sql = readFileSync(join(here, '../../../../supabase/migrations/20260924250000_waitlist_capability.sql'), 'utf8');
  assert.match(sql, /CREATE TABLE core\.waitlist_entries/);
  assert.match(sql, /uq_waitlist_open_position/);
  assert.match(sql, /uq_waitlist_open_customer/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /resequence_waitlist/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.join_waitlist/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.cancel_waitlist/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.expire_waitlist/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.notify_waitlist/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.claim_waitlist_vacancy/);
  assert.match(sql, /INSERT INTO core\.notifications/);
  assert.match(sql, /type, title, message/);
  assert.match(sql, /'waitlist'/);
  assert.match(sql, /'pending'/);
  assert.match(sql, /booking_id/);
  assert.match(sql, /reservation_id/);
  assert.match(sql, /notification_id/);
  assert.match(sql, /schedule_id/);
  assert.match(sql, /requested_time/);
  assert.match(sql, /is_org_staff_actor/);
  assert.match(sql, /is_my_customer/);
  assert.doesNotMatch(sql, /CREATE TABLE bath\./);
  assert.doesNotMatch(sql, /bath\.waitlist/);
  assert.doesNotMatch(sql, /sauna_jjimjilbang/);
  assert.doesNotMatch(sql, /twilio|ncp|aligo|solapi/i);
  assert.doesNotMatch(sql, /channel.*sms|'sms'/);

  const service = readFileSync(join(here, 'waitlistService.ts'), 'utf8');
  assert.match(service, /join_waitlist/);
  assert.match(service, /claim_waitlist_vacancy/);
  assert.doesNotMatch(service, /create_sale/);
  assert.doesNotMatch(service, /bath\.|sauna|pilates|piano|beauty/);

  const repo = readFileSync(join(here, 'waitlistRepository.ts'), 'utf8');
  assert.match(repo, /eq\('organization_id', organizationId\)/);
  assert.match(repo, /waitlist_entries/);

  const capability = readFileSync(join(here, 'waitlistCapability.ts'), 'utf8');
  assert.match(capability, /waitlistService/);
  assert.match(capability, /claimVacancy/);
  assert.doesNotMatch(capability, /bath|sauna|piano|pilates|skin|retail|beauty/i);

  const bookingCap = readFileSync(join(here, '../../scheduling/capacity/bookingCapacity.ts'), 'utf8');
  assert.match(bookingCap, /booking\.waitlist/);

  console.log('waitlistCapability.test.ts: ok');
}

run();
