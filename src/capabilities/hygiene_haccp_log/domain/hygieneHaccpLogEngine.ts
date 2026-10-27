export interface TemperatureRecord {
  recordId: string;
  unitId: string;
  unitName: string;
  unitType: 'refrigerator' | 'freezer';
  targetMinTemp: number; // 냉장 0℃, 냉동 -25℃
  targetMaxTemp: number; // 냉장 5℃, 냉동 -18℃
  recordedTemp: number;
  timeSlot: 'morning' | 'afternoon';
  isAlert: boolean;
  alertReason?: string;
  recordedAt: string;
  recordedBy: string;
}

export interface HealthCertificateRecord {
  certId: string;
  staffId: string;
  staffName: string;
  role: string;
  examDate: string;
  expiryDate: string; // 통상 검사일로부터 1년
  dDay: number;
  status: 'valid' | 'warning' | 'expired';
}

export interface HygieneCheckItem {
  id: string;
  category: 'sanitation' | 'storage' | 'waste' | 'personal';
  task: string;
  isChecked: boolean;
  checkedAt?: string;
  inspectorName?: string;
}

export interface DailyHygieneAuditSummary {
  date: string;
  temperatureCount: number;
  temperatureAlerts: number;
  totalCheckItems: number;
  completedCheckItems: number;
  checklistCompletionRate: number; // 0 ~ 100%
  expiringHealthCertCount: number; // 14일 이내
  isInspectionReady: boolean; // 식약처 점검 적합 기준 달성 여부
}

/**
 * 냉장/냉동고 실측 온도 적정성 검증
 * - 냉장고: 0℃ ~ 5℃ (식품위생법 표준)
 * - 냉동고: -18℃ 이하
 */
export function evaluateTemperatureStatus(
  unitType: 'refrigerator' | 'freezer',
  recordedTemp: number,
  customMin?: number,
  customMax?: number
): { isAlert: boolean; alertReason?: string } {
  const min = customMin !== undefined ? customMin : (unitType === 'refrigerator' ? 0 : -30);
  const max = customMax !== undefined ? customMax : (unitType === 'refrigerator' ? 5 : -18);

  if (recordedTemp < min) {
    return {
      isAlert: true,
      alertReason: `적정 하한 온도(${min}℃) 미달 (실측: ${recordedTemp}℃)`,
    };
  }
  if (recordedTemp > max) {
    return {
      isAlert: true,
      alertReason: `적정 상한 온도(${max}℃) 초과 (실측: ${recordedTemp}℃)`,
    };
  }
  return { isAlert: false };
}

/**
 * 직원 보건증(건강진단결과서) 만료 D-Day 및 경고 상태 판정
 * - D-14 ~ D-0: warning
 * - D < 0: expired (위생과 과태료 대상)
 * - D > 14: valid
 */
export function calculateHealthCertStatus(
  expiryDateStr: string,
  baseDateStr?: string
): { dDay: number; status: 'valid' | 'warning' | 'expired' } {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  base.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);

  const diffMs = expiry.getTime() - base.getTime();
  const dDay = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (dDay < 0) {
    return { dDay, status: 'expired' };
  }
  if (dDay <= 14) {
    return { dDay, status: 'warning' };
  }
  return { dDay, status: 'valid' };
}

/**
 * 일일 위생 HACCP 점검 완료율 및 종합 판정
 */
export function calculateDailyHygieneAudit(
  date: string,
  tempRecords: TemperatureRecord[],
  checkItems: HygieneCheckItem[],
  healthCerts: HealthCertificateRecord[]
): DailyHygieneAuditSummary {
  const temperatureAlerts = tempRecords.filter(t => t.isAlert).length;
  const completedCheckItems = checkItems.filter(c => c.isChecked).length;
  const totalCheckItems = checkItems.length;
  const checklistCompletionRate = totalCheckItems > 0
    ? Math.round((completedCheckItems / totalCheckItems) * 100)
    : 100;

  const expiringHealthCertCount = healthCerts.filter(h => h.status === 'warning' || h.status === 'expired').length;

  // 점검 적합 기준: 온도 경고 0건, 체크리스트 100%, 만료된 보건증 0명
  const hasExpiredCerts = healthCerts.some(h => h.status === 'expired');
  const isInspectionReady = temperatureAlerts === 0 && checklistCompletionRate === 100 && !hasExpiredCerts;

  return {
    date,
    temperatureCount: tempRecords.length,
    temperatureAlerts,
    totalCheckItems,
    completedCheckItems,
    checklistCompletionRate,
    expiringHealthCertCount,
    isInspectionReady,
  };
}
