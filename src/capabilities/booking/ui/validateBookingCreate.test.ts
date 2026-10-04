/**
 * validateBookingCreate unit test
 * 실행: npm run test:pilates-booking-validate
 */
import assert from 'node:assert/strict';
import type { Booking, ServiceOffering } from '@/core/types/schedule';
import {
  validateBookingCreate,
  validatePilatesCreateRules,
  validateSkinCreateRules,
} from './validateBookingCreate';

const service: ServiceOffering = {
  id: 'svc1',
  name: '그룹',
  durationMinutes: 50,
  maxCapacity: 2,
  price: 0,
  isActive: true,
  isSchedulable: true,
  category: 'group',
};

const labels = { customer: '회원', staff: '강사', service: '수업' };

{
  const r = validateBookingCreate({
    skin: false,
    form: {
      memberId: '',
      serviceId: '',
      staffId: '',
      date: '2026-09-22',
      time: '10:00',
      roomId: '',
      slotCapacity: '2',
      skinCondition: '',
      chartNote: '',
    },
    members: [],
    services: [service],
    instructors: [{ id: 't1', name: '김강사' }],
    treatmentRooms: [],
    bookings: [],
    recruitments: [],
    remainingSessions: () => 5,
    labels,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.message, /선택/);
}

{
  const pilates = validatePilatesCreateRules({
    member: { id: 'm1', name: '홍길동' },
    service,
    instructor: { id: 't1', name: '김강사' },
    startsAt: '2026-09-22T10:00:00',
    endsAt: '2026-09-22T10:50:00.000Z',
    bookings: [],
    remainingSessions: 0,
    staffLabel: '강사',
  });
  assert.equal(pilates.ok, false);
  if (!pilates.ok) assert.match(pilates.message, /이용권/);
}

{
  const booking: Booking = {
    id: 'b1',
    customerId: 'm1',
    customerName: '홍길동',
    staffId: 't1',
    staffName: '김강사',
    serviceId: 'svc1',
    serviceName: '그룹',
    startsAt: '2026-09-22T10:00:00',
    endsAt: '2026-09-22T10:50:00',
    status: 'scheduled',
  } as Booking;
  const pilates = validatePilatesCreateRules({
    member: { id: 'm1', name: '홍길동' },
    service,
    instructor: { id: 't1', name: '김강사' },
    startsAt: '2026-09-22T10:00:00',
    endsAt: '2026-09-22T10:50:00.000Z',
    bookings: [booking],
    remainingSessions: 3,
    staffLabel: '강사',
  });
  assert.equal(pilates.ok, false);
  if (!pilates.ok) assert.match(pilates.message, /이미 등록/);
}

{
  const ok = validatePilatesCreateRules({
    member: { id: 'm2', name: '신규' },
    service,
    instructor: { id: 't1', name: '김강사' },
    startsAt: '2026-09-22T10:00:00',
    endsAt: '2026-09-22T10:50:00.000Z',
    bookings: [],
    remainingSessions: 2,
    staffLabel: '강사',
  });
  assert.equal(ok.ok, true);
}

{
  const hours = validateSkinCreateRules({
    instructor: { id: 't1', name: '관리사' },
    startsAt: '2026-09-24T19:00:00',
    endsAt: '2026-09-24T20:00:00',
    bookings: [],
    staffHours: [{ staffId: 't1', days: ['목'], startTime: '10:00', endTime: '18:00' }],
    selectedRoom: undefined,
    staffLabel: '관리사',
  });
  assert.equal(hours.ok, false);
  if (!hours.ok) assert.match(hours.message, /근무시간/);
}

{
  const skin = validateSkinCreateRules({
    instructor: { id: 't1', name: '관리사' },
    startsAt: '2026-09-22T10:00:00',
    endsAt: '2026-09-22T10:50:00',
    bookings: [
      {
        id: 'b1',
        customerId: 'c1',
        customerName: 'A',
        staffId: 't1',
        staffName: '관리사',
        serviceId: 's1',
        serviceName: '시술',
        startsAt: '2026-09-22T10:00:00',
        endsAt: '2026-09-22T10:50:00',
        status: 'scheduled',
      } as Booking,
    ],
    selectedRoom: undefined,
    staffLabel: '관리사',
  });
  assert.equal(skin.ok, false);
  if (!skin.ok) assert.match(skin.message, /이미 예약/);
}

{
  const r = validateBookingCreate({
    skin: false,
    form: {
      memberId: 'm1',
      serviceId: 'svc1',
      staffId: 't1',
      date: '2026-09-22',
      time: '10:00',
      roomId: '',
      slotCapacity: '5',
      skinCondition: '',
      chartNote: '',
    },
    members: [{ id: 'm1', name: '홍길동' }],
    services: [service],
    instructors: [{ id: 't1', name: '김강사' }],
    treatmentRooms: [],
    bookings: [],
    recruitments: [],
    remainingSessions: () => 5,
    labels,
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.pendingSlotCapacity, 5);
    assert.equal(r.payload.customerId, 'm1');
    assert.equal(r.payload.startsAt, '2026-09-22T10:00:00');
  }
}

console.log('validateBookingCreate.test.ts: ok');
