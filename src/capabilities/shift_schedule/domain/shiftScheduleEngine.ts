/**
 * 직원 근무표 & 교대 알바 시급 정산 엔진 (Pure Function Domain)
 *
 * 대상: 매장 주·야간 교대 카운터, 파트타임 강사, 청소 알바
 * 순수 로직: 근무 시프트 슬롯 충돌 방어, 타임스탬프 기반 실근무 시간 및 시급 산출식
 */

export interface StaffShift {
  id: string;
  staffId: string;
  startAt: string; // ISO String
  endAt: string; // ISO String
  breakMinutes: number;
}

export function detectShiftSlotConflict(
  existingShifts: StaffShift[],
  newShift: {
    id?: string;
    staffId: string;
    startAt: string;
    endAt: string;
  }
): { hasConflict: boolean; conflictingShiftIds: string[] } {
  const targetStart = new Date(newShift.startAt).getTime();
  const targetEnd = new Date(newShift.endAt).getTime();

  if (targetStart >= targetEnd) {
    throw new Error('시프트 시작 시각은 종료 시각보다 앞서야 합니다.');
  }

  const conflictingShiftIds = existingShifts
    .filter((s) => {
      if (newShift.id && s.id === newShift.id) return false;
      if (s.staffId !== newShift.staffId) return false;

      const sStart = new Date(s.startAt).getTime();
      const sEnd = new Date(s.endAt).getTime();

      return targetStart < sEnd && targetEnd > sStart;
    })
    .map((s) => s.id);

  return {
    hasConflict: conflictingShiftIds.length > 0,
    conflictingShiftIds,
  };
}

export interface WageCalculationParams {
  clockIn: string; // ISO String
  clockOut: string; // ISO String
  breakMinutes: number;
  hourlyRate: number;
  nightRateMultiplier?: number; // e.g. 1.5 for 150%
  // 야간 적용 시간 (기본: 22시 ~ 익일 06시)
  nightStartHour?: number; // 22
  nightEndHour?: number; // 6
}

export interface WageCalculationResult {
  actualWorkMinutes: number;
  regularMinutes: number;
  nightMinutes: number;
  regularPay: number;
  nightBonusPay: number;
  totalPay: number;
}

