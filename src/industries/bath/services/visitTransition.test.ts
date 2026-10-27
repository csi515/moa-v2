/**
 * Bath visit 상태 전이. 실행: npm run test:bath-visit
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateVisitCancel,
  evaluateVisitCheckIn,
  evaluateVisitCheckOut,
} from './visitTransition';
import { mapBathVisitRpcError } from './visitErrors';
import { rowToBathVisit, rpcPayloadToVisitResult } from './visitMappers';
import type { BathVisitRow } from './visitMappers';

function run() {
  assert.deepEqual(evaluateVisitCheckIn(false), { ok: true, action: 'create' });
  assert.deepEqual(evaluateVisitCheckIn(true), { ok: true, action: 'idempotent' });

  assert.deepEqual(evaluateVisitCheckOut('checked_in'), { ok: true, action: 'checked_out' });
  assert.deepEqual(evaluateVisitCheckOut('checked_out'), { ok: true, action: 'idempotent' });
  assert.deepEqual(evaluateVisitCheckOut('cancelled'), { ok: false, reason: 'not_open' });

  assert.deepEqual(evaluateVisitCancel('checked_in'), { ok: true, action: 'cancelled' });
  assert.deepEqual(evaluateVisitCancel('cancelled'), { ok: true, action: 'idempotent' });
  assert.deepEqual(evaluateVisitCancel('checked_out'), { ok: false, reason: 'not_cancellable' });

  assert.equal(mapBathVisitRpcError({ message: 'Permission denied' }).code, 'permission');
  assert.equal(mapBathVisitRpcError({ message: 'Visit not open' }).code, 'not_open');
  assert.equal(mapBathVisitRpcError({ message: 'Customer not found in organization' }).code, 'customer');
  assert.equal(mapBathVisitRpcError({ message: 'Pass not found for customer' }).code, 'pass');

  const row: BathVisitRow = {
    id: 'v1',
    organization_id: 'org-1',
    customer_id: 'cust-1',
    check_in_at: '2026-09-24T01:00:00.000Z',
    check_out_at: null,
    status: 'checked_in',
    entry_product_id: 'prod-1',
    pass_id: null,
    locker_id: null,
    room_reservation_id: null,
    staff_id: 'staff-1',
    memo: 'memo',
    metadata: { source: 'desk' },
    created_at: '2026-09-24T01:00:00.000Z',
    updated_at: '2026-09-24T01:00:00.000Z',
  };
  const visit = rowToBathVisit(row);
  assert.equal(visit.organizationId, 'org-1');
  assert.equal(visit.customerId, 'cust-1');
  assert.equal(visit.entryProductId, 'prod-1');
  assert.equal(visit.passId, undefined);
  assert.equal(visit.status, 'checked_in');

  const result = rpcPayloadToVisitResult({ ...row, action: 'created' });
  assert.equal(result.action, 'created');
  assert.equal(result.visit.id, 'v1');

  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(
    join(here, '../../../../supabase/migrations/20260924170000_bath_visits.sql'),
    'utf8'
  );
  assert.match(sql, /CREATE SCHEMA IF NOT EXISTS bath/);
  assert.match(sql, /CREATE TABLE bath\.visits/);
  assert.match(sql, /REFERENCES core\.customers/);
  assert.match(sql, /REFERENCES core\.products/);
  assert.match(sql, /REFERENCES core\.session_passes/);
  assert.match(sql, /uq_bath_visits_open_customer/);
  assert.match(sql, /is_org_staff_actor/);
  assert.match(sql, /parent_owns_customer/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION bath\.check_in_visit/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION bath\.check_out_visit/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION bath\.cancel_visit/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /idempotent/);
  assert.doesNotMatch(sql, /used_sessions/);
  assert.doesNotMatch(sql, /create_sale/);
  assert.doesNotMatch(sql, /update_booking_status_with_pass/);

  const service = readFileSync(join(here, 'visitService.ts'), 'utf8');
  assert.match(service, /check_in_visit/);
  assert.match(service, /check_out_visit/);
  assert.match(service, /cancel_visit/);
  assert.doesNotMatch(service, /StorageService/);
  assert.doesNotMatch(service, /persistSchedules/);

  console.log('visitTransition.test.ts: ok');
}

run();
