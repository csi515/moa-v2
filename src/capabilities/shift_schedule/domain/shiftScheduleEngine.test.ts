import assert from 'node:assert/strict';
import {
  detectShiftSlotConflict,
  calculateShiftWage,
  calculateWeeklyWorkMinutes,
  validateWeekly52HourLimit,
  generateShiftCycleForMonth,
  verifyProximityWorkplaceAuth,
  type StaffShift,
  type ShiftTemplate,
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

  // 5. 주 52시간 한도 초과 방지 인터락 검증
  const weeklyShifts: StaffShift[] = [
    // 5일간 매일 9시간(휴게 제외 8시간) = 40시간(2,400분)
    { id: 'w1', staffId: 'st-52', startAt: '2026-06-01T09:00:00Z', endAt: '2026-06-01T18:00:00Z', breakMinutes: 60 },
    { id: 'w2', staffId: 'st-52', startAt: '2026-06-02T09:00:00Z', endAt: '2026-06-02T18:00:00Z', breakMinutes: 60 },
    { id: 'w3', staffId: 'st-52', startAt: '2026-06-03T09:00:00Z', endAt: '2026-06-03T18:00:00Z', breakMinutes: 60 },
    { id: 'w4', staffId: 'st-52', startAt: '2026-06-04T09:00:00Z', endAt: '2026-06-04T18:00:00Z', breakMinutes: 60 },
    { id: 'w5', staffId: 'st-52', startAt: '2026-06-05T09:00:00Z', endAt: '2026-06-05T18:00:00Z', breakMinutes: 60 },
  ];

  const currentSummary = calculateWeeklyWorkMinutes(weeklyShifts, 'st-52', '2026-06-01');
  assert.equal(currentSummary.totalWorkHours, 40);
  assert.equal(currentSummary.isOver52Hours, false);
  assert.equal(currentSummary.remainingMinutesTo52h, 720); // 12시간 남음

  // 10시간 추가 시프트 -> 총 50시간 (연장근로 경고이나 허용)
  const check1 = validateWeekly52HourLimit({
    currentWeeklyMinutes: currentSummary.totalWorkMinutes,
    additionalShiftMinutes: 600,
  });
  assert.equal(check1.allowed, true);
  assert.equal(check1.alertLevel, 'WARNING_OVERTIME');

  // 15시간 추가 시프트 -> 총 55시간 (주 52시간 한도 초과로 차단)
  const check2 = validateWeekly52HourLimit({
    currentWeeklyMinutes: currentSummary.totalWorkMinutes,
    additionalShiftMinutes: 900,
  });
  assert.equal(check2.allowed, false);
  assert.equal(check2.alertLevel, 'BLOCKED_52H');

  // 특별 승인 옵션 활성화 시 허용
  const check3 = validateWeekly52HourLimit({
    currentWeeklyMinutes: currentSummary.totalWorkMinutes,
    additionalShiftMinutes: 900,
    allowSpecialApproval: true,
  });
  assert.equal(check3.allowed, true);
  assert.equal(check3.alertLevel, 'SPECIAL_APPROVED');

  // 6. 교대조(3교대) 순환 템플릿 1개월 스케줄 생성 검증
  const templates: ShiftTemplate[] = [
    { id: 't-day', name: '주간', startTime: '08:00', endTime: '17:00', breakMinutes: 60 },
    { id: 't-night', name: '야간', startTime: '17:00', endTime: '02:00', breakMinutes: 60 },
    { id: 't-off', name: '휴무', startTime: '00:00', endTime: '00:00', breakMinutes: 0, isOffDay: true },
  ];
  const cycleSlots = generateShiftCycleForMonth({
    year: 2026,
    month: 6, // 6월 30일
    staffIds: ['st-1', 'st-2'],
    templates,
    cyclePattern: ['t-day', 't-night', 't-off'],
  });
  // 30일 중 1/3은 offDay이므로 각 직원당 20근무일 * 2명 = 40개 슬롯 생성
  assert.equal(cycleSlots.length, 40);
  assert.equal(cycleSlots[0].staffId, 'st-1');
  assert.equal(cycleSlots[0].templateId, 't-day');

  // 7. GPS / Wi-Fi 인증 근태 타임카드 연계 검증
  // Wi-Fi 일치 인증
  const wifiAuth = verifyProximityWorkplaceAuth({
    employeeWifiSsid: 'MOA_STORE_5G',
    workplaceWifiSsid: 'MOA_STORE_5G',
  });
  assert.equal(wifiAuth.isAuthenticated, true);
  assert.equal(wifiAuth.method, 'WIFI');

  // GPS 반경 50m 이내 인증 (서울 강남역 기준 동일 위치)
  const gpsAuthValid = verifyProximityWorkplaceAuth({
    employeeCoordinates: { latitude: 37.497942, longitude: 127.027621 },
    workplaceCoordinates: { latitude: 37.497950, longitude: 127.027630, maxAllowedRadiusMeters: 50 },
  });
  assert.equal(gpsAuthValid.isAuthenticated, true);
  assert.equal(gpsAuthValid.method, 'GPS');
  assert.ok(gpsAuthValid.distanceMeters! <= 10);

  // GPS 반경 벗어남 (1km 거리)
  const gpsAuthInvalid = verifyProximityWorkplaceAuth({
    employeeCoordinates: { latitude: 37.505000, longitude: 127.027621 },
    workplaceCoordinates: { latitude: 37.497950, longitude: 127.027630, maxAllowedRadiusMeters: 50 },
  });
  assert.equal(gpsAuthInvalid.isAuthenticated, false);
  assert.equal(gpsAuthInvalid.method, 'NONE');

  console.log('shiftScheduleEngine.test.ts: ok (with 52h Limit, Templates & Proximity Auth)');
}

run();
