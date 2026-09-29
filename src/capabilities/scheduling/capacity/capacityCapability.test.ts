/**
 * Capacity Capability. 실행: npm run test:capacity
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSlotCapacityInfo } from '@/core/schedules/bookingCapacity';
import type { Booking, ServiceOffering } from '@/core/types/schedule';
import { capacityCapability } from './capacityCapability';
import { canAccept, computeCapacitySnapshot, reservationCapacitySnapshot } from './capacityMath';
import { resourceCapacitySnapshot } from './resourceOccupancy';
import type { ResourceOccupancyReservation } from './resourceOccupancy';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkTs(full, acc);
      continue;
    }
    if ((name.endsWith('.ts') || name.endsWith('.tsx')) && !name.endsWith('.test.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function booking(
  partial: Partial<Booking> & Pick<Booking, 'id' | 'startsAt' | 'status'>
): Booking {
  return {
    customerId: 'c1',
    customerName: '회원',
    serviceId: 'svc1',
    staffId: 'st1',
    endsAt: partial.startsAt,
    ...partial,
  } as Booking;
}

function run() {
  const oneEmpty = computeCapacitySnapshot({ capacity: 1, booked: 0 });
  assert.deepEqual(oneEmpty, { capacity: 1, booked: 0, available: 1, isFull: false });
  assert.equal(canAccept(oneEmpty), true);

  const oneFull = computeCapacitySnapshot({ capacity: 1, booked: 1 });
  assert.equal(oneFull.available, 0);
  assert.equal(oneFull.isFull, true);
  assert.equal(canAccept(oneFull), false);

  const group = computeCapacitySnapshot({ capacity: 10, booked: 9 });
  assert.equal(group.available, 1);
  assert.equal(canAccept(group), true);
  assert.equal(canAccept(computeCapacitySnapshot({ capacity: 10, booked: 10 })), false);

  const massage = computeCapacitySnapshot({ capacity: 2, booked: 1 });
  assert.equal(massage.available, 1);
  const room = computeCapacitySnapshot({ capacity: 4, booked: 4 });
  assert.equal(room.isFull, true);
  const program = computeCapacitySnapshot({ capacity: 20, booked: 0 });
  assert.equal(program.available, 20);

  assert.equal(capacityCapability.normalizeCapacity(0), 1);
  assert.equal(capacityCapability.normalizeCapacity(null), 1);
  assert.equal(capacityCapability.normalizeBooked(-3), 0);

  let booked = 0;
  const lastSlot = 1;
  const first = canAccept(computeCapacitySnapshot({ capacity: lastSlot, booked }));
  if (first) booked += 1;
  const second = canAccept(computeCapacitySnapshot({ capacity: lastSlot, booked }));
  assert.equal(first, true);
  assert.equal(second, false);

  const holding = reservationCapacitySnapshot({
    capacity: 2,
    statuses: ['requested', 'confirmed', 'cancelled'],
  });
  assert.equal(holding.booked, 2);
  assert.equal(holding.available, 0);

  const afterCancel = reservationCapacitySnapshot({
    capacity: 2,
    statuses: ['cancelled', 'confirmed'],
  });
  assert.equal(afterCancel.booked, 1);
  assert.equal(afterCancel.available, 1);
  assert.equal(canAccept(afterCancel), true);

  const slotService: ServiceOffering = {
    id: 'svc1',
    name: '그룹',
    durationMinutes: 60,
    maxCapacity: 4,
    isActive: true,
  } as ServiceOffering;
  const slotBookings = [
    booking({ id: 's1', startsAt: '2026-09-22T10:00:00', status: 'confirmed' }),
    booking({ id: 's2', startsAt: '2026-09-22T10:00:00', status: 'scheduled' }),
    booking({ id: 's3', startsAt: '2026-09-22T10:00:00', status: 'cancelled' }),
    booking({ id: 's4', startsAt: '2026-09-22T10:00:00', status: 'scheduled', waitlist: true }),
  ];
  const slot = getSlotCapacityInfo({
    service: slotService,
    staffId: 'st1',
    startsAt: '2026-09-22T10:00:00',
    bookings: slotBookings,
  });
  assert.equal(slot.occupied, 2);
  assert.equal(slot.maxCapacity, 4);
  assert.equal(slot.remaining, 2);
  assert.equal(slot.isClosed, false);

  const restored = getSlotCapacityInfo({
    service: { ...slotService, maxCapacity: 1 },
    staffId: 'st1',
    startsAt: '2026-09-22T10:00:00',
    bookings: [booking({ id: 'c1', startsAt: '2026-09-22T10:00:00', status: 'cancelled' })],
  });
  assert.equal(restored.occupied, 0);
  assert.equal(restored.remaining, 1);
  assert.equal(restored.isClosed, false);

  const closed = getSlotCapacityInfo({
    service: slotService,
    staffId: 'st1',
    startsAt: '2026-09-22T10:00:00',
    bookings: [],
    recruitments: [
      {
        id: 'svc1|st1|2026-09-22T10:00:00',
        serviceId: 'svc1',
        staffId: 'st1',
        startsAt: '2026-09-22T10:00:00',
        maxCapacity: 4,
        closedManually: true,
      },
    ],
  });
  assert.equal(closed.remaining, 4);
  assert.equal(closed.closedManually, true);
  assert.equal(closed.isClosed, true);

  const reservations: ResourceOccupancyReservation[] = [
    {
      resourceId: 'room-1',
      startsAt: '2026-09-24T10:00:00',
      endsAt: '2026-09-24T11:00:00',
      status: 'approved',
    },
    {
      resourceId: 'room-1',
      startsAt: '2026-09-24T10:30:00',
      endsAt: '2026-09-24T11:30:00',
      status: 'cancelled',
    },
  ];
  const resourceSnap = resourceCapacitySnapshot({
    capacity: 2,
    resourceId: 'room-1',
    startsAt: '2026-09-24T10:00:00',
    endsAt: '2026-09-24T11:00:00',
    reservations,
  });
  assert.equal(resourceSnap.booked, 1);
  assert.equal(resourceSnap.available, 1);
  assert.equal(canAccept(resourceSnap), true);

  const sql = readSrc('supabase/migrations/20260924240000_capacity_capability.sql');
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.normalize_capacity/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.capacity_available/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.capacity_snapshot/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.assert_not_overbooked/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.count_schedule_holding/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.count_resource_occupancy/);
  assert.match(sql, /FOR UPDATE OF s/);
  assert.match(sql, /assert_not_overbooked/);
  assert.match(sql, /Schedule is fully booked/);
  assert.match(sql, /max_capacity/);
  assert.match(sql, /status IN \('requested', 'confirmed'\)|status = 'confirmed'/);
  assert.doesNotMatch(sql, /sauna_jjimjilbang/);
  assert.doesNotMatch(sql, /CREATE TABLE/);
  assert.doesNotMatch(sql, /EXCLUDE USING gist/);

  const requestSql = [readSrc('supabase/migrations/20260910073000_phase1_security_customer_separation.sql'), sql].join(
    '\n'
  );
  assert.match(requestSql, /FOR UPDATE OF s/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.request_reservation/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.confirm_reservation/);
  assert.match(sql, /count_schedule_holding/);

  const cancelSql = readSrc('supabase/migrations/20260904150000_core_schedule_reservation_system.sql');
  assert.match(cancelSql, /CREATE OR REPLACE FUNCTION core\.cancel_reservation/);
  assert.match(cancelSql, /status = 'cancelled'/);

  const bookingCap = readSrc('src/capabilities/scheduling/capacity/bookingCapacity.ts');
  assert.match(bookingCap, /computeCapacitySnapshot/);
  assert.match(bookingCap, /maxCapacity/);
  assert.doesNotMatch(bookingCap, /bath|sauna|piano|gym/i);

  const bookingCapShim = readSrc('src/core/schedules/bookingCapacity.ts');
  assert.match(bookingCapShim, /@deprecated 신규 코드는/);
  assert.match(bookingCapShim, /@\/capabilities\/scheduling/);

  const coreCapacity = walkTs(join(root, 'src/core/capacity'))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  assert.doesNotMatch(coreCapacity, /sauna_jjimjilbang/);
  assert.doesNotMatch(coreCapacity, /from '@\/modules\//);
  assert.doesNotMatch(coreCapacity, /pilates|skin|retail|daycare/i);

  const pilatesValidate = readSrc('src/industries/pilates/components/bookings/validateBookingCreate.ts');
  assert.match(pilatesValidate, /getSlotCapacityInfo/);

  const reservationSvc = readSrc('src/core/schedules/services/reservationService.ts');
  assert.match(reservationSvc, /capacityCapability/);
  assert.match(reservationSvc, /request_reservation/);
  assert.match(reservationSvc, /confirm_reservation/);

  const resourceCap = readSrc('src/core/resources/resourceCapability.ts');
  assert.match(resourceCap, /capacitySnapshot/);

  const excludeSql = readSrc('supabase/migrations/20260907130000_practice_room_reservations.sql');
  assert.match(excludeSql, /EXCLUDE USING gist/);

  console.log('capacityCapability.test.ts: ok');
}

run();
