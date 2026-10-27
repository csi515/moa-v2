import assert from 'node:assert/strict';
import {
  calculateGpsDistanceMeters,
  verifyAttendanceCheckIn,
  calculateDailyTimecardHours,
  calculateWeeklyHolidayHours,
  calculateStatutoryPay,
  calculateInsuranceDeductions,
  generatePayrollSlip,
  checkQualificationExpiry,
  filterExpiringQualifications,
  evaluateTrainingEffectiveness,
  calculateTrainingMetrics,
  generateBankBulkTransferCsv,
  generateTaxAccountantPayrollLedgerCsv,
  type StaffEmploymentProfile,
} from './workAttendancePayrollEngine';

console.log('--- Testing workAttendancePayrollEngine ---');

// Test 1: GPS 거리 및 반경 인증
{
  const store = { latitude: 37.4979, longitude: 127.0276 }; // 강남역 부근
  const insideStaff = { latitude: 37.4980, longitude: 127.0277 }; // 약 14미터 거리
  const outsideStaff = { latitude: 37.5050, longitude: 127.0350 }; // 약 1km 거리

  const distInside = calculateGpsDistanceMeters(store, insideStaff);
  assert.ok(distInside <= 30, `매장 내부 거리는 30m 이내여야 함 (실측: ${distInside}m)`);

  const authSuccess = verifyAttendanceCheckIn({
    storeLocation: store,
    staffLocation: insideStaff,
    maxRadiusMeters: 50,
  });
  assert.equal(authSuccess.isAuthenticated, true);
  assert.equal(authSuccess.method, 'gps');

  const authFail = verifyAttendanceCheckIn({
    storeLocation: store,
    staffLocation: outsideStaff,
    maxRadiusMeters: 50,
  });
  assert.equal(authFail.isAuthenticated, false);
  assert.ok(authFail.failureReason?.includes('매장 반경(50m)을 벗어났습니다'));

  console.log('✅ Test 1 passed: GPS distance calculation and geofence auth');
}

// Test 2: Wi-Fi BSSID 인증
{
  const authWifi = verifyAttendanceCheckIn({
    storeWifiBssid: 'AA:BB:CC:DD:EE:FF',
    staffWifiBssid: 'aa:bb:cc:dd:ee:ff', // 대소문자 무관
  });
  assert.equal(authWifi.isAuthenticated, true);
  assert.equal(authWifi.method, 'wifi');
  console.log('✅ Test 2 passed: Store Wi-Fi BSSID matching auth');
}

// Test 3: 일일 근로시간, 연장시간(>8h), 야간시간(22~06) 계산
{
  // 13:00 ~ 23:00 (총 10시간 근무, 휴게 60분 -> 실근로 9시간)
  // 기본근로 8시간, 연장근로 1시간, 야간근로(22~23시) 1시간
  const timecard = calculateDailyTimecardHours(
    '2026-10-15T13:00:00',
    '2026-10-15T23:00:00',
    60
  );

  assert.equal(timecard.totalWorkedHours, 9.0);
  assert.equal(timecard.regularHours, 8.0);
  assert.equal(timecard.overtimeHours, 1.0);
  assert.equal(timecard.nightHours, 1.0);

  console.log('✅ Test 3 passed: Daily timecard worked hours, overtime, and night hours');
}

// Test 4: 근로기준법 주휴시간 계산 (주 15시간 미만 vs 이상)
{
  // 1주 14시간 (15시간 미만) -> 주휴수당 0시간
  assert.equal(calculateWeeklyHolidayHours(14), 0);

  // 1주 20시간 근무 -> (20 / 40) * 8 = 4시간 주휴시간
  assert.equal(calculateWeeklyHolidayHours(20), 4.0);

  // 1주 40시간 이상 근무 -> 최대 8시간 주휴시간
  assert.equal(calculateWeeklyHolidayHours(45), 8.0);

  console.log('✅ Test 4 passed: Statutory weekly holiday hours (<15h vs >=15h)');
}

