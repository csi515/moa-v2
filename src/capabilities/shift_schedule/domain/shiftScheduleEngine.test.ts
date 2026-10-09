import assert from 'node:assert/strict';
import {
  detectShiftSlotConflict,
  calculateShiftWage,
  type StaffShift,
} from './shiftScheduleEngine';

function run() {
  const shifts: StaffShift[] = [
    {
      id: 'sh-1',
      staffId: 'staff-1',
      startAt: '2026-06-01T09:00:00+09:00',
      endAt: '2026-06-01T15:00:00+09:00',
      breakMinutes: 30,
    },
    {
      id: 'sh-2',
      staffId: 'staff-2',
      startAt: '2026-06-01T15:00:00+09:00',
      endAt: '2026-06-01T21:00:00+09:00',
      breakMinutes: 30,
    },
  ];

  // 1. 동일 직원 근무 겹침 감지 (staff-1, 14:00~18:00 -> sh-1과 겹침)
  const conflict = detectShiftSlotConflict(shifts, {
    staffId: 'staff-1',
    startAt: '2026-06-01T14:00:00+09:00',
    endAt: '2026-06-01T18:00:00+09:00',
  });
  assert.equal(conflict.hasConflict, true);
  assert.deepEqual(conflict.conflictingShiftIds, ['sh-1']);

  // 2. 다른 직원 시프트와는 겹쳐도 충돌 아님 (동시 근무 가능)
  const diffStaff = detectShiftSlotConflict(shifts, {
    staffId: 'staff-3',
    startAt: '2026-06-01T09:00:00+09:00',
    endAt: '2026-06-01T15:00:00+09:00',
  });
  assert.equal(diffStaff.hasConflict, false);

  // 3. 주간 실근무 시급 계산 (09:00 ~ 13:00 = 4시간(240분), 휴게 30분 -> 210분, 시급 10,000원)
  // 210분 = 3.5시간 -> 35,000원
  const dayWage = calculateShiftWage({
    clockIn: '2026-06-01T09:00:00',
    clockOut: '2026-06-01T13:00:00',
    breakMinutes: 30,
    hourlyRate: 10000,
  });
  assert.equal(dayWage.actualWorkMinutes, 210);
  assert.equal(dayWage.nightMinutes, 0);
  assert.equal(dayWage.totalPay, 35000);

  // 4. 야간 근무 가산 시급 계산 (21:00 ~ 24:00 = 3시간, 휴게 0분, 시급 10,000원)
  // 21~22: 주간 1시간 (10,000원)
  // 22~24: 야간 2시간 (기본 20,000 + 가산 50% 10,000원 = 30,000원)
  // 총: 40,000원
  const nightWage = calculateShiftWage({
    clockIn: '2026-06-01T21:00:00',
    clockOut: '2026-06-02T00:00:00',
    breakMinutes: 0,
    hourlyRate: 10000,
    nightRateMultiplier: 1.5,
  });
  assert.equal(nightWage.actualWorkMinutes, 180);
  assert.equal(nightWage.regularMinutes, 60);
  assert.equal(nightWage.nightMinutes, 120);
  assert.equal(nightWage.regularPay, 30000);
  assert.equal(nightWage.nightBonusPay, 10000);
  assert.equal(nightWage.totalPay, 40000);

  console.log('shiftScheduleEngine.test.ts: ok');
}

run();