export function calculateShiftWage(
  params: WageCalculationParams
): WageCalculationResult {
  const {
    clockIn,
    clockOut,
    breakMinutes,
    hourlyRate,
    nightRateMultiplier = 1.5,
    nightStartHour = 22,
    nightEndHour = 6,
  } = params;

  const inDate = new Date(clockIn);
  const outDate = new Date(clockOut);
  const totalDurationMs = outDate.getTime() - inDate.getTime();

  if (totalDurationMs <= 0) {
    throw new Error('퇴근 시각은 출근 시각 이후여야 합니다.');
  }

  const totalMinutes = Math.floor(totalDurationMs / (1000 * 60));
  const actualWorkMinutes = Math.max(0, totalMinutes - breakMinutes);

  // 분 단위 야간 판정 (간이 분할)
  let nightMinutesCount = 0;
  const cursor = new Date(inDate);

  // 1분씩 순회하며 야간 시간대 카운트
  for (let m = 0; m < totalMinutes; m++) {
    const hour = cursor.getHours();
    const isNight = hour >= nightStartHour || hour < nightEndHour;
    if (isNight) {
      nightMinutesCount++;
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  // 휴게시간 비율 공제 (야간 비중에 맞춰 균등 공제)
  const nightRatio = totalMinutes > 0 ? nightMinutesCount / totalMinutes : 0;
  const nightBreak = Math.round(breakMinutes * nightRatio);
  const regularBreak = breakMinutes - nightBreak;

  const finalNightMinutes = Math.max(0, nightMinutesCount - nightBreak);
  const finalRegularMinutes = Math.max(0, actualWorkMinutes - finalNightMinutes);

  const regularPay = Math.round((actualWorkMinutes / 60) * hourlyRate);
  // 야간 가산금: (야간분 / 60) * hourlyRate * (nightRateMultiplier - 1.0)
  const nightBonusPay = Math.round(
    (finalNightMinutes / 60) * hourlyRate * (nightRateMultiplier - 1.0)
  );

  return {
    actualWorkMinutes,
    regularMinutes: finalRegularMinutes,
    nightMinutes: finalNightMinutes,
    regularPay,
    nightBonusPay,
    totalPay: regularPay + nightBonusPay,
  };
}

// ============================================================================
// 주 52시간 한도 초과 방지 인터락
// ============================================================================

export interface WeeklyWorkHoursSummary {
  staffId: string;
  totalWorkMinutes: number;
  totalWorkHours: number;
  isOver52Hours: boolean;
  isOver40Hours: boolean;
  overtimeMinutes: number;
  remainingMinutesTo52h: number;
}

/**
 * 특정 직원의 주간 누적 예정 근로시간 산출 (순수 함수)
 * - 기준: 주간 시작일(월요일)부터 일요일까지의 시프트 합산
 */
export function calculateWeeklyWorkMinutes(
  shifts: StaffShift[],
  staffId: string,
  weekStartDate: string // YYYY-MM-DD
): WeeklyWorkHoursSummary {
  const weekStart = new Date(weekStartDate).getTime();
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;

  const staffShifts = shifts.filter((s) => {
    if (s.staffId !== staffId) return false;
    const sTime = new Date(s.startAt).getTime();
    return sTime >= weekStart && sTime < weekEnd;
  });

  let totalWorkMinutes = 0;
  for (const s of staffShifts) {
    const diffMs = new Date(s.endAt).getTime() - new Date(s.startAt).getTime();
    const durationMins = Math.max(0, Math.floor(diffMs / (1000 * 60)) - (s.breakMinutes || 0));
    totalWorkMinutes += durationMins;
  }

  const limit52hMinutes = 52 * 60; // 3,120분
  const limit40hMinutes = 40 * 60; // 2,400분

  return {
    staffId,
    totalWorkMinutes,
    totalWorkHours: Math.round((totalWorkMinutes / 60) * 10) / 10,
    isOver52Hours: totalWorkMinutes > limit52hMinutes,
    isOver40Hours: totalWorkMinutes > limit40hMinutes,
    overtimeMinutes: Math.max(0, totalWorkMinutes - limit40hMinutes),
    remainingMinutesTo52h: Math.max(0, limit52hMinutes - totalWorkMinutes),
  };
}

/**
 * 신규 시프트 배정 시 주 52시간 한도 초과 인터락 검증 (순수 함수)
 */
export function validateWeekly52HourLimit(params: {
  currentWeeklyMinutes: number;
  additionalShiftMinutes: number;
  allowSpecialApproval?: boolean;
}): {
  allowed: boolean;
  isExceeded: boolean;
  projectedTotalHours: number;
  alertLevel: 'NORMAL' | 'WARNING_OVERTIME' | 'BLOCKED_52H' | 'SPECIAL_APPROVED';
  message: string;
} {
  const { currentWeeklyMinutes, additionalShiftMinutes, allowSpecialApproval = false } = params;
  const projectedTotalMinutes = currentWeeklyMinutes + additionalShiftMinutes;
  const projectedTotalHours = Math.round((projectedTotalMinutes / 60) * 10) / 10;

  const limit52h = 52 * 60;
  const limit40h = 40 * 60;

  if (projectedTotalMinutes > limit52h) {
    if (allowSpecialApproval) {
      return {
        allowed: true,
        isExceeded: true,
        projectedTotalHours,
        alertLevel: 'SPECIAL_APPROVED',
        message: `주 52시간 초과(${projectedTotalHours}h) - 관리자 특별 연장근로 특약 승인으로 저장 허용됨`,
      };
    }
    return {
      allowed: false,
      isExceeded: true,
      projectedTotalHours,
      alertLevel: 'BLOCKED_52H',
      message: `근로기준법 주 52시간 한도 초과(${projectedTotalHours}h) - 편성이 차단되었습니다. 관리자 특약 승인이 필요합니다.`,
    };
  }

  if (projectedTotalMinutes > limit40h) {
    return {
      allowed: true,
      isExceeded: false,
      projectedTotalHours,
      alertLevel: 'WARNING_OVERTIME',
      message: `주 40시간 초과 연장근로 구간 진입(${projectedTotalHours}h/52h)`,
    };
  }

  return {
    allowed: true,
    isExceeded: false,
    projectedTotalHours,
    alertLevel: 'NORMAL',
    message: '정상 소정근로 시간 내 편성',
  };
}

// ============================================================================
// 교대조(3교대/2교대) 순환 템플릿 원클릭 생성 엔진
// ============================================================================

export interface ShiftTemplate {
  id: string;
  name: string; // e.g. "주간 (Day)", "야간 (Night)", "비번 (Off)"
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakMinutes: number;
  isOffDay?: boolean;
}

export interface GeneratedShiftSlot {
  staffId: string;
  templateId: string;
  templateName: string;
  date: string; // YYYY-MM-DD
  startAt: string; // ISO
  endAt: string; // ISO
  breakMinutes: number;
}

/**
 * 템플릿 기반 1개월 치 교대근무 스케줄 일괄 자동 생성 (순수 함수)
 */
export function generateShiftCycleForMonth(params: {
  year: number;
  month: number; // 1 ~ 12
  staffIds: string[];
  templates: ShiftTemplate[];
  cyclePattern: string[]; // templateId의 배열 (e.g. ['t-day', 't-day', 't-night', 't-off'])
}): GeneratedShiftSlot[] {
  const { year, month, staffIds, templates, cyclePattern } = params;
  if (staffIds.length === 0 || cyclePattern.length === 0) return [];

  const templateMap = new Map<string, ShiftTemplate>();
  templates.forEach((t) => templateMap.set(t.id, t));

  const daysInMonth = new Date(year, month, 0).getDate();
  const results: GeneratedShiftSlot[] = [];

  staffIds.forEach((staffId, staffIndex) => {
    // 직원별 순환 패턴 오프셋 (조별 교대 분산)
    const offset = staffIndex % cyclePattern.length;

    for (let day = 1; day <= daysInMonth; day++) {
      const patternIndex = (day - 1 + offset) % cyclePattern.length;
      const targetTemplateId = cyclePattern[patternIndex];
      const template = templateMap.get(targetTemplateId);

      if (!template || template.isOffDay) continue;

      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const startAt = `${dateStr}T${template.startTime}:00Z`;

      // 익일 종료 여부 판정 (예: 22:00 ~ 06:00)
      let endDateStr = dateStr;
      if (template.endTime < template.startTime) {
        const nextDay = new Date(year, month - 1, day + 1);
        endDateStr = nextDay.toISOString().slice(0, 10);
      }
      const endAt = `${endDateStr}T${template.endTime}:00Z`;

      results.push({
        staffId,
        templateId: template.id,
        templateName: template.name,
        date: dateStr,
        startAt,
        endAt,
        breakMinutes: template.breakMinutes,
      });
    }
  });

  return results;
}

// ============================================================================
// GPS / Wi-Fi 인증 근태 타임카드 연계 검증
// ============================================================================

export interface ProximityAuthParams {
  employeeCoordinates?: { latitude: number; longitude: number };
  workplaceCoordinates?: { latitude: number; longitude: number; maxAllowedRadiusMeters?: number };
  employeeWifiSsid?: string;
  workplaceWifiSsid?: string;
}

export interface ProximityAuthResult {
  isAuthenticated: boolean;
  method: 'GPS' | 'WIFI' | 'NONE';
  distanceMeters?: number;
  message: string;
}

/**
 * Haversine 공식을 활용한 두 좌표 간 미터(m) 단위 거리 계산
 */
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // 지구 반경 (미터)
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * GPS 반경(기본 50m) 또는 매장 전용 Wi-Fi SSID 기반 근태 인증 검증 (순수 함수)
 */
export function verifyProximityWorkplaceAuth(
  params: ProximityAuthParams
): ProximityAuthResult {
  const { employeeCoordinates, workplaceCoordinates, employeeWifiSsid, workplaceWifiSsid } = params;

  // 1. Wi-Fi SSID 우선 검증
  if (
    workplaceWifiSsid &&
    employeeWifiSsid &&
    workplaceWifiSsid.trim() === employeeWifiSsid.trim()
  ) {
    return {
      isAuthenticated: true,
      method: 'WIFI',
      message: `매장 공인 Wi-Fi [${workplaceWifiSsid}] 연결 인증 완료`,
    };
  }

  // 2. GPS 위치 반경 검증
  if (employeeCoordinates && workplaceCoordinates) {
    const maxRadius = workplaceCoordinates.maxAllowedRadiusMeters ?? 50; // 기본 50m
    const distanceMeters = calculateDistanceMeters(
      employeeCoordinates.latitude,
      employeeCoordinates.longitude,
      workplaceCoordinates.latitude,
      workplaceCoordinates.longitude
    );

    if (distanceMeters <= maxRadius) {
      return {
        isAuthenticated: true,
        method: 'GPS',
        distanceMeters,
        message: `사업장 반경 ${distanceMeters}m 이내 위치 확인 (허용: ${maxRadius}m)`,
      };
    }

    return {
      isAuthenticated: false,
      method: 'NONE',
      distanceMeters,
      message: `사업장 허용 반경(${maxRadius}m)을 벗어났습니다 (현재 거리: ${distanceMeters}m)`,
    };
  }

  return {
    isAuthenticated: false,
    method: 'NONE',
    message: '근태 인증을 위한 GPS 좌표 또는 Wi-Fi 정보가 제공되지 않았습니다.',
  };
}
