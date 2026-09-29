/**
 * bookingQuery / slot occupancy 성능 헬퍼 unit test
 * 실행: npm run test:booking-query
 */
import assert from 'node:assert/strict';
import type { Booking } from '@/core/types/schedule';
import {
  filterBookingsByDate,
  filterBookingsForSlotWindow,
  selectUpcomingBookings,
} from './bookingQuery';
import {
  buildSlotOccupancyIndex,
  getSlotCapacityInfo,
} from './bookingCapacity';
import type { ServiceOffering } from '@/core/types/schedule';

function booking(partial: Partial<Booking> & Pick<Booking, 'id' | 'startsAt'>): Booking {
  return {
    customerId: 'c1',
    customerName: '회원',
    endsAt: partial.startsAt,
    status: 'scheduled',
    ...partial,
  } as Booking;
}

async function run() {
  const list: Booking[] = [
    booking({ id: 'b1', startsAt: '2026-09-20T09:00:00', status: 'scheduled' }),
    booking({ id: 'b2', startsAt: '2026-09-22T10:00:00', status: 'scheduled' }),
    booking({ id: 'b3', startsAt: '2026-09-22T14:00:00', status: 'cancelled' }),
    booking({ id: 'b4', startsAt: '2026-09-23T11:00:00', status: 'confirmed' }),
    booking({ id: 'b5', startsAt: '2026-09-24T08:00:00', status: 'scheduled' }),
  ];

  const byDate = filterBookingsByDate(list, '2026-09-22');
  assert.equal(byDate.length, 2);
  assert.deepEqual(
    byDate.map((b) => b.id),
    ['b2', 'b3']
  );

  const upcoming = selectUpcomingBookings(list, {
    nowIso: '2026-09-22T00:00:00',
    limit: 2,
  });
  assert.equal(upcoming.length, 2);
  assert.deepEqual(
    upcoming.map((b) => b.id),
    ['b2', 'b4']
  ); // cancelled 제외, startsAt 오름차순 top-2

  const window = filterBookingsForSlotWindow(list, '2026-09-22T10:00:00');
  assert.equal(window.length, 1);
  assert.equal(window[0].id, 'b2');

  const slotBookings: Booking[] = [
    booking({
      id: 's1',
      startsAt: '2026-09-22T10:00:00',
      serviceId: 'svc1',
      staffId: 'st1',
      status: 'confirmed',
    }),
    booking({
      id: 's2',
      startsAt: '2026-09-22T10:00:00',
      serviceId: 'svc1',
      staffId: 'st1',
      status: 'scheduled',
    }),
    booking({
      id: 's3',
      startsAt: '2026-09-22T10:00:00',
      serviceId: 'svc1',
      staffId: 'st2',
      status: 'scheduled',
    }),
    booking({
      id: 's4',
      startsAt: '2026-09-22T11:00:00',
      serviceId: 'svc1',
      staffId: 'st1',
      status: 'scheduled',
    }),
  ];
  const index = buildSlotOccupancyIndex(slotBookings);
  assert.equal(index.get('svc1|st1|2026-09-22T10:00:00'), 2);
  assert.equal(index.get('svc1|st2|2026-09-22T10:00:00'), 1);

  const service: ServiceOffering = {
    id: 'svc1',
    name: '그룹',
    durationMinutes: 60,
    maxCapacity: 4,
    isActive: true,
  } as ServiceOffering;

  const withIndex = getSlotCapacityInfo({
    service,
    staffId: 'st1',
    startsAt: '2026-09-22T10:00:00',
    bookings: slotBookings,
    occupancyIndex: index,
  });
  const withoutIndex = getSlotCapacityInfo({
    service,
    staffId: 'st1',
    startsAt: '2026-09-22T10:00:00',
    bookings: slotBookings,
  });
  assert.equal(withIndex.occupied, 2);
  assert.equal(withIndex.occupied, withoutIndex.occupied);
  assert.equal(withIndex.remaining, 2);

  console.log('bookingQuery tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
