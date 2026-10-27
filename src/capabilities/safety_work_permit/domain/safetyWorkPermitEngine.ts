/**
 * 산업안전보건기준에 관한 규칙 준수 안전작업허가서(Permit to Work) 라이프사이클 엔진
 */

export type PermitWorkType = 'hot_work' | 'confined_space' | 'elevated' | 'electrical' | 'excavation';
export type PermitStatus = 'requested' | 'gas_tested' | 'approved' | 'in_progress' | 'closed' | 'rejected';

export interface GasTestRecord {
  oxygenPercent: number; // 적정 공기: 18% ~ 23.5%
  combustibleGasPercent: number; // 폭발하한계 LEL 10% 미만
  carbonMonoxidePpm: number; // 30 ppm 이하
  hydrogenSulfidePpm: number; // 10 ppm 이하
  testedAt: string;
  testerName: string;
}

export interface SafetyMeasuresChecklist {
  fireExtinguisherChecked?: boolean; // 소화기 비치 (화기 필수)
  ventilationChecked?: boolean; // 강제 환기팬 가동 (밀폐 필수)
  harnessWorn?: boolean; // 안전대 체결 (고소 필수)
  lockOutTagOut?: boolean; // 차단기 LOTO 잠금 (전기/정전 필수)
}

export interface SafetyWorkPermit {
  id: string;
  permitNumber: string;
  workType: PermitWorkType;
  workTitle: string;
  workLocation: string;
  contractorName?: string;
  workerCount: number;
  startTime: string; // YYYY-MM-DDTHH:mm
  endTime: string; // YYYY-MM-DDTHH:mm
  safetyMeasures: SafetyMeasuresChecklist;
  gasTest?: GasTestRecord;
  status: PermitStatus;
  requesterId: string;
  requesterName: string;
  safetyManagerId?: string;
  safetyManagerName?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface GasSafetyAssessment {
  safe: boolean;
  reasons: string[];
}

/**
 * 가스 측정치 적정 공기 및 위험 판정
 */
export function assessGasSafety(gas: GasTestRecord): GasSafetyAssessment {
  const reasons: string[] = [];

  if (gas.oxygenPercent < 18.0) {
    reasons.push(`산소 결핍 위험 (현재 ${gas.oxygenPercent}%, 기준 18.0% 이상)`);
  } else if (gas.oxygenPercent > 23.5) {
    reasons.push(`산소 과다로 인한 화재 가속 위험 (현재 ${gas.oxygenPercent}%, 기준 23.5% 이하)`);
  }

  if (gas.combustibleGasPercent >= 10.0) {
    reasons.push(`가연성 가스 폭발 위험 (현재 LEL ${gas.combustibleGasPercent}%, 기준 10.0% 미만)`);
  }

  if (gas.carbonMonoxidePpm > 30.0) {
    reasons.push(`일산화탄소 중독 위험 (현재 ${gas.carbonMonoxidePpm}ppm, 기준 30ppm 이하)`);
  }

  if (gas.hydrogenSulfidePpm > 10.0) {
    reasons.push(`황화수소 중독 위험 (현재 ${gas.hydrogenSulfidePpm}ppm, 기준 10ppm 이하)`);
  }

  return {
    safe: reasons.length === 0,
    reasons,
  };
}

/**
 * 작업허가서 승인 가능 여부 판정
 */
export function canApprovePermit(permit: SafetyWorkPermit): { allowed: boolean; reason?: string } {
  if (permit.status === 'closed' || permit.status === 'rejected') {
    return { allowed: false, reason: '이미 종료되거나 반려된 허가서입니다.' };
  }

  // 필수 안전조치 검증
  if (permit.workType === 'hot_work' && !permit.safetyMeasures.fireExtinguisherChecked) {
    return { allowed: false, reason: '화기작업 시 소화기 비치 확인은 필수입니다.' };
  }

  if (permit.workType === 'elevated' && !permit.safetyMeasures.harnessWorn) {
    return { allowed: false, reason: '고소작업 시 추락방지 안전대 착용 확인은 필수입니다.' };
  }

  if (permit.workType === 'electrical' && !permit.safetyMeasures.lockOutTagOut) {
    return { allowed: false, reason: '정전/전기작업 시 LOTO(잠금장치·표지) 확인은 필수입니다.' };
  }

  // 밀폐공간작업 시 가스측정 필수
  if (permit.workType === 'confined_space') {
    if (!permit.gasTest) {
      return { allowed: false, reason: '밀폐공간 작업은 가스 농도 측정이 완료되어야 승인 가능합니다.' };
    }
    const assessment = assessGasSafety(permit.gasTest);
    if (!assessment.safe) {
      return { allowed: false, reason: `가스 농도 부적합: ${assessment.reasons.join(', ')}` };
    }
  }

  return { allowed: true };
}

/**
 * 작업시간 윈도우 유효성 검증
 */
export function validatePermitTimeWindow(
  startTime: string,
  endTime: string,
  maxHours = 8
): { valid: boolean; error?: string } {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (isNaN(start) || isNaN(end)) {
    return { valid: false, error: '유효한 작업 시작/종료 일시를 입력해주세요.' };
  }

  if (end <= start) {
    return { valid: false, error: '종료 일시는 시작 일시보다 늦어야 합니다.' };
  }

  const durationHours = (end - start) / (1000 * 60 * 60);
  if (durationHours > maxHours) {
    return { valid: false, error: `1회 작업허가서 최대 유효 시간(${maxHours}시간)을 초과할 수 없습니다.` };
  }

  return { valid: true };
}
