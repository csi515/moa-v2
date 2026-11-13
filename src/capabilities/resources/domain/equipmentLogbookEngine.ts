/**
 * 연구 장비 예약 연동 장비 사용일지(Logbook) 자동 생성 순수 도메인 엔진 (Pure Domain Engine)
 *
 * 1. 고가 연구 장비(FE-SEM, 챔버 등) 예약 승인 시 장비 사용일지 자동 생성 (Hook)
 * 2. 가동 시간(Operating Hours) 자동 계산 (시작/종료 시각 차이)
 * 3. 연구 과제명, 연구원 서명, 장비 정상/이상 유무 상태 기록
 */

export interface EquipmentUsageLogbook {
  id: string;
  reservationId: string;
  resourceId: string;
  equipmentName: string;
  assetTagNumber?: string; // 사내 자산번호
  usageDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  operatingHours: number; // 실가동 시간 (시간 단위, 예: 2.5)
  researcherId: string;
  researcherName: string;
  projectName?: string; // 연구과제명 (예: 차세대 전고체 전지 R&D)
  equipmentStatus: 'normal' | 'issue'; // 이상 유무
  issueNotes?: string;
  isSigned: boolean; // 연구원 사용 확인 서명
  signedAt?: string;
  createdAt: string;
}

/**
 * ISO 시작/종료 시각으로부터 가동 시간(시간 단위 소수점 1자리)을 계산합니다.
 */
export function calculateOperatingHours(startsAtIso: string, endsAtIso: string): number {
  const start = new Date(startsAtIso).getTime();
  const end = new Date(endsAtIso).getTime();
  const diffMs = Math.max(0, end - start);
  return Number((diffMs / (1000 * 60 * 60)).toFixed(1));
}

/**
 * 예약 승인/완료 건으로부터 장비 사용일지(Logbook) 레코드를 자동 생성합니다.
 */
export function generateEquipmentLogbookFromReservation(params: {
  reservationId: string;
  resourceId: string;
  equipmentName: string;
  assetTagNumber?: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  researcherId: string;
  researcherName: string;
  projectName?: string;
  memo?: string;
}): EquipmentUsageLogbook {
  const operatingHours = calculateOperatingHours(params.startsAt, params.endsAt);
  const usageDate = params.startsAt.slice(0, 10);
  const startTime = params.startsAt.slice(11, 16);
  const endTime = params.endsAt.slice(11, 16);

  const nowIso = new Date(Date.now()).toISOString();

  return {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    reservationId: params.reservationId,
    resourceId: params.resourceId,
    equipmentName: params.equipmentName,
    assetTagNumber: params.assetTagNumber,
    usageDate,
    startTime,
    endTime,
    operatingHours,
    researcherId: params.researcherId,
    researcherName: params.researcherName,
    projectName: params.projectName || (params.memo ? params.memo.slice(0, 30) : '일반 연구/분석 과제'),
    equipmentStatus: 'normal',
    isSigned: false,
    createdAt: nowIso,
  };
}

/**
 * 연구원이 장비 사용 후 이상유무를 체크하고 전자 서명을 완료합니다.
 */
export function signEquipmentLogbook(
  logbook: EquipmentUsageLogbook,
  params: {
    status: 'normal' | 'issue';
    issueNotes?: string;
    signedAt?: string;
  }
): EquipmentUsageLogbook {
  return {
    ...logbook,
    equipmentStatus: params.status,
    issueNotes: params.status === 'issue' ? params.issueNotes : undefined,
    isSigned: true,
    signedAt: params.signedAt || new Date(Date.now()).toISOString(),
  };
}
