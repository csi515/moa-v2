/**
 * 직원 근태(Wi-Fi/GPS 인증) & 주휴수당·야간연장 가산·4대보험 법정 급여명세서 도메인 엔진 (Pure Functions)
 *
 * 적용 법령: 근로기준법 제48조(임금명세서 교부), 제55조(휴일/주휴수당), 제56조(연장·야간근로 가산)
 */

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface AttendanceAuthCheckResult {
  isAuthenticated: boolean;
  method: 'wifi' | 'gps' | 'manual';
  distanceMeters?: number;
  failureReason?: string;
}

export interface DailyTimecard {
  date: string; // YYYY-MM-DD
  clockInTime: string; // HH:mm:ss
  clockOutTime: string; // HH:mm:ss
  breakMinutes: number; // 법정 휴게시간 (분)
  regularHours: number; // 기본 근로 시간 (최대 8시간)
  overtimeHours: number; // 8시간 초과 연장 시간
  nightHours: number; // 22:00~06:00 야간 근로 시간
  totalWorkedHours: number; // 실근무 시간 (휴게 제외)
}

export interface StaffEmploymentProfile {
  staffId: string;
  staffName: string;
  employmentType: 'hourly_part_time' | 'salaried_regular'; // 시급제 알바 vs 정규직 월급제
  hourlyRate: number; // 통상 시급 (예: 10,500원)
  baseSalaryMonthly?: number; // 정규직 기본급
  contractWeeklyHours: number; // 주당 소정 근로시간 (예: 20시간)
  enrollSocialInsurance: boolean; // 4대 보험 적용 여부 (주 15시간 이상)
}

export interface StatutoryPaySummary {
  totalWorkedHours: number; // 총 실근로시간
  regularPay: number; // 기본급 (기본시간 * 시급)
  overtimeHours: number; // 총 연장근로 시간
  overtimePay: number; // 연장가산수당 (연장시간 * 시급 * 1.5)
  nightHours: number; // 총 야간근로 시간
  nightPay: number; // 야간가산수당 (야간시간 * 시급 * 0.5 추가)
  weeklyHolidayHours: number; // 주휴시간 합계
  weeklyHolidayPay: number; // 주휴수당
  totalGrossPay: number; // 세전 총급여
}

export interface InsuranceDeduction {
  nationalPension: number; // 국민연금 4.5%
  healthInsurance: number; // 건강보험 3.545%
  longTermCare: number; // 장기요양보험 (건보의 12.95%)
  employmentInsurance: number; // 고용보험 0.9%
  incomeTax: number; // 근로소득세 (간이)
  localIncomeTax: number; // 지방소득세 (소득세의 10%)
  totalDeductions: number; // 공제 총액
}

export interface NonTaxableAllowanceInput {
  mealAllowance?: number; // 식대 (월 최대 20만원 비과세 한도, 소득세법 제12조)
  drivingAllowance?: number; // 자가운전보조금 (월 최대 20만원 비과세 한도)
  researchAllowance?: number; // 연구보조비 (월 최대 20만원 비과세 한도, 소득세법 제12조 제3호)
}

export interface NonTaxableDeductionSummary {
  mealAllowance: number;
  drivingAllowance: number;
  researchAllowance: number;
  totalNonTaxable: number;
  taxableGrossPay: number;
}

export const NON_TAXABLE_LIMITS = {
  MEAL_MONTHLY_LIMIT: 200000,
  DRIVING_MONTHLY_LIMIT: 200000,
  RESEARCH_MONTHLY_LIMIT: 200000,
} as const;

export interface PayrollSlip {
  slipId: string;
  staffId: string;
  staffName: string;
  payrollPeriod: string; // YYYY-MM
  employmentType: 'hourly_part_time' | 'salaried_regular';
  hourlyRate: number;
  statutoryPay: StatutoryPaySummary;
  nonTaxable?: NonTaxableDeductionSummary;
  taxableGrossPay?: number;
  deductions: InsuranceDeduction;
  netPay: number; // 실수령액 (세전총액 - 공제총액)
  issuedAt: string; // 교부 일시
  bankName?: string;
  accountNumber?: string;
}

