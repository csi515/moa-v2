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
