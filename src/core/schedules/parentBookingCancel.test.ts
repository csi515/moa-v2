/**
 * 부모 예약 취소 정책·계약.
 * 실행: npm run test:parent-booking-cancel
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyLocalBookingPassChange } from './bookingPassLocalApply';
import {
  canCancelBookingAsParent,
  evaluateParentBookingCancel,
  parentCancelDeniedMessage,
} from './parentBookingCancelPolicy';
import type { Booking } from '@/core/types/schedule';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');

function booking(partial: Partial<Booking> = {}): Booking {
  return {
    id: 'bk-1',
    customerId: 'child-1',
    customerName: '자녀',
    startsAt: '2026-09-25T03:00:00.000Z',
    endsAt: '2026-09-25T04:00:00.000Z',
    status: 'scheduled',
    requestedBy: 'customer',
    ...partial,
  };
}

function run() {
  const now = '2026-09-24T03:00:00.000Z';

  assert.equal(canCancelBookingAsParent(booking(), now), true);
  assert.deepEqual(evaluateParentBookingCancel(booking(), now), {
    ok: true,
    action: 'cancel',
  });

  assert.deepEqual(evaluateParentBookingCancel(booking({ status: 'cancelled' }), now), {
    ok: true,
    action: 'idempotent',
  });

  assert.deepEqual(
    evaluateParentBookingCancel(booking({ requestedBy: 'staff' }), now),
    { ok: false, reason: 'not_customer_request' }
  );
  assert.deepEqual(
    evaluateParentBookingCancel(booking({ status: 'completed' }), now),
    { ok: false, reason: 'not_scheduled' }
  );
  assert.deepEqual(
    evaluateParentBookingCancel(booking({ startsAt: '2026-09-23T03:00:00.000Z' }), now),
    { ok: false, reason: 'window_expired' }
  );

  assert.match(parentCancelDeniedMessage('window_expired'), /시간/);

  {
    let refunds = 0;
    const completed = booking({
      status: 'completed',
      sessionPassId: 'pass-1',
      requestedBy: 'customer',
    });
    const next = applyLocalBookingPassChange(completed, 'cancelled', {
      consume: () => null,
      refund: () => {
        refunds += 1;
        return true;
      },
      hasEntitlement: () => true,
    });
    assert.equal(next?.status, 'cancelled');
    assert.equal(next?.sessionPassId, undefined);
    assert.equal(refunds, 1);

    const again = applyLocalBookingPassChange(next!, 'cancelled', {
      consume: () => null,
      refund: () => {
        refunds += 1;
        return true;
      },
      hasEntitlement: () => true,
    });
    assert.equal(again?.status, 'cancelled');
    assert.equal(refunds, 1);
  }

  const sql = readFileSync(
    join(root, 'supabase/migrations/20260924160000_cancel_booking_as_parent.sql'),
    'utf8'
  );
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.cancel_booking_as_parent/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /parent_owns_customer/);
  assert.match(sql, /Organization mismatch/);
  assert.match(sql, /Cancellation window expired/);
  assert.match(sql, /Not a customer-requested booking/);
  assert.match(sql, /action', 'idempotent'/);
  assert.doesNotMatch(sql, /is_org_staff_actor/);
  const staffSql = readFileSync(
    join(root, 'supabase/migrations/20260924110000_harden_session_pass_lock_and_refund.sql'),
    'utf8'
  );
  assert.match(staffSql, /IF NOT core\.is_org_staff_actor/);
  assert.doesNotMatch(staffSql, /parent_owns_customer/);

  const view = readFileSync(
    join(here, '../../modules/parent/views/PilatesParentBookingsView.tsx'),
    'utf8'
  );
  assert.match(view, /cancelBookingAsParent/);
  assert.doesNotMatch(view, /updateBookingStatus\(/);

  const service = readFileSync(join(here, '../services/scheduleService.ts'), 'utf8');
  assert.match(service, /cancelBookingAsParent/);
  assert.match(service, /updateBookingStatusAtomic/);

  const client = readFileSync(join(here, 'parentBookingCancel.ts'), 'utf8');
  assert.match(client, /cancel_booking_as_parent/);
  assert.doesNotMatch(client, /rpc\(\s*['"]update_booking_status_with_pass/);
  assert.match(client, /writeBookingMirror/);

  console.log('parentBookingCancel.test.ts: ok');
}

run();