/**
 * 1. Haversine 공식을 이용한 GPS 좌표 간 거리(미터) 계산
 */
export function calculateGpsDistanceMeters(loc1: GeoLocation, loc2: GeoLocation): number {
  const R = 6371000; // 지구 반지름 (m)
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(loc2.latitude - loc1.latitude);
  const dLon = toRad(loc2.longitude - loc1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.latitude)) *
      Math.cos(toRad(loc2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * 2. 매장 Wi-Fi BSSID 또는 GPS 반경 기반 출퇴근 인증 판정
 */
export function verifyAttendanceCheckIn(input: {
  storeWifiBssid?: string;
  staffWifiBssid?: string;
  storeLocation?: GeoLocation;
  staffLocation?: GeoLocation;
  maxRadiusMeters?: number;
}): AttendanceAuthCheckResult {
  const { storeWifiBssid, staffWifiBssid, storeLocation, staffLocation, maxRadiusMeters = 50 } = input;

  // 1순위: 매장 Wi-Fi BSSID 일치 검증
  if (storeWifiBssid && staffWifiBssid) {
    if (storeWifiBssid.toLowerCase() === staffWifiBssid.toLowerCase()) {
      return {
        isAuthenticated: true,
        method: 'wifi',
      };
    }
  }

  // 2순위: GPS 지오펜싱 반경 검증
  if (storeLocation && staffLocation) {
    const distance = calculateGpsDistanceMeters(storeLocation, staffLocation);
    if (distance <= maxRadiusMeters) {
      return {
        isAuthenticated: true,
        method: 'gps',
        distanceMeters: distance,
      };
    } else {
      return {
        isAuthenticated: false,
        method: 'gps',
        distanceMeters: distance,
        failureReason: `매장 반경(${maxRadiusMeters}m)을 벗어났습니다. (현재 거리: ${distance}m)`,
      };
    }
  }

  return {
    isAuthenticated: false,
    method: 'manual',
    failureReason: '매장 Wi-Fi에 연결되어 있지 않거나 GPS 위치를 확인할 수 없습니다.',
  };
}

/**
 * 3. 일일 출퇴근 타임카드 근로시간, 연장시간(>8h), 야간시간(22~06) 계산
 */
export function calculateDailyTimecardHours(
  clockInIso: string,
  clockOutIso: string,
  breakMinutes: number = 0
): {
  totalWorkedHours: number;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
} {
  const inDate = new Date(clockInIso);
  const outDate = new Date(clockOutIso);

  const diffMs = Math.max(0, outDate.getTime() - inDate.getTime());
  const rawMinutes = Math.floor(diffMs / (1000 * 60));
  const workedMinutes = Math.max(0, rawMinutes - breakMinutes);
  const totalWorkedHours = Math.round((workedMinutes / 60) * 10) / 10;

  // 기본 8시간, 초과는 연장근로
  const regularHours = Math.min(8, totalWorkedHours);
  const overtimeHours = Math.round(Math.max(0, totalWorkedHours - 8) * 10) / 10;

  // 야간근로(22:00 ~ 06:00) 시간 계산
  let nightMinutes = 0;
  const cursor = new Date(inDate);

  // 15분 단위로 순회하며 야간 시간대 판정
  while (cursor < outDate) {
    const hour = cursor.getHours();
    if (hour >= 22 || hour < 6) {
      nightMinutes += 15;
    }
    cursor.setMinutes(cursor.getMinutes() + 15);
  }

  // 야간시간도 휴게 비율만큼 감액
  const nightHours = Math.round(Math.min(totalWorkedHours, nightMinutes / 60) * 10) / 10;

  return {
    totalWorkedHours,
    regularHours,
    overtimeHours,
    nightHours,
  };
}

/**
 * 4. 주간 근무시간에 따른 주휴시간 계산 (근로기준법 제55조)
 *  - 주 15시간 이상 근무 시: min(1, 주간시간 / 40) * 8시간
 *  - 주 15시간 미만(초단시간): 0시간
 */
export function calculateWeeklyHolidayHours(weeklyWorkedHours: number): number {
  if (weeklyWorkedHours < 15) {
    return 0;
  }
  const factor = Math.min(1, weeklyWorkedHours / 40);
  return Math.round(factor * 8 * 10) / 10;
}

/**
 * 5. 월간 근태 기록 및 통상시급 기준 법정 수당 총액 계산
 */
export function calculateStatutoryPay(
  profile: StaffEmploymentProfile,
  weeklyWorkedHoursList: number[], // 주차별 총 근무시간 (예: [20, 22, 18, 25])
  totalOvertimeHours: number,
  totalNightHours: number
): StatutoryPaySummary {
  const totalWorkedHours = weeklyWorkedHoursList.reduce((sum, h) => sum + h, 0);
  const rate = profile.hourlyRate;

  // 기본급: 시급제는 실근무시간 * 시급, 정규직은 고정 월급이 있으면 우선 적용
  const regularPay = profile.employmentType === 'salaried_regular' && profile.baseSalaryMonthly
    ? profile.baseSalaryMonthly
    : Math.round(totalWorkedHours * rate);

  // 연장가산수당 (1.5배)
  const overtimePay = Math.round(totalOvertimeHours * rate * 1.5);

  // 야간가산수당 (통상 0.5배 가산)
  const nightPay = Math.round(totalNightHours * rate * 0.5);

  // 주휴수당: 주차별 주휴시간 합계 * 시급 (시급제 알바 대상)
  let totalWeeklyHolidayHours = 0;
  if (profile.employmentType === 'hourly_part_time') {
    for (const weekHours of weeklyWorkedHoursList) {
      totalWeeklyHolidayHours += calculateWeeklyHolidayHours(weekHours);
    }
  }
  const weeklyHolidayPay = Math.round(totalWeeklyHolidayHours * rate);

  const totalGrossPay = regularPay + overtimePay + nightPay + weeklyHolidayPay;

  return {
    totalWorkedHours,
    regularPay,
    overtimeHours: totalOvertimeHours,
    overtimePay,
    nightHours: totalNightHours,
    nightPay,
    weeklyHolidayHours: totalWeeklyHolidayHours,
    weeklyHolidayPay,
    totalGrossPay,
  };
}

/**
 * 5-1. 식대 및 자가운전보조금 비과세 항목 소득 공제 계산
 * - 식대: 월 최대 20만원 한도 비과세 (소득세법 제12조)
 * - 자가운전보조금: 본인 명의 차량 업무 수행 시 월 최대 20만원 한도 비과세
 */
export function calculateNonTaxableDeductions(
  totalGrossPay: number,
  allowances?: NonTaxableAllowanceInput
): NonTaxableDeductionSummary {
  const rawMeal = allowances?.mealAllowance ?? 0;
  const rawDriving = allowances?.drivingAllowance ?? 0;
  const rawResearch = allowances?.researchAllowance ?? 0;

  const mealAllowance = Math.min(rawMeal, NON_TAXABLE_LIMITS.MEAL_MONTHLY_LIMIT);
  const drivingAllowance = Math.min(rawDriving, NON_TAXABLE_LIMITS.DRIVING_MONTHLY_LIMIT);
  const researchAllowance = Math.min(rawResearch, NON_TAXABLE_LIMITS.RESEARCH_MONTHLY_LIMIT);
  const totalNonTaxable = Math.min(totalGrossPay, mealAllowance + drivingAllowance + researchAllowance);
  const taxableGrossPay = Math.max(0, totalGrossPay - totalNonTaxable);

  return {
    mealAllowance,
    drivingAllowance,
    researchAllowance,
    totalNonTaxable,
    taxableGrossPay,
  };
}

/**
 * 6. 4대 보험 및 간이소득세 공제액 계산 (비과세 소득 공제 적용)
 */
export function calculateInsuranceDeductions(
  grossPay: number,
  enrollSocialInsurance: boolean,
  taxableGrossPay?: number
): InsuranceDeduction {
  const basePay = taxableGrossPay !== undefined ? taxableGrossPay : grossPay;

  if (!enrollSocialInsurance || basePay <= 0) {
    return {
      nationalPension: 0,
      healthInsurance: 0,
      longTermCare: 0,
      employmentInsurance: 0,
      incomeTax: 0,
      localIncomeTax: 0,
      totalDeductions: 0,
    };
  }

  // 국민연금: 4.5% (과세 대상 기준)
  const nationalPension = Math.round(basePay * 0.045);
  // 건강보험: 3.545%
  const healthInsurance = Math.round(basePay * 0.03545);
  // 노인장기요양보험: 건강보험료의 12.95%
  const longTermCare = Math.round(healthInsurance * 0.1295);
  // 고용보험: 0.9%
  const employmentInsurance = Math.round(basePay * 0.009);

  // 소득세 (월 106만원 초과 시 간이세액 약 1.5~2% 단순화 적용)
  let incomeTax = 0;
  if (basePay >= 1060000) {
    incomeTax = Math.round(basePay * 0.015);
  }
  const localIncomeTax = Math.round(incomeTax * 0.1);

  const totalDeductions =
    nationalPension + healthInsurance + longTermCare + employmentInsurance + incomeTax + localIncomeTax;

  return {
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    incomeTax,
    localIncomeTax,
    totalDeductions,
  };
}

/**
 * 7. 근로기준법 제48조 준수 전자 급여명세서(Payroll Slip) 발급 (비과세 항목 포함)
 */
export function generatePayrollSlip(
  profile: StaffEmploymentProfile,
  periodYearMonth: string,
  weeklyWorkedHoursList: number[],
  overtimeHours: number,
  nightHours: number,
  allowances?: NonTaxableAllowanceInput
): PayrollSlip {
  const statutoryPay = calculateStatutoryPay(
    profile,
    weeklyWorkedHoursList,
    overtimeHours,
    nightHours
  );

  const nonTaxable = calculateNonTaxableDeductions(statutoryPay.totalGrossPay, allowances);

  const deductions = calculateInsuranceDeductions(
    statutoryPay.totalGrossPay,
    profile.enrollSocialInsurance,
    nonTaxable.taxableGrossPay
  );

  const netPay = Math.max(0, statutoryPay.totalGrossPay - deductions.totalDeductions);

  return {
    slipId: `SLIP-${periodYearMonth}-${profile.staffId}`,
    staffId: profile.staffId,
    staffName: profile.staffName,
    payrollPeriod: periodYearMonth,
    employmentType: profile.employmentType,
    hourlyRate: profile.hourlyRate,
    statutoryPay,
    nonTaxable,
    taxableGrossPay: nonTaxable.taxableGrossPay,
    deductions,
    netPay,
    issuedAt: new Date().toISOString(),
  };
}

export type BankFormatCode = 'KB' | 'SHINHAN' | 'IBK' | 'NH' | 'STANDARD';

export interface BankBulkTransferEntry {
  staffId: string;
  staffName: string;
  bankName: string;
  accountNumber: string;
  amount: number;
  memo?: string;
}

/**
 * 8. 시중은행 대량이체 엑셀(CSV) 원클릭 생성기
 * - 국민은행(KB), 신한은행, 기업은행(IBK), 농협은행(NH), 표준 양식 지원
 */
export function generateBankBulkTransferCsv(
  entries: BankBulkTransferEntry[],
  bank: BankFormatCode = 'STANDARD'
): string {
  if (bank === 'KB') {
    // KB국민은행 대량이체: 출금계좌(공란/회사),입금은행,입금계좌,예금주,이체금액,내통장메모,받는분메모
    const headers = ['입금은행', '입금계좌번호', '예금주성명', '이체금액(원)', '받는분통장표시', '보내는분통장표시'];
    const rows = entries.map((e) => [
      `"${e.bankName}"`,
      `"${e.accountNumber}"`,
      `"${e.staffName}"`,
      e.amount,
      `"급여"`,
      `"${e.staffName}급여"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  if (bank === 'SHINHAN') {
    // 신한은행 대량이체 양식
    const headers = ['입금은행명', '계좌번호', '이체금액', '수취인성명', '통장표시내용'];
    const rows = entries.map((e) => [
      `"${e.bankName}"`,
      `"${e.accountNumber}"`,
      e.amount,
      `"${e.staffName}"`,
      `"${e.memo || '급여'}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  if (bank === 'IBK') {
    // IBK기업은행 대량이체 양식
    const headers = ['은행명', '계좌번호', '이체금액', '예금주명', '송금메모'];
    const rows = entries.map((e) => [
      `"${e.bankName}"`,
      `"${e.accountNumber}"`,
      e.amount,
      `"${e.staffName}"`,
      `"${e.memo || '급여'}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  if (bank === 'NH') {
    // NH농협은행 대량이체 양식
    const headers = ['입금은행', '입금계좌번호', '이체금액(원)', '예금주성명', '입금통장메모', '출금통장메모'];
    const rows = entries.map((e) => [
      `"${e.bankName}"`,
      `"${e.accountNumber}"`,
      e.amount,
      `"${e.staffName}"`,
      `"${e.memo || '급여'}"`,
      `"${e.staffName}급여"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  // STANDARD 기본 양식
  const headers = ['순번', '사원번호', '성명', '입금은행', '계좌번호', '실지급액(원)', '적요'];
  const rows = entries.map((e, idx) => [
    idx + 1,
    `"${e.staffId}"`,
    `"${e.staffName}"`,
    `"${e.bankName}"`,
    `"${e.accountNumber}"`,
    e.amount,
    `"${e.memo || '급여이체'}"`,
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * 9. 세무사 제출용 월별 전사 급여대장 엑셀 원장(CSV) 생성기
 * - 비과세 소득 공제(식대, 자가운전) 및 4대보험/소득세 과세표준 세부 분리
 */
export function generateTaxAccountantPayrollLedgerCsv(
  slips: PayrollSlip[],
  meta?: { organizationName?: string; periodYearMonth?: string }
): string {
  const orgTitle = meta?.organizationName ? `사업장: ${meta.organizationName}` : '';
  const periodTitle = meta?.periodYearMonth ? `귀속연월: ${meta.periodYearMonth}` : '';
  const titleRow = `"전사 월별 법정 급여대장 (세무사/회계법인 제출용)","${orgTitle}","${periodTitle}"`;

  const headers = [
    '순번',
    '사원번호',
    '성명',
    '고용형태',
    '기본급',
    '연장수당',
    '야간수당',
    '주휴수당',
    '식대(비과세)',
    '자가운전(비과세)',
    '총지급액(세전)',
    '비과세총액',
    '과세대상급여',
    '국민연금',
    '건강보험',
    '장기요양',
    '고용보험',
    '근로소득세',
    '지방소득세',
    '공제총액',
    '실수령액(차인지급액)',
  ];

  const rows = slips.map((s, idx) => {
    const meal = s.nonTaxable?.mealAllowance ?? 0;
    const driving = s.nonTaxable?.drivingAllowance ?? 0;
    const nonTaxTotal = s.nonTaxable?.totalNonTaxable ?? 0;
    const taxable = s.taxableGrossPay ?? Math.max(0, s.statutoryPay.totalGrossPay - nonTaxTotal);

    return [
      idx + 1,
      `"${s.staffId}"`,
      `"${s.staffName}"`,
      `"${s.employmentType === 'salaried_regular' ? '정규직(월급)' : '파트타임(시급)'}"`,
      s.statutoryPay.regularPay,
      s.statutoryPay.overtimePay,
      s.statutoryPay.nightPay,
      s.statutoryPay.weeklyHolidayPay,
      meal,
      driving,
      s.statutoryPay.totalGrossPay,
      nonTaxTotal,
      taxable,
      s.deductions.nationalPension,
      s.deductions.healthInsurance,
      s.deductions.longTermCare,
      s.deductions.employmentInsurance,
      s.deductions.incomeTax,
      s.deductions.localIncomeTax,
      s.deductions.totalDeductions,
      s.netPay,
    ].join(',');
  });

  return [titleRow, headers.join(','), ...rows].join('\n');
}

/**
 * ============================================================================
 * [ISO 9001 7.2항 & ISO 30422] 직무 역량 및 법정 자격증 관리 (Competence Register)
 * ============================================================================
 */

export interface StaffCompetencyQualification {
  id: string;
  staffId: string;
  staffName: string;
  qualificationName: string; // 예: 전기기사, 용접기능사, 조리사, 안전관리자, 보육교사 등
  issuingAuthority: string; // 발급 기관
  issueDate: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD (만료일)
  verificationStatus: 'verified' | 'pending' | 'expired' | 'revoked';
  documentUrl?: string;
}

export interface QualificationExpiryCheckResult {
  qualificationId: string;
  qualificationName: string;
  staffName: string;
  daysRemaining: number;
  status: 'valid' | 'expiring_soon' | 'expired';
  urgency: 'none' | 'warning' | 'critical';
}

/**
 * 8. 자격증 유효기간 및 D-Day 만료 상태 계산 (순수 함수)
 * - 만료일이 지난 경우: 'expired' & 'critical'
 * - 만료 30일 이내: 'expiring_soon' & 'warning'
 * - 만료 30일 초과: 'valid' & 'none'
 */
export function checkQualificationExpiry(
  qualification: StaffCompetencyQualification,
  referenceDateStr?: string
): QualificationExpiryCheckResult {
  if (!qualification.expiryDate) {
    return {
      qualificationId: qualification.id,
      qualificationName: qualification.qualificationName,
      staffName: qualification.staffName,
      daysRemaining: Infinity,
      status: 'valid',
      urgency: 'none',
    };
  }

  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const expDate = new Date(qualification.expiryDate);
  const diffTime = expDate.getTime() - refDate.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let status: 'valid' | 'expiring_soon' | 'expired' = 'valid';
  let urgency: 'none' | 'warning' | 'critical' = 'none';

  if (daysRemaining <= 0) {
    status = 'expired';
    urgency = 'critical';
  } else if (daysRemaining <= 30) {
    status = 'expiring_soon';
    urgency = 'warning';
  }

  return {
    qualificationId: qualification.id,
    qualificationName: qualification.qualificationName,
    staffName: qualification.staffName,
    daysRemaining,
    status,
    urgency,
  };
}

/**
 * 9. 만료 임박(또는 만료된) 자격증 필터링
 */
export function filterExpiringQualifications(
  qualifications: readonly StaffCompetencyQualification[],
  thresholdDays: number = 30,
  referenceDateStr?: string
): StaffCompetencyQualification[] {
  return qualifications.filter((q) => {
    const result = checkQualificationExpiry(q, referenceDateStr);
    return result.status === 'expired' || (result.status === 'expiring_soon' && result.daysRemaining <= thresholdDays);
  });
}

/**
 * ============================================================================
 * [ISO 9001 7.2항 & ISO 30414] 교육훈련 계획/이력 및 유효성 평가 (Training & Effectiveness)
 * ============================================================================
 */

export interface TrainingEffectivenessEvaluation {
  evaluatorStaffId: string;
  evaluatedAt: string; // ISO 8601
  score: number; // 0 ~ 100점
  result: 'effective' | 'retraining_required'; // 70점 이상 합격
  criteriaMet: boolean;
  feedbackComment?: string;
  signatureDataUrl?: string;
}

export interface TrainingSessionRecord {
  id: string;
  organizationId: string;
  title: string;
  trainingType: 'mandatory_statutory' | 'job_skill' | 'safety_health' | 'quality_qms' | 'ojt';
  plannedDate: string; // YYYY-MM-DD
  completedDate?: string;
  targetStaffIds: string[];
  attendedStaffIds: string[];
  trainerName: string;
  durationHours: number;
  trainingStatus: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  effectivenessEvaluation?: TrainingEffectivenessEvaluation;
}

/**
 * 10. 교육훈련 유효성 평가 기록 (순수 함수)
 * - 평가 점수 70점 이상: 'effective' (유효/합격)
 * - 평가 점수 70점 미만: 'retraining_required' (재교육 필요)
 */
export function evaluateTrainingEffectiveness(
  record: TrainingSessionRecord,
  evalData: {
    evaluatorStaffId: string;
    score: number;
    feedbackComment?: string;
    signatureDataUrl?: string;
    evaluatedAt?: string;
  }
): TrainingSessionRecord {
  const isEffective = evalData.score >= 70;
  const evaluation: TrainingEffectivenessEvaluation = {
    evaluatorStaffId: evalData.evaluatorStaffId,
    evaluatedAt: evalData.evaluatedAt || new Date().toISOString(),
    score: Math.min(100, Math.max(0, evalData.score)),
    result: isEffective ? 'effective' : 'retraining_required',
    criteriaMet: isEffective,
    feedbackComment: evalData.feedbackComment,
    signatureDataUrl: evalData.signatureDataUrl,
  };

  return {
    ...record,
    trainingStatus: 'completed',
    completedDate: record.completedDate || new Date().toISOString().split('T')[0],
    effectivenessEvaluation: evaluation,
  };
}

/**
 * 11. 전사 교육훈련 집계 지표 계산 (ISO 30414 역량 개발 지표 연계)
 */
export function calculateTrainingMetrics(
  records: readonly TrainingSessionRecord[],
  totalStaffCount: number
): {
  totalPlannedSessions: number;
  completedSessions: number;
  completionRatePercent: number;
  totalTrainedHours: number;
  averageHoursPerStaff: number;
  effectiveCount: number;
  effectivenessRatePercent: number;
} {
  if (!records || records.length === 0) {
    return {
      totalPlannedSessions: 0,
      completedSessions: 0,
      completionRatePercent: 0,
      totalTrainedHours: 0,
      averageHoursPerStaff: 0,
      effectiveCount: 0,
      effectivenessRatePercent: 0,
    };
  }

  const totalPlannedSessions = records.length;
  const completedRecords = records.filter((r) => r.trainingStatus === 'completed');
  const completedSessions = completedRecords.length;
  const completionRatePercent = Math.round((completedSessions / totalPlannedSessions) * 100);

  // 총 교육 이수 인시(Man-Hours) 계산: 각 세션의 (참석 인원 수 * 교육 시간)
  const totalTrainedHours = completedRecords.reduce(
    (sum, r) => sum + r.attendedStaffIds.length * r.durationHours,
    0
  );

  const averageHoursPerStaff =
    totalStaffCount > 0 ? Math.round((totalTrainedHours / totalStaffCount) * 10) / 10 : 0;

  const evaluatedRecords = completedRecords.filter((r) => r.effectivenessEvaluation !== undefined);
  const effectiveCount = evaluatedRecords.filter(
    (r) => r.effectivenessEvaluation?.result === 'effective'
  ).length;

  const effectivenessRatePercent =
    evaluatedRecords.length > 0
      ? Math.round((effectiveCount / evaluatedRecords.length) * 100)
      : 0;

  return {
    totalPlannedSessions,
    completedSessions,
    completionRatePercent,
    totalTrainedHours,
    averageHoursPerStaff,
    effectiveCount,
    effectivenessRatePercent,
  };
}