// Test 5: 법정 급여명세서 및 4대보험 공제 계산
{
  const partTimeStaff: StaffEmploymentProfile = {
    staffId: 'STAFF-01',
    staffName: '김알바',
    employmentType: 'hourly_part_time',
    hourlyRate: 10000,
    contractWeeklyHours: 20,
    enrollSocialInsurance: true,
  };

  // 주당 20시간씩 4주 근무 = 총 80시간, 주휴시간 매주 4시간 * 4주 = 16시간
  // 연장 2시간, 야간 4시간
  const slip = generatePayrollSlip(
    partTimeStaff,
    '2026-10',
    [20, 20, 20, 20],
    2, // 연장 2시간
    4  // 야간 4시간
  );

  // 기본급: 80h * 10,000 = 800,000원
  assert.equal(slip.statutoryPay.regularPay, 800000);
  // 주휴수당: 16h * 10,000 = 160,000원
  assert.equal(slip.statutoryPay.weeklyHolidayPay, 160000);
  // 연장가산수당: 2h * 10,000 * 1.5 = 30,000원
  assert.equal(slip.statutoryPay.overtimePay, 30000);
  // 야간가산수당: 4h * 10,000 * 0.5 = 20,000원
  assert.equal(slip.statutoryPay.nightPay, 20000);
  // 세전 총급여: 800,000 + 160,000 + 30,000 + 20,000 = 1,010,000원
  assert.equal(slip.statutoryPay.totalGrossPay, 1010000);

  // 4대 보험 공제 검증
  assert.ok(slip.deductions.nationalPension > 0);
  assert.ok(slip.deductions.healthInsurance > 0);
  assert.ok(slip.deductions.employmentInsurance > 0);
  assert.ok(slip.netPay < slip.statutoryPay.totalGrossPay);
  assert.equal(slip.netPay, slip.statutoryPay.totalGrossPay - slip.deductions.totalDeductions);

  console.log('✅ Test 5 passed: Full payroll slip generation with statutory allowances and deductions');
}

// Test 6: [ISO 9001 7.2 & ISO 30422] 직무 자격/자격증 만료 D-Day 계산 및 만료 임박 필터링
{
  const refDate = '2026-10-17';
  const qualExpired = {
    id: 'Q-01',
    staffId: 'STAFF-01',
    staffName: '홍길동',
    qualificationName: '전기안전관리자',
    issuingAuthority: '한국전기기술인협회',
    issueDate: '2023-10-01',
    expiryDate: '2026-10-10', // 7일 전 만료
    verificationStatus: 'verified' as const,
  };

  const qualExpiringSoon = {
    id: 'Q-02',
    staffId: 'STAFF-02',
    staffName: '김철수',
    qualificationName: '위생사',
    issuingAuthority: '보건복지부',
    issueDate: '2024-11-01',
    expiryDate: '2026-11-05', // 19일 후 만료
    verificationStatus: 'verified' as const,
  };

  const qualValid = {
    id: 'Q-03',
    staffId: 'STAFF-03',
    staffName: '이영희',
    qualificationName: '소방안전관리자',
    issuingAuthority: '한국소방안전원',
    issueDate: '2025-01-01',
    expiryDate: '2027-01-01', // 1년 이상 남음
    verificationStatus: 'verified' as const,
  };

  const resExpired = checkQualificationExpiry(qualExpired, refDate);
  assert.equal(resExpired.status, 'expired');
  assert.equal(resExpired.urgency, 'critical');
  assert.ok(resExpired.daysRemaining <= 0);

  const resExpiring = checkQualificationExpiry(qualExpiringSoon, refDate);
  assert.equal(resExpiring.status, 'expiring_soon');
  assert.equal(resExpiring.urgency, 'warning');
  assert.ok(resExpiring.daysRemaining > 0 && resExpiring.daysRemaining <= 30);

  const resValid = checkQualificationExpiry(qualValid, refDate);
  assert.equal(resValid.status, 'valid');
  assert.equal(resValid.urgency, 'none');

  const filtered = filterExpiringQualifications([qualExpired, qualExpiringSoon, qualValid], 30, refDate);
  assert.equal(filtered.length, 2, '만료되었거나 30일 이내 임박한 자격증 2건 추출');
  assert.equal(filtered[0].id, 'Q-01');
  assert.equal(filtered[1].id, 'Q-02');

  console.log('✅ Test 6 passed: Competence register expiry check and filtering');
}

