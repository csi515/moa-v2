/**
 * Bath Booking 연결. 실행: npm run test:bath-booking
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rowToBathBooking, type BathBookingRow } from './bookingMappers';
import { mapBathBookingRpcError } from './bookingErrors';
import {
  isResourceSlotFree,
  resolveBookingEndsAt,
  validateBathBookingInput,
} from './bookingValidation';
import { BATH_BOOKING_KINDS, STAFF_RESOURCE_KIND } from '../types/booking';

function run() {
  assert.ok(BATH_BOOKING_KINDS.includes('room'));
  assert.ok(BATH_BOOKING_KINDS.includes('scrub'));
  assert.ok(BATH_BOOKING_KINDS.includes('massage'));
  assert.equal(STAFF_RESOURCE_KIND, 'staff');

  assert.equal(
    resolveBookingEndsAt({ customerId: 'c1', startsAt: '2026-09-24T01:00:00.000Z' }, 40),
    '2026-09-24T01:40:00.000Z'
  );

  assert.deepEqual(
    validateBathBookingInput(
      { customerId: 'c1', startsAt: '2026-09-24T01:00:00.000Z', resourceId: 'res-1' },
      { endsAt: '2026-09-24T01:30:00.000Z' }
    ),
    { ok: true }
  );
  assert.deepEqual(
    validateBathBookingInput(
      { customerId: '', startsAt: '2026-09-24T01:00:00.000Z', resourceId: 'res-1' },
      { endsAt: '2026-09-24T01:30:00.000Z' }
    ),
    { ok: false, reason: 'customer' }
  );
  assert.deepEqual(
    validateBathBookingInput(
      { customerId: 'c1', startsAt: '2026-09-24T01:00:00.000Z' },
      { endsAt: '2026-09-24T01:30:00.000Z' }
    ),
    { ok: false, reason: 'resource' }
  );
  assert.deepEqual(
    validateBathBookingInput(
      { customerId: 'c1', startsAt: '2026-09-24T01:00:00.000Z', resourceId: 'res-1' },
      {
        endsAt: '2026-09-24T01:30:00.000Z',
        service: {
          active: true,
          requiresResource: true,
          requiresStaff: true,
          resourceIds: ['res-2'],
          staffIds: [],
        },
      }
    ),
    { ok: false, reason: 'service_resource' }
  );
  assert.deepEqual(
    validateBathBookingInput(
      { customerId: 'c1', startsAt: '2026-09-24T01:00:00.000Z', resourceId: 'res-1' },
      {
        endsAt: '2026-09-24T01:30:00.000Z',
        service: {
          active: true,
          requiresResource: true,
          requiresStaff: true,
          resourceIds: ['res-1'],
          staffIds: [],
        },
      }
    ),
    { ok: false, reason: 'staff' }
  );

  assert.equal(
    isResourceSlotFree(
      [
        {
          resourceId: 'res-1',
          starts_at: '2026-09-24T01:00:00.000Z',
          ends_at: '2026-09-24T02:00:00.000Z',
          status: 'approved',
        },
      ],
      'res-1',
      '2026-09-24T01:30:00.000Z',
      '2026-09-24T02:30:00.000Z'
    ),
    false
  );
  assert.equal(
    isResourceSlotFree(
      [
        {
          resourceId: 'res-1',
          starts_at: '2026-09-24T01:00:00.000Z',
          ends_at: '2026-09-24T02:00:00.000Z',
          status: 'cancelled',
        },
      ],
      'res-1',
      '2026-09-24T01:30:00.000Z',
      '2026-09-24T02:30:00.000Z'
    ),
    true
  );

  const row: BathBookingRow = {
    id: 'b1',
    organization_id: 'org-1',
    customer_id: 'c1',
    reservation_id: 'rr-1',
    staff_reservation_id: 'rr-staff',
    service_id: 'svc-1',
    resource_id: 'res-1',
    staff_id: 'st-1',
    room_id: null,
    kind: 'scrub',
    starts_at: '2026-09-24T01:00:00.000Z',
    ends_at: '2026-09-24T01:30:00.000Z',
    status: 'approved',
    memo: null,
    idempotency_key: '11111111-1111-1111-1111-111111111111',
    metadata: {},
    created_at: '2026-09-24T00:00:00.000Z',
    updated_at: '2026-09-24T00:00:00.000Z',
  };
  const booking = rowToBathBooking(row);
  assert.equal(booking.reservationId, 'rr-1');
  assert.equal(booking.staffReservationId, 'rr-staff');
  assert.equal(booking.kind, 'scrub');

  assert.equal(mapBathBookingRpcError({ message: 'Time slot already reserved' }).code, 'conflict');
  assert.equal(mapBathBookingRpcError({ message: 'Organization mismatch' }).code, 'org_mismatch');

  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(
    join(here, '../../../../supabase/migrations/20260924210000_bath_bookings.sql'),
    'utf8'
  );
  assert.match(sql, /CREATE TABLE bath\.bookings/);
  assert.match(sql, /UNIQUE \(organization_id, idempotency_key\)/);
  assert.match(sql, /book_room_reservation_guarded/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /kind = 'staff'/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /is_org_staff_actor/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION bath\.create_booking/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION bath\.cancel_booking/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION bath\.set_booking_status/);
  assert.doesNotMatch(sql, /EXCLUDE USING gist/);
  assert.doesNotMatch(sql, /create_sale/);
  assert.doesNotMatch(sql, /update_booking_status_with_pass/);
  assert.doesNotMatch(sql, /check_in_visit/);

  const service = readFileSync(join(here, 'bookingService.ts'), 'utf8');
  assert.match(service, /resourceReservationCapability/);
  assert.match(service, /create_booking/);
  assert.match(service, /checkAvailability/);
  assert.match(service, /requireOrgId/);
  assert.doesNotMatch(service, /StorageService/);
  assert.doesNotMatch(service, /create_sale/);
  assert.doesNotMatch(service, /book_room_reservation_guarded/);

  const repo = readFileSync(join(here, 'bookingRepository.ts'), 'utf8');
  assert.match(repo, /eq\('organization_id', organizationId\)/);

  console.log('bookingDomain.test.ts: ok');
}

run();
