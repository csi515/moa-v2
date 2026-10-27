/**
 * 정밀 계측기·의료장비 정기 검교정 대장 도메인 엔진 (Pure Functions)
 */

export type CalibrationStatus =
  | 'CALIBRATED_VALID'       // 유효 (정상)
  | 'WARNING_EXPIRING_SOON'   // 만료 임박 (30일 이내)
  | 'EXPIRED_OVERDUE'         // 교정 만료
  | 'OUT_OF_TOLERANCE';       // 허용 오차 초과 (사용 불가)

export interface CalibrationDeviceRecord {
  id: string;
  tenant_id: string;
  device_name: string; // 예: "인바디 770 체성분분석기"
  serial_number: string;
  location: string;
  last_calibrated_at: string;
  next_calibration_due: string;
  measured_error_percent: number; // 실측 오차율 (%)
  tolerance_max_percent: number;  // 허용 최대 오차율 (%)
  certificate_number?: string;
  status: CalibrationStatus;
  calibrated_by?: string;
}

export function evaluateDeviceCalibration(
  lastCalibratedAt: string,
  cycleMonths: number,
  measuredError: number,
  maxTolerance: number,
  currentTime: Date = new Date(),
  warningDays = 30
): { nextDue: string; status: CalibrationStatus; daysRemaining: number } {
  // 허용 오차 초과 판정
  if (Math.abs(measuredError) > maxTolerance) {
    return {
      nextDue: lastCalibratedAt,
      status: 'OUT_OF_TOLERANCE',
      daysRemaining: 0,
    };
  }

  const lastDate = new Date(lastCalibratedAt);
  const nextDueDate = new Date(lastDate);
  nextDueDate.setMonth(nextDueDate.getMonth() + cycleMonths);

  const nextDue = nextDueDate.toISOString().split('T')[0];
  const diffMs = nextDueDate.getTime() - currentTime.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { nextDue, status: 'EXPIRED_OVERDUE', daysRemaining };
  }
  if (daysRemaining <= warningDays) {
    return { nextDue, status: 'WARNING_EXPIRING_SOON', daysRemaining };
  }

  return { nextDue, status: 'CALIBRATED_VALID', daysRemaining };
}

export function validateDeviceInput(
  name: string,
  serial: string
): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: '장비명을 입력해 주세요.' };
  }
  if (!serial || serial.trim().length === 0) {
    return { isValid: false, error: '장비 시리얼 번호(제조번호)를 입력해 주세요.' };
  }
  return { isValid: true };
}
