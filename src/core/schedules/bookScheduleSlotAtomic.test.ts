/**
 * 동시성 예약 행 잠금(FOR UPDATE) 원자 RPC 계약 및 에러 매핑 단위 테스트
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseBookingRpcError,
  type BookScheduleSlotParams,
} from './bookScheduleSlotAtomic';

console.log('Running bookScheduleSlotAtomic tests...');

const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(
  here,
  '../../../supabase/migrations/20261012130000_atomic_schedule_booking.sql'
);
const sql = readFileSync(sqlPath, 'utf8');

// 1. Migration SQL Contract Verification
{
  assert.match(
    sql,
    /CREATE OR REPLACE FUNCTION core\.book_schedule_slot/i,
    'core.book_schedule_slot RPC must be defined in migration'
  );
  assert.match(
    sql,
    /FOR UPDATE OF s/i,
    'Schedule slot must be locked with FOR UPDATE OF s to serialize concurrent bookings'
  );
  assert.match(
    sql,
    /v_schedule\.max_capacity/i,
    'Max capacity check must exist in RPC'
  );
  assert.match(
    sql,
    /CAPACITY_EXCEEDED/i,
    'CAPACITY_EXCEEDED exception must be raised when full'
  );
  assert.match(
    sql,
    /GRANT EXECUTE ON FUNCTION core\.book_schedule_slot/i,
    'RPC must grant execute permission'
  );
}

// 2. Error Parsing Contract Tests
{
  const capacityErr = parseBookingRpcError({ message: 'CAPACITY_EXCEEDED: 정원이 초과되었습니다.' });
  assert.match(capacityErr.message, /정원이 마감되어 예약할 수 없습니다/);

  const duplicateErr = parseBookingRpcError({ message: 'ALREADY_BOOKED: 중복 예약입니다.' });
  assert.match(duplicateErr.message, /이미 해당 일정에 예약 내역이 존재합니다/);

  const pastErr = parseBookingRpcError({ message: 'CANNOT_BOOK_PAST_SCHEDULE: 지난 일정입니다.' });
  assert.match(pastErr.message, /지난 일정은 예약할 수 없습니다/);

  const passErr = parseBookingRpcError({ message: 'NO_REMAINING_PASS_UNITS: 수강권 부족' });
  assert.match(passErr.message, /잔여 수강권 횟수가 부족합니다/);

  const genericErr = parseBookingRpcError({ message: 'DB_CONNECTION_TIMEOUT' });
  assert.equal(genericErr.message, 'DB_CONNECTION_TIMEOUT');
}

// 3. Logical Model of Slot Capacity & Pass Deduction
{
  interface SlotModel {
    maxCapacity: number;
    bookedCount: number;
    isBookable: boolean;
  }

  function simulateAtomicBooking(
    slot: SlotModel,
    passRemaining: number | null
  ): { ok: boolean; error?: string; remainingCapacity?: number } {
    if (!slot.isBookable) {
      return { ok: false, error: 'SCHEDULE_NOT_BOOKABLE' };
    }
    if (slot.bookedCount >= slot.maxCapacity) {
      return { ok: false, error: 'CAPACITY_EXCEEDED' };
    }
    if (passRemaining !== null && passRemaining <= 0) {
      return { ok: false, error: 'NO_REMAINING_PASS_UNITS' };
    }

    slot.bookedCount += 1;
    return {
      ok: true,
      remainingCapacity: slot.maxCapacity - slot.bookedCount,
    };
  }

  // Case A: 1자리 남았을 때 첫 번째 성공
  const slot: SlotModel = { maxCapacity: 4, bookedCount: 3, isBookable: true };
  const res1 = simulateAtomicBooking(slot, 5);
  assert.equal(res1.ok, true);
  assert.equal(res1.remainingCapacity, 0);

  // Case B: 동일 시점 두 번째 동시 요청 시 직렬화되어 실패(정원 마감)
  const res2 = simulateAtomicBooking(slot, 5);
  assert.equal(res2.ok, false);
  assert.equal(res2.error, 'CAPACITY_EXCEEDED');

  // Case C: 이용권 소진 시 차단
  const emptySlot: SlotModel = { maxCapacity: 10, bookedCount: 0, isBookable: true };
  const res3 = simulateAtomicBooking(emptySlot, 0);
  assert.equal(res3.ok, false);
  assert.equal(res3.error, 'NO_REMAINING_PASS_UNITS');
}

console.log('bookScheduleSlotAtomic tests passed successfully!');
