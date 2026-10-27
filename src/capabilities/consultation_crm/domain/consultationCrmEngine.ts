/**
 * 고객 상담 일지 & 특이사항 태그 엔진 (Pure Function Domain)
 *
 * 대상: 학부모 상담 일지, 필라테스 체형/디스크 메모, 공방 고객 취향
 * 순수 로직: 고객 타임라인 로그 정규화, 재등록 권유 D-Day 플래그 판정식
 */

export interface ConsultationRecord {
  id: string;
  customerId: string;
  counselorId: string;
  content: string;
  category: 'REGISTRATION' | 'PROGRESS' | 'COMPLAINT' | 'RE_ENROLLMENT' | 'GENERAL';
  tags: string[];
  createdAt: string; // ISO String
}

export interface NormalizedCustomerTimeline {
  customerId: string;
  totalConsultations: number;
  distinctTags: string[];
  sortedRecords: ConsultationRecord[];
  latestCategory?: string;
  lastContactDate?: string;
}

export function normalizeCustomerTimeline(
  records: ConsultationRecord[]
): NormalizedCustomerTimeline {
  if (records.length === 0) {
    return {
      customerId: '',
      totalConsultations: 0,
      distinctTags: [],
      sortedRecords: [],
    };
  }

  const customerId = records[0].customerId;
  // 최신순 정렬
  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const tagsSet = new Set<string>();
  for (const r of sortedRecords) {
    for (const t of r.tags) {
      if (t.trim()) tagsSet.add(t.trim());
    }
  }

  return {
    customerId,
    totalConsultations: sortedRecords.length,
    distinctTags: [...tagsSet].sort(),
    sortedRecords,
    latestCategory: sortedRecords[0]?.category,
    lastContactDate: sortedRecords[0]?.createdAt.slice(0, 10),
  };
}

export interface ReEnrollmentDDayResult {
  dDay: number; // 음수면 만료 경과, 0이면 당일, 양수면 잔여 일
  isExpired: boolean;
  requiresAction: boolean;
  urgencyLevel: 'NONE' | 'NORMAL' | 'HIGH' | 'CRITICAL';
}

export function evaluateReEnrollmentDDay(params: {
  membershipEndDate: string; // YYYY-MM-DD
  currentDate: string; // YYYY-MM-DD
  leadNoticeDays?: number; // 기본: 7일 전부터 권유
}): ReEnrollmentDDayResult {
  const { membershipEndDate, currentDate, leadNoticeDays = 7 } = params;

  const endMs = new Date(membershipEndDate).getTime();
  const curMs = new Date(currentDate).getTime();

  const dDay = Math.ceil((endMs - curMs) / (1000 * 3600 * 24));
  const isExpired = dDay < 0;

  // 알림 대상: 만료 이전 leadNoticeDays 이내이거나, 만료 직후 7일 이내
  const requiresAction = dDay <= leadNoticeDays && dDay >= -7;

  let urgencyLevel: 'NONE' | 'NORMAL' | 'HIGH' | 'CRITICAL' = 'NONE';

  if (requiresAction) {
    if (dDay <= 0 && dDay >= -3) {
      urgencyLevel = 'CRITICAL'; // 만료 임박 당일 또는 3일 이내
    } else if (dDay <= 3) {
      urgencyLevel = 'HIGH'; // D-3 이내
    } else {
      urgencyLevel = 'NORMAL'; // D-7 ~ D-4
    }
  }

  return {
    dDay,
    isExpired,
    requiresAction,
    urgencyLevel,
  };
}

export type SmartTagCategory =
  | 'HEALTH_ALERT' // 건강/부상/알레르기 (예: "손목 건초염", "라텍스 알레르기")
  | 'PREFERENCE' // 취향/선호도 (예: "물주기 쉬운 식물 선호", "클래식 음악 선호")
  | 'INTERACTION_TIP' // 접객/응대 팁 (예: "왼손잡이", "조용한 시술 선호", "상담 시 칭찬 위주")
  | 'PET_HOME' // 반려/가족 환경 (예: "고양이 있음", "다자녀 가정")
  | 'SKILL_LEVEL'; // 수준/경력 (예: "완전 초보", "전공자", "10년 경력");

export interface SmartCustomerTag {
  id: string;
  label: string;
  category: SmartTagCategory;
  colorHex: string;
  isUrgentAlert?: boolean;
  counterTip?: string; // 데스크 직원을 위한 한 줄 안내 가이드
}

export interface CustomerPreferenceProfile {
  customerId: string;
  tags: SmartCustomerTag[];
  specialNotes?: string;
}

/**
 * 데스크 접수 및 카운터 체크인 시 실시간 주의사항 및 응대 가이드 산출 (순수 함수)
 */
export function evaluateDeskGreetingTip(profile: CustomerPreferenceProfile): {
  hasUrgentAlert: boolean;
  urgentAlerts: string[];
  tipsForDesk: string[];
  displayTags: Array<{ label: string; color: string; isAlert: boolean }>;
} {
  const urgentAlerts: string[] = [];
  const tipsForDesk: string[] = [];
  const displayTags = profile.tags.map((t) => ({
    label: t.label,
    color: t.colorHex,
    isAlert: !!t.isUrgentAlert,
  }));

  for (const tag of profile.tags) {
    if (tag.isUrgentAlert) {
      urgentAlerts.push(tag.label);
    }
    if (tag.counterTip?.trim()) {
      tipsForDesk.push(`[${tag.label}] ${tag.counterTip.trim()}`);
    }
  }

  if (profile.specialNotes?.trim()) {
    tipsForDesk.push(`[메모] ${profile.specialNotes.trim()}`);
  }

  return {
    hasUrgentAlert: urgentAlerts.length > 0,
    urgentAlerts,
    tipsForDesk,
    displayTags,
  };
}

