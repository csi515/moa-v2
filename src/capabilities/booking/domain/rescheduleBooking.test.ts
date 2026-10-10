/**
 * rescheduleBooking unit test
 * 실행: npx tsx src/capabilities/booking/domain/rescheduleBooking.test.ts
 */
import assert from 'node:assert/strict';

function installMemoryLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      setItem(key: string, value: string) {
        store.set(key, String(value));
      },
      removeItem(key: string) {
        store.delete(key);
      },
      clear() {
        store.clear();
      },
      key(index: number) {
        return [...store.keys()][index] ?? null;
      },
      get length() {
        return store.size;
      },
    },
    configurable: true,
    writable: true,
  });
  return store;
}

installMemoryLocalStorage();

const { StorageService } = await import('@/services/storage');
const { rescheduleBooking } = await import('./rescheduleBooking');
import type { Booking } from '@/core/types/schedule';

function setupTestData() {
  // 스태프 근무시간 설정
  const currentSettings = StorageService.getSettings();
  StorageService.saveSettings({
    ...currentSettings,
    staffHours: [
      {
        staffId: 'staff-1',
        days: ['월', '화'],
        startTime: '09:00',
        endTime: '18:00',
      },
    ],
  });

  // 예약 데이터 준비
  const b1: Booking = {
    id: 'b-1',
    customerId: 'cust-1',
    customerName: '홍길동',
    serviceId: 'svc-1',
    serviceName: '1:1 필라테스',
    staffId: 'staff-1',
    staffName: '김강사',
    roomId: 'room-1',
    roomName: 'A룸',
    startsAt: '2026-10-12T10:00:00', // 2026-10-12는 월요일
    endsAt: '2026-10-12T11:00:00',
    status: 'scheduled',
    requestedBy: 'staff',
  };

  const b2: Booking = {
    id: 'b-2',
    customerId: 'cust-2',
    customerName: '이영희',
    serviceId: 'svc-1',
    serviceName: '1:1 필라테스',
    staffId: 'staff-1',
    staffName: '김강사',
    roomId: 'room-2',
    roomName: 'B룸',
    startsAt: '2026-10-12T14:00:00',
    endsAt: '2026-10-12T15:00:00',
    status: 'scheduled',
    requestedBy: 'staff',
  };

  const b3Completed: Booking = {
    id: 'b-3',
    customerId: 'cust-3',
    customerName: '박철수',
    serviceId: 'svc-1',
    serviceName: '1:1 필라테스',
    staffId: 'staff-2',
    staffName: '박강사',
    startsAt: '2026-10-12T10:00:00',
    endsAt: '2026-10-12T11:00:00',
    status: 'completed',
    requestedBy: 'staff',
  };

  StorageService.saveBooking(b1);
  StorageService.saveBooking(b2);
  StorageService.saveBooking(b3Completed);
}

// 1. 정상 이동 테스트
{
  setupTestData();
  const res = rescheduleBooking({
    bookingId: 'b-1',
    startsAt: '2026-10-12T11:00:00',
    endsAt: '2026-10-12T12:00:00',
    notify: false,
  });

  assert.equal(res.ok, true);
  assert.equal(res.booking?.startsAt, '2026-10-12T11:00:00');
  assert.equal(res.booking?.endsAt, '2026-10-12T12:00:00');
}

// 2. 이미 완료된 예약 이동 시도 시 차단 테스트
{
  setupTestData();
  const res = rescheduleBooking({
    bookingId: 'b-3',
    startsAt: '2026-10-12T13:00:00',
    endsAt: '2026-10-12T14:00:00',
    notify: false,
  });

  assert.equal(res.ok, false);
  assert.equal(res.conflictType, 'inactive_status');
}

// 3. 스태프 중복 시간 충돌 시 차단 테스트
{
  setupTestData();
  // b-1을 b-2 시간(14:00~15:00)으로 이동 시도 (둘 다 staff-1)
  const res = rescheduleBooking({
    bookingId: 'b-1',
    startsAt: '2026-10-12T14:00:00',
    endsAt: '2026-10-12T15:00:00',
    notify: false,
  });

  assert.equal(res.ok, false);
  assert.equal(res.conflictType, 'staff_conflict');
}

// 4. 룸 자원 중복 충돌 시 차단 테스트
{
  setupTestData();
  // b-2의 룸을 room-1으로 변경하되, b-1 시간(10:00~11:00)과 겹치게 이동 시도
  const res = rescheduleBooking({
    bookingId: 'b-2',
    startsAt: '2026-10-12T10:30:00',
    endsAt: '2026-10-12T11:30:00',
    roomId: 'room-1',
    roomName: 'A룸',
    staffId: 'staff-3', // 스태프는 다르게 지정
    notify: false,
  });

  assert.equal(res.ok, false);
  assert.equal(res.conflictType, 'room_conflict');
}

// 5. 스태프 근무시간 외 시간대로 이동 시 차단 테스트
{
  setupTestData();
  // staff-1 근무시간: 09:00 ~ 18:00. 20:00로 이동 시도
  const res = rescheduleBooking({
    bookingId: 'b-1',
    startsAt: '2026-10-12T20:00:00',
    endsAt: '2026-10-12T21:00:00',
    notify: false,
  });

  assert.equal(res.ok, false);
  assert.equal(res.conflictType, 'staff_hours');
}

console.log('rescheduleBooking.test.ts: all tests passed!');
