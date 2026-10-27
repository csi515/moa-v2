import assert from 'node:assert';
import {
  evaluateTravelConflict,
  getDispatchOrderTimeRange,
  DispatchOrderInput,
} from './dispatchEngine';

// Test 1: getDispatchOrderTimeRange calculates end times correctly
{
  const order: DispatchOrderInput = {
    service_name: '에어컨 청소',
    service_address: '서울시 강남구 테헤란로 123',
    scheduled_at: '2026-10-19T10:00:00Z',
    estimated_duration_min: 60,
    travel_buffer_min: 30,
  };
  const { startTime, workEndTime, bufferEndTime } = getDispatchOrderTimeRange(order);
  assert.strictEqual(startTime.toISOString(), '2026-10-19T10:00:00.000Z');
  assert.strictEqual(workEndTime.toISOString(), '2026-10-19T11:00:00.000Z');
  assert.strictEqual(bufferEndTime.toISOString(), '2026-10-19T11:30:00.000Z');
}

// Test 2: Conflict detected when new order starts during travel buffer of existing order
{
  const existingOrders: DispatchOrderInput[] = [
    {
      id: 'ord-1',
      staff_id: 'staff-a',
      service_name: '홈PT',
      service_address: '서울 강남구 역삼동',
      scheduled_at: '2026-10-19T14:00:00Z',
      estimated_duration_min: 60, // ends at 15:00
      travel_buffer_min: 30, // buffer until 15:30
      status: 'ASSIGNED',
    },
  ];

  // Starts at 15:15 (during buffer of ord-1) -> Conflict!
  const conflictingOrder: DispatchOrderInput = {
    staff_id: 'staff-a',
    service_name: '홈PT 2회차',
    service_address: '서울 서초구 서초동',
    scheduled_at: '2026-10-19T15:15:00Z',
    estimated_duration_min: 60,
    travel_buffer_min: 30,
    status: 'BOOKED',
  };
  assert.strictEqual(evaluateTravelConflict(existingOrders, conflictingOrder), true);

  // Starts at 15:30 (exactly when buffer ends) -> No conflict
  const okOrder: DispatchOrderInput = {
    staff_id: 'staff-a',
    service_name: '홈PT 3회차',
    service_address: '서울 서초구 방배동',
    scheduled_at: '2026-10-19T15:30:00Z',
    estimated_duration_min: 60,
    travel_buffer_min: 30,
    status: 'BOOKED',
  };
  assert.strictEqual(evaluateTravelConflict(existingOrders, okOrder), false);
}

// Test 3: Different staff member -> No conflict
{
  const existingOrders: DispatchOrderInput[] = [
    {
      id: 'ord-1',
      staff_id: 'staff-a',
      service_name: '출장 세차',
      service_address: '서울 송파구 잠실동',
      scheduled_at: '2026-10-19T10:00:00Z',
      estimated_duration_min: 90,
      travel_buffer_min: 30,
      status: 'ASSIGNED',
    },
  ];

  const orderForDifferentStaff: DispatchOrderInput = {
    staff_id: 'staff-b',
    service_name: '출장 세차 2',
    service_address: '서울 강동구 천호동',
    scheduled_at: '2026-10-19T10:30:00Z',
    estimated_duration_min: 90,
    travel_buffer_min: 30,
    status: 'BOOKED',
  };
  assert.strictEqual(evaluateTravelConflict(existingOrders, orderForDifferentStaff), false);
}

// Test 4: Cancelled existing order is ignored -> No conflict
{
  const existingOrders: DispatchOrderInput[] = [
    {
      id: 'ord-cancelled',
      staff_id: 'staff-a',
      service_name: '세차 취소건',
      service_address: '서울 마포구 공덕동',
      scheduled_at: '2026-10-19T10:00:00Z',
      estimated_duration_min: 60,
      travel_buffer_min: 30,
      status: 'CANCELLED',
    },
  ];

  const newOrder: DispatchOrderInput = {
    staff_id: 'staff-a',
    service_name: '신규 예약',
    service_address: '서울 마포구 상암동',
    scheduled_at: '2026-10-19T10:15:00Z',
    estimated_duration_min: 60,
    travel_buffer_min: 30,
    status: 'BOOKED',
  };
  assert.strictEqual(evaluateTravelConflict(existingOrders, newOrder), false);
}

console.log('✅ field_dispatch dispatchEngine tests passed!');