// Test 7: [ISO 9001 7.2 & ISO 30414] 교육훈련 계획/이력 및 유효성 평가
{
  const session = {
    id: 'TR-2026-01',
    organizationId: 'ORG-01',
    title: '2026 Q3 현장 위험성평가 및 화학물질 안전보건 특별교육',
    trainingType: 'safety_health' as const,
    plannedDate: '2026-10-15',
    targetStaffIds: ['S-1', 'S-2', 'S-3', 'S-4'],
    attendedStaffIds: ['S-1', 'S-2', 'S-3'], // 3명 참석
    trainerName: '박안전 수석',
    durationHours: 2.0,
    trainingStatus: 'in_progress' as const,
  };

  // 1) 75점으로 유효성 평가 완료
  const evaluated = evaluateTrainingEffectiveness(session, {
    evaluatorStaffId: 'MGR-01',
    score: 85,
    feedbackComment: '작업표준 이해도 및 보호구 착용 실습 우수',
    signatureDataUrl: 'data:image/svg+xml;base64,mockSign',
  });

  assert.equal(evaluated.trainingStatus, 'completed');
  assert.ok(evaluated.effectivenessEvaluation);
  assert.equal(evaluated.effectivenessEvaluation.result, 'effective');
  assert.equal(evaluated.effectivenessEvaluation.criteriaMet, true);

  // 2) 전사 교육훈련 집계 지표
  const session2 = {
    id: 'TR-2026-02',
    organizationId: 'ORG-01',
    title: '신규자 OJT 직무 기초',
    trainingType: 'ojt' as const,
    plannedDate: '2026-10-10',
    completedDate: '2026-10-10',
    targetStaffIds: ['S-4'],
    attendedStaffIds: ['S-4'],
    trainerName: '김팀장',
    durationHours: 4.0,
    trainingStatus: 'completed' as const,
    effectivenessEvaluation: {
      evaluatorStaffId: 'MGR-01',
      evaluatedAt: '2026-10-10T17:00:00Z',
      score: 55, // 70점 미만 -> 재교육 필요
      result: 'retraining_required' as const,
      criteriaMet: false,
    },
  };

  const metrics = calculateTrainingMetrics([evaluated, session2], 10);
  assert.equal(metrics.totalPlannedSessions, 2);
  assert.equal(metrics.completedSessions, 2);
  assert.equal(metrics.completionRatePercent, 100);
  // 총 이수시간: (3명 * 2h) + (1명 * 4h) = 10 Man-Hours
  assert.equal(metrics.totalTrainedHours, 10);
  // 10명 기준 1인당 평균 1.0시간
  assert.equal(metrics.averageHoursPerStaff, 1.0);
  assert.equal(metrics.effectiveCount, 1);
  assert.equal(metrics.effectivenessRatePercent, 50);

  console.log('✅ Test 7 passed: Training effectiveness evaluation and metrics aggregation');
}

// Test 8: 식대 및 자가운전보조금 비과세 소득 공제 및 세전/과세표준 절감 검증
{
  const profile: StaffEmploymentProfile = {
    staffId: 'STAFF-100',
    staffName: '홍길동',
    employmentType: 'salaried_regular',
    hourlyRate: 15000,
    baseSalaryMonthly: 3000000, // 300만원
    contractWeeklyHours: 40,
    enrollSocialInsurance: true,
  };

  // 비과세 적용 전
  const slipNoAllowance = generatePayrollSlip(profile, '2026-10', [40, 40, 40, 40], 0, 0);
  assert.equal(slipNoAllowance.statutoryPay.totalGrossPay, 3000000);
  assert.equal(slipNoAllowance.deductions.nationalPension, Math.round(3000000 * 0.045)); // 135,000

  // 식대 25만원(한도 20만원), 자가운전 20만원(한도 20만원) 신청
  const slipWithAllowance = generatePayrollSlip(
    profile,
    '2026-10',
    [40, 40, 40, 40],
    0,
    0,
    { mealAllowance: 250000, drivingAllowance: 200000, researchAllowance: 200000 }
  );

  assert.equal(slipWithAllowance.nonTaxable?.mealAllowance, 200000, '식대 한도는 20만원으로 제한');
  assert.equal(slipWithAllowance.nonTaxable?.drivingAllowance, 200000, '자가운전 한도는 20만원으로 제한');
  assert.equal(slipWithAllowance.nonTaxable?.researchAllowance, 200000, '연구보조비 한도는 20만원으로 제한');
  assert.equal(slipWithAllowance.nonTaxable?.totalNonTaxable, 600000, '총 비과세 60만원');
  assert.equal(slipWithAllowance.taxableGrossPay, 2400000, '과세 대상 급여는 300만 - 60만 = 240만원');

  // 국민연금: 240만원 * 4.5% = 108,000원
  assert.equal(slipWithAllowance.deductions.nationalPension, Math.round(2400000 * 0.045));
  assert.ok(slipWithAllowance.netPay > slipNoAllowance.netPay, '비과세 적용 시 실수령액이 증가해야 함');

  console.log('✅ Test 8 passed: Non-taxable allowance limits and taxable wage deductions');
}

