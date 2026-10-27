/**
 * 구역별 수도·전기 검침 및 관리비 분할 정산 도메인 엔진 (Pure Functions)
 */

export type UtilityType = 'ELECTRICITY' | 'WATER' | 'GAS';

export interface UtilityMeterReadingRecord {
  id: string;
  tenant_id: string;
  zone_name: string; // 예: "3층 B스튜디오", "201호 음악실"
  utility_type: UtilityType;
  meter_serial: string;
  previous_reading: number;
  current_reading: number;
  usage_amount: number; // current - previous
  unit_price: number;
  total_billed_amount: number;
  reading_date: string;
  billed_month: string; // "YYYY-MM"
}

export function computeUtilityUsage(prev: number, curr: number): { usage: number; isValid: boolean; error?: string } {
  if (curr < prev) {
    return { usage: 0, isValid: false, error: '당월 검침 지침은 전월 지침보다 작을 수 없습니다.' };
  }
  return { usage: curr - prev, isValid: true };
}

export function computeUtilityCost(usage: number, unitPrice: number, baseFee = 0): number {
  return Math.max(0, Math.round(usage * unitPrice + baseFee));
}

export function getUtilityUnitLabel(type: UtilityType): string {
  switch (type) {
    case 'ELECTRICITY':
      return 'kWh';
    case 'WATER':
    case 'GAS':
      return 'm³';
  }
}