// Test 9: 시중은행 대량이체 CSV 및 세무사 제출용 급여대장 CSV 원장 생성
{
  const sampleEntries = [
    {
      staffId: 'STAFF-1',
      staffName: '김철수',
      bankName: '국민은행',
      accountNumber: '123-456-789012',
      amount: 2750000,
      memo: '10월급여',
    },
    {
      staffId: 'STAFF-2',
      staffName: '이영희',
      bankName: '신한은행',
      accountNumber: '987-654-321098',
      amount: 3120000,
      memo: '10월급여',
    },
    {
      staffId: 'STAFF-3',
      staffName: '박농협',
      bankName: '농협은행',
      accountNumber: '302-1234-5678-01',
      amount: 2500000,
      memo: '10월급여',
    },
  ];

  // KB 양식
  const kbCsv = generateBankBulkTransferCsv(sampleEntries, 'KB');
  assert.ok(kbCsv.includes('입금은행,입금계좌번호,예금주성명,이체금액(원)'));
  assert.ok(kbCsv.includes('"국민은행"'));
  assert.ok(kbCsv.includes('2750000'));

  // 신한 양식
  const shinhanCsv = generateBankBulkTransferCsv(sampleEntries, 'SHINHAN');
  assert.ok(shinhanCsv.includes('입금은행명,계좌번호,이체금액,수취인성명'));

  // 농협 양식
  const nhCsv = generateBankBulkTransferCsv(sampleEntries, 'NH');
  assert.ok(nhCsv.includes('입금은행,입금계좌번호,이체금액(원),예금주성명,입금통장메모,출금통장메모'));
  assert.ok(nhCsv.includes('"농협은행"'));
  assert.ok(nhCsv.includes('2500000'));

  // 세무사 제출용 전사 급여대장 CSV 원장
  const profile: StaffEmploymentProfile = {
    staffId: 'STAFF-1',
    staffName: '김철수',
    employmentType: 'salaried_regular',
    hourlyRate: 15000,
    baseSalaryMonthly: 3000000,
    contractWeeklyHours: 40,
    enrollSocialInsurance: true,
  };
  const slip = generatePayrollSlip(profile, '2026-10', [40, 40, 40, 40], 0, 0, { mealAllowance: 200000 });
  const taxLedgerCsv = generateTaxAccountantPayrollLedgerCsv([slip], {
    organizationName: '테스트연구소',
    periodYearMonth: '2026-10',
  });

  assert.ok(taxLedgerCsv.includes('전사 월별 법정 급여대장 (세무사/회계법인 제출용)'));
  assert.ok(taxLedgerCsv.includes('식대(비과세)'));
  assert.ok(taxLedgerCsv.includes('비과세총액'));
  assert.ok(taxLedgerCsv.includes('과세대상급여'));
  assert.ok(taxLedgerCsv.includes('"김철수"'));

  console.log('✅ Test 9 passed: Bank bulk transfer CSV and tax accountant payroll ledger CSV');
}

console.log('🎉 All workAttendancePayrollEngine tests passed successfully!');

