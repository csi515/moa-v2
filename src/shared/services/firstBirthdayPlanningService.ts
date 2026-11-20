/**
 * 돌잔치 행사 계획 및 플래너 협업 서비스
 *
 * - 업체 소개자료 공개 여부(isProfilePublic) 기반 필터링
 * - 홀 및 타임슬롯별 가용성(비어있는 일정 vs 예약된 일정) 계산
 * - 돌잔치 표준 식순 및 행사 시나리오 관리
 * - 플래너 수수료 정책(정액/비율/비선호보너스) 자동 계산 및 정산 귀속
 * - 「D-Day 행사 완료 후 익월 정산」 D-Day 디데이 카운트다운 및 확정 예정 수수료 지갑 엔진
 * - 세팅 및 철수 버퍼 분리 계산 및 충돌 방지 (Setup & Teardown Buffer)
 * - 파티룸 이용 규정 및 모바일 식순 브리핑 토큰 생성
 */

import type {
  EventBringingItems,
  FirstBirthdayEventPlan,
  FirstBirthdayProgramStep,
  PartnerVendorCategory,
  PlannerCommissionPolicy,
  PlannerCommissionType,
  PlannerScheduleSlot,
  SettlementScheduleRule,
  VenueIntroductionProfile,
  VenuePartnerVendor,
  VenuePaymentOptions,
  VenueRulesDefinition,
} from '@/types/firstBirthdayPlanning';
import { todayIsoLocal } from '@/shared/utils/localDate';

/**
 * 플래너 정산 요약 집계 모델
 */
export interface PlannerSettlementSummary {
  plannerId: string;
  totalBookingsCount: number;
  pendingEventCount: number;
  readyToSettleCount: number;
  settledCount: number;
  pendingEventAmount: number;
  readyToSettleAmount: number;
  settledAmount: number;
  totalCommissionAmount: number;
  averageDaysUntilEvent?: number;
}

/**
 * 게스트 및 현장 스태프용 모바일 공개 브리핑 데이터
 */
export interface PublicEventBriefingData {
  shareToken: string;
  babyName: string;
  title: string;
  eventDate: string;
  eventStartTime: string;
  eventEndTime: string;
  setupStartTime: string;
  teardownEndTime: string;
  venueName: string;
  roomName: string;
  address: string;
  parkingCapacity: string;
  transitNotice: string;
  programSteps: FirstBirthdayProgramStep[];
  venueRules?: VenueRulesDefinition;
  bringingItemsSummary?: string[];
  stylingTheme: string;
}

/**
 * 시간(HH:mm)에 분(minutes)을 가감하는 헬퍼 함수
 */
export function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  const totalM = h * 60 + m + minutesToAdd;
  const wrappedM = (totalM + 1440) % 1440;
  const resH = Math.floor(wrappedM / 60);
  const resM = wrappedM % 60;
  return `${String(resH).padStart(2, '0')}:${String(resM).padStart(2, '0')}`;
}

/**
 * 행사 시작/종료 시간에 따른 세팅 시작 시간(60분 전)과 철수 완료 시간(30분 후) 분리 계산
 */
export function calculateSetupAndTeardownTimes(
  startTime: string,
  endTime: string,
  setupMinutes: number = 60,
  teardownMinutes: number = 30
): {
  setupStartTime: string;
  teardownEndTime: string;
} {
  return {
    setupStartTime: addMinutesToTimeString(startTime, -setupMinutes),
    teardownEndTime: addMinutesToTimeString(endTime, teardownMinutes),
  };
}

/**
 * 앞뒤 행사 타임슬롯 간 세팅 및 철수 버퍼 충돌 검증
 * 이전 행사의 최종 철수 완료 시간(teardownEndTime)이 다음 행사의 세팅 시작 시간(setupStartTime)을 침범하는지 검사
 */
export function checkBufferCollision(
  previousEvent: { teardownEndTime?: string; eventEndTime?: string },
  nextEvent: { setupStartTime?: string; eventStartTime?: string }
): {
  hasCollision: boolean;
  reason?: string;
} {
  const prevEnd = previousEvent.teardownEndTime || previousEvent.eventEndTime;
  const nextStart = nextEvent.setupStartTime || nextEvent.eventStartTime;

  if (!prevEnd || !nextStart) {
    return { hasCollision: false };
  }

  const [pH, pM] = prevEnd.split(':').map(Number);
  const [nH, nM] = nextStart.split(':').map(Number);

  const prevMinutes = pH * 60 + pM;
  const nextMinutes = nH * 60 + nM;

  if (prevMinutes > nextMinutes) {
    return {
      hasCollision: true,
      reason: `이전 행사 철수 완료 시간(${prevEnd})이 다음 행사 세팅 시작 시간(${nextStart})보다 늦어 버퍼 충돌이 발생합니다.`,
    };
  }

  return { hasCollision: false };
}

/**
 * 기본 파티룸 이용 규정 가이드라인 생성
 */
export function createDefaultVenueRules(): VenueRulesDefinition {
  return {
    wallDecorPolicy: '무흔적(블루텍/마스킹) 테이프만 허용됩니다. 압정, 본드, 일반 테이프 부착은 일절 불가합니다.',
    outsideFoodPolicy: '수제 떡, 생과일, 수제 케이크 반입이 무료로 허용되며, 1층에 행사 전용 냉장고가 제공됩니다.',
    firePolicy: '안전을 위해 화기 및 일반 성냥/초 사용이 금지되며, 파티룸에 구비된 LED 촛불 사용을 권장합니다.',
    corkagePolicy: '와인/양주 반입 시 병당 20,000원의 코키지 비용이 발생하며, 전용 와인잔과 아이스버킷이 기본 제공됩니다.',
    cleaningGuideline: '퇴실 15분 전 분리수거 및 파티용품 원상복구 상태 점검 후 퇴실이 진행됩니다.',
  };
}

/**
 * 모바일 카카오톡 공유용 브리핑 식별자(shareToken) 생성
 */
export function generateBriefingToken(eventId: string): string {
  const cleanId = (eventId || 'ev').replace(/[^a-zA-Z0-9]/g, '').slice(-6);
  const randomSuffix = Math.random().toString(36).slice(2, 6);
  return `brf_${cleanId}_${randomSuffix}`;
}

/**
 * 게스트 및 스태프용 모바일 브리핑 데이터 생성 (민감 개인정보 보호 마스킹)
 */
export function sanitizeForPublicBriefing(
  event: FirstBirthdayEventPlan,
  venue: VenueIntroductionProfile
): PublicEventBriefingData {
  const setupTimes = calculateSetupAndTeardownTimes(
    event.eventStartTime || '11:30',
    event.eventEndTime || '14:00'
  );

  const bringingSummary: string[] = [];
  if (event.bringingItems?.riceCakesFruits) bringingSummary.push('수제 떡/과일');
  if (event.bringingItems?.customCake) bringingSummary.push('수제 케이크');
  if (event.bringingItems?.returnGifts) bringingSummary.push('하객 답례품');
  if (event.bringingItems?.alcoholWine) bringingSummary.push('외부 주류(코키지)');
  if (event.bringingItems?.customFlowerBalloons) bringingSummary.push('커스텀 풍선/생화');

  return {
    shareToken: event.shareToken || generateBriefingToken(event.id),
    babyName: event.babyName,
    title: event.title,
    eventDate: event.eventDate,
    eventStartTime: event.eventStartTime || '11:30',
    eventEndTime: event.eventEndTime || '14:00',
    setupStartTime: event.setupStartTime || setupTimes.setupStartTime,
    teardownEndTime: event.teardownEndTime || setupTimes.teardownEndTime,
    venueName: venue.venueName,
    roomName: event.roomName,
    address: venue.address || '서울시 강남구 테헤란로 123',
    parkingCapacity: venue.amenities?.parkingCapacity || '주차 가능',
    transitNotice: venue.amenities?.transitNotice || '지하철역 인근',
    programSteps: event.programSteps || createDefaultProgramSteps(),
    venueRules: venue.venueRules || createDefaultVenueRules(),
    bringingItemsSummary: bringingSummary,
    stylingTheme: event.stylingOptions?.theme || 'TRADITIONAL',
  };
}

/**
 * D-Day 행사 디데이 카운트다운 계산 함수 (도메인 시간 결정론 준수)
 */
export function calculateEventDDay(
  eventDate: string,
  todayIso: string = todayIsoLocal()
): {
  daysDiff: number;
  label: string;
  isPast: boolean;
  isToday: boolean;
} {
  if (!eventDate) {
    return { daysDiff: 0, label: 'D-Day', isPast: false, isToday: true };
  }

  const [eY, eM, eD] = eventDate.slice(0, 10).split('-').map(Number);
  const [tY, tM, tD] = todayIso.slice(0, 10).split('-').map(Number);

  const eventTime = new Date(eY, eM - 1, eD).getTime();
  const todayTime = new Date(tY, tM - 1, tD).getTime();

  const diffMs = eventTime - todayTime;
  const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysDiff > 0) {
    return { daysDiff, label: `D-${daysDiff}`, isPast: false, isToday: false };
  } else if (daysDiff === 0) {
    return { daysDiff: 0, label: 'D-Day', isPast: false, isToday: true };
  } else {
    return { daysDiff, label: `D+${Math.abs(daysDiff)}`, isPast: true, isToday: false };
  }
}

/**
 * 「D-Day 행사 완료 후 익월 정산」 정산 예정일자 계산
 */
export function calculateEstimatedSettlementDate(
  eventDate: string,
  rule: SettlementScheduleRule = 'NEXT_MONTH_10TH'
): string {
  if (!eventDate) return '';
  const [year, month, day] = eventDate.slice(0, 10).split('-').map(Number);

  if (rule === 'NEXT_MONTH_10TH' || rule === 'NEXT_MONTH_25TH') {
    const payDay = rule === 'NEXT_MONTH_10TH' ? 10 : 25;
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const padM = String(nextMonth).padStart(2, '0');
    const padD = String(payDay).padStart(2, '0');
    return `${nextYear}-${padM}-${padD}`;
  } else {
    const d = new Date(year, month - 1, day + 14);
    const resY = d.getFullYear();
    const resM = String(d.getMonth() + 1).padStart(2, '0');
    const resD = String(d.getDate()).padStart(2, '0');
    return `${resY}-${resM}-${resD}`;
  }
}

/**
 * 플래너 불만 해소용 확정 예정 수수료 및 D-Day 시각화 텍스트 생성
 */
export function formatPlannerWalletBadgeText(
  event: FirstBirthdayEventPlan,
  todayIso: string = todayIsoLocal()
): {
  headline: string;
  dDayBadge: string;
  settlementNotice: string;
} {
  const total = (event.commissionAmount || 0) + (event.commissionBonusAmount || 0);
  const dday = calculateEventDDay(event.eventDate, todayIso);
  const status = event.settlementStatus || 'PENDING_EVENT';
  const estimatedPayDate = calculateEstimatedSettlementDate(event.eventDate);

  if (status === 'PENDING_EVENT') {
    return {
      headline: `확정 예정 수수료 ₩${total.toLocaleString()}`,
      dDayBadge: dday.label,
      settlementNotice: `행사 종료 후 익월 정산 예정 (${estimatedPayDate} 입금)`,
    };
  } else if (status === 'READY_TO_SETTLE') {
    return {
      headline: `정산 승인 대기 ₩${total.toLocaleString()}`,
      dDayBadge: 'D-Day 완료',
      settlementNotice: `${estimatedPayDate} 지급 승인 예정`,
    };
  } else {
    return {
      headline: `정산 지급 완료 ₩${total.toLocaleString()}`,
      dDayBadge: '지급완료',
      settlementNotice: '플래너 계좌로 정산 지급이 완료되었습니다',
    };
  }
}

/**
 * 플래너에게 공개 허용(isProfilePublic = true)된 업체 목록만 필터링
 */
export function filterPublicVenues(
  venues: VenueIntroductionProfile[]
): VenueIntroductionProfile[] {
  if (!Array.isArray(venues)) return [];
  return venues.filter((venue) => venue.isProfilePublic === true);
}

/**
 * 돌잔치 표준 5단계 식순 시나리오 기본 템플릿 생성
 */
export function createDefaultProgramSteps(): FirstBirthdayProgramStep[] {
  return [
    {
      stepOrder: 1,
      time: '11:30',
      title: '하객 맞이 및 포토테이블 스냅 촬영',
      description: '입구 안내 및 웰컴 포토테이블 전시, 가족 원판 및 스냅 사진 촬영',
    },
    {
      stepOrder: 2,
      time: '12:00',
      title: '성장 동영상 상영',
      description: '빔프로젝터 및 전면 스크린을 통한 아기 성장 1년 기록 영상 상영',
    },
    {
      stepOrder: 3,
      time: '12:15',
      title: '생일축하 노래 & 돌잡이 이벤트',
      description: '촛불 켜기, 케이크 컷팅 및 메인 돌잡이 추첨 이벤트 진행 (전문 MC 진행)',
    },
    {
      stepOrder: 4,
      time: '12:35',
      title: '부모님 감사 인사 & 건배 제의',
      description: '양가 부모님 및 하객분들께 감사의 말씀 전달 및 축배',
    },
    {
      stepOrder: 5,
      time: '12:45',
      title: '식사 진행 & 답례품 전달',
      description: '연회 뷔페 식사 진행 및 귀가하시는 하객분들께 답례품 증정',
    },
  ];
}

/**
 * 플래너 성사 수수료 자동 계산
 */
export function calculatePlannerCommission(
  policy: PlannerCommissionPolicy | undefined,
  event: {
    guaranteedGuests: number;
    estimatedTotalAmount?: number;
    timeSlot?: string;
    isOffPeak?: boolean;
  }
): {
  appliedType: PlannerCommissionType | undefined;
  baseAmount: number;
  bonusAmount: number;
  totalAmount: number;
} {
  if (!policy) {
    return { appliedType: undefined, baseAmount: 0, bonusAmount: 0, totalAmount: 0 };
  }

  let baseAmount = 0;
  if (policy.type === 'FIXED_PER_BOOKING') {
    baseAmount = Math.max(0, policy.value);
  } else if (policy.type === 'PERCENTAGE') {
    const totalAmount =
      event.estimatedTotalAmount && event.estimatedTotalAmount > 0
        ? event.estimatedTotalAmount
        : (event.guaranteedGuests || 30) * 50000;
    baseAmount = Math.round(totalAmount * (policy.value / 100));
  }

  let bonusAmount = 0;
  const isOffPeakSlot =
    event.isOffPeak === true ||
    (event.timeSlot &&
      (event.timeSlot.includes('3부') ||
        event.timeSlot.includes('저녁') ||
        event.timeSlot.includes('평일')));

  if (isOffPeakSlot && policy.bonusTier && policy.bonusTier.offPeakSlotBonusAmount > 0) {
    bonusAmount = policy.bonusTier.offPeakSlotBonusAmount;
  }

  return {
    appliedType: policy.type,
    baseAmount,
    bonusAmount,
    totalAmount: baseAmount + bonusAmount,
  };
}

/**
 * 예약 건에 담당 플래너를 배정하고 수수료를 자동 귀속합니다.
 */
export function assignPlannerToEvent(
  event: FirstBirthdayEventPlan,
  planner: { id: string; name: string; agency?: string },
  policy?: PlannerCommissionPolicy,
  options?: { isOffPeak?: boolean }
): FirstBirthdayEventPlan {
  const calc = calculatePlannerCommission(policy, {
    guaranteedGuests: event.guaranteedGuests,
    estimatedTotalAmount: event.estimatedTotalAmount,
    timeSlot: event.timeSlot,
    isOffPeak: options?.isOffPeak,
  });

  return {
    ...event,
    plannerId: planner.id,
    plannerName: planner.name,
    plannerAgency: planner.agency || '제휴 플래너',
    appliedCommissionType: calc.appliedType,
    commissionAmount: calc.baseAmount,
    commissionBonusAmount: calc.bonusAmount,
    settlementStatus: event.settlementStatus || 'PENDING_EVENT',
  };
}

/**
 * 특정 플래너에게 귀속된 예약 건의 실적 및 정산 통계를 집계합니다.
 */
export function calculatePlannerSettlementSummary(
  plannerId: string,
  events: FirstBirthdayEventPlan[],
  todayIso: string = todayIsoLocal()
): PlannerSettlementSummary {
  const plannerEvents = (events || []).filter(
    (ev) => ev.plannerId === plannerId && ev.status !== 'CANCELLED'
  );

  let pendingEventCount = 0;
  let readyToSettleCount = 0;
  let settledCount = 0;
  let pendingEventAmount = 0;
  let readyToSettleAmount = 0;
  let settledAmount = 0;
  let totalDaysRemaining = 0;

  for (const ev of plannerEvents) {
    const totalCommission = (ev.commissionAmount || 0) + (ev.commissionBonusAmount || 0);
    const status = ev.settlementStatus || 'PENDING_EVENT';

    if (status === 'PENDING_EVENT') {
      pendingEventCount++;
      pendingEventAmount += totalCommission;
      const dday = calculateEventDDay(ev.eventDate, todayIso);
      if (dday.daysDiff > 0) {
        totalDaysRemaining += dday.daysDiff;
      }
    } else if (status === 'READY_TO_SETTLE') {
      readyToSettleCount++;
      readyToSettleAmount += totalCommission;
    } else if (status === 'SETTLED') {
      settledCount++;
      settledAmount += totalCommission;
    }
  }

  const averageDaysUntilEvent =
    pendingEventCount > 0 ? Math.round(totalDaysRemaining / pendingEventCount) : 0;

  return {
    plannerId,
    totalBookingsCount: plannerEvents.length,
    pendingEventCount,
    readyToSettleCount,
    settledCount,
    pendingEventAmount,
    readyToSettleAmount,
    settledAmount,
    totalCommissionAmount: pendingEventAmount + readyToSettleAmount + settledAmount,
    averageDaysUntilEvent,
  };
}

/**
 * 특정 일자의 업체 홀별 타임슬롯 스케줄을 계산하여
 * 세팅 시작 시간과 철수 완료 시간을 포함하여 산출합니다.
 */
export function calculateVenueAvailability(
  venue: VenueIntroductionProfile,
  date: string,
  events: FirstBirthdayEventPlan[]
): PlannerScheduleSlot[] {
  if (!venue || !Array.isArray(venue.halls) || !Array.isArray(venue.operatingSlots)) {
    return [];
  }

  const activeEvents = (events || []).filter(
    (ev) => ev.venueId === venue.venueId && ev.eventDate === date && ev.status !== 'CANCELLED'
  );

  const slots: PlannerScheduleSlot[] = [];

  for (const hall of venue.halls) {
    for (const opSlot of venue.operatingSlots) {
      const defaultSetupM = opSlot.defaultSetupMinutes || 60;
      const defaultTeardownM = opSlot.defaultTeardownMinutes || 30;
      const defaultBuffers = calculateSetupAndTeardownTimes(
        opSlot.startTime,
        opSlot.endTime,
        defaultSetupM,
        defaultTeardownM
      );

      const matchedEvent = activeEvents.find(
        (ev) =>
          ev.roomId === hall.id &&
          (ev.timeSlot === opSlot.label || ev.timeSlot.includes(opSlot.startTime))
      );

      const slotId = `${venue.venueId}-${hall.id}-${date}-${opSlot.slotId}`;

      if (matchedEvent) {
        const programSummary =
          matchedEvent.programSteps && matchedEvent.programSteps.length > 0
            ? `${matchedEvent.programSteps.length}단계 식순 확정 (돌잡이: ${matchedEvent.stylingOptions?.doljabiItems?.slice(0, 3).join(', ') || '전통용품'} 등)`
            : '식순 미정';

        const totalCommission =
          (matchedEvent.commissionAmount || 0) + (matchedEvent.commissionBonusAmount || 0);

        const setupStart = matchedEvent.setupStartTime || defaultBuffers.setupStartTime;
        const teardownEnd = matchedEvent.teardownEndTime || defaultBuffers.teardownEndTime;

        slots.push({
          slotId,
          timeSlotLabel: opSlot.label,
          startTime: opSlot.startTime,
          endTime: opSlot.endTime,
          setupStartTime: setupStart,
          teardownEndTime: teardownEnd,
          roomId: hall.id,
          roomName: hall.name,
          date,
          status: 'BOOKED',
          eventSummary: {
            eventId: matchedEvent.id,
            title: matchedEvent.title,
            babyName: matchedEvent.babyName,
            guaranteedGuests: matchedEvent.guaranteedGuests,
            expectedGuests: matchedEvent.expectedGuests,
            programSummary,
            stylingTheme: matchedEvent.stylingOptions?.theme || 'TRADITIONAL',
            plannerId: matchedEvent.plannerId,
            plannerName: matchedEvent.plannerName,
            commissionAmount: totalCommission,
            settlementStatus: matchedEvent.settlementStatus,
            setupStartTime: setupStart,
            teardownEndTime: teardownEnd,
          },
        });
      } else {
        slots.push({
          slotId,
          timeSlotLabel: opSlot.label,
          startTime: opSlot.startTime,
          endTime: opSlot.endTime,
          setupStartTime: defaultBuffers.setupStartTime,
          teardownEndTime: defaultBuffers.teardownEndTime,
          roomId: hall.id,
          roomName: hall.name,
          date,
          status: 'AVAILABLE',
        });
      }
    }
  }

  return slots;
}

/**
 * 행사 상세 계획서 검증 함수
 */
export function validateEventPlan(plan: Partial<FirstBirthdayEventPlan>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!plan.venueId?.trim()) {
    errors.push('업체(Venue) 정보는 필수입니다.');
  }
  if (!plan.babyName?.trim()) {
    errors.push('주인공 아기 이름은 필수입니다.');
  }
  if (!plan.eventDate?.trim()) {
    errors.push('행사 일자는 필수입니다.');
  }
  if (!plan.timeSlot?.trim()) {
    errors.push('행사 타임슬롯은 필수입니다.');
  }
  if (!plan.roomId?.trim()) {
    errors.push('배정할 연회홀은 필수입니다.');
  }
  if (plan.guaranteedGuests !== undefined && plan.guaranteedGuests < 0) {
    errors.push('최소 보증 인원은 0명 이상이어야 합니다.');
  }
  if (
    plan.expectedGuests !== undefined &&
    plan.guaranteedGuests !== undefined &&
    plan.expectedGuests < plan.guaranteedGuests
  ) {
    errors.push('예상 참석 인원은 최소 보증 인원보다 적을 수 없습니다.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 플래너 권한별 행사 상세 정보 열람 가공 함수
 */
export function sanitizeEventPlanForPlanner(
  event: FirstBirthdayEventPlan
): FirstBirthdayEventPlan {
  return {
    ...event,
    programSteps: [...(event.programSteps || [])].sort((a, b) => a.stepOrder - b.stepOrder),
  };
}

/**
 * 기본 결제 및 지역화폐 지원 옵션 생성
 */
export function createDefaultPaymentOptions(): VenuePaymentOptions {
  return {
    localCurrency: {
      isAccepted: true,
      currencyName: '서울페이',
      discountRatePercent: 10,
      notice: '서울페이 10% 할인 구매 결제 가능 (월 발행한도 내)',
    },
    onnuriCertificate: true,
    zeroPayAccepted: true,
    cashReceiptOffered: true,
    creditCardAccepted: true,
  };
}

/**
 * 제휴 협력업체 카테고리 한글 레이블 반환
 */
export function getPartnerVendorCategoryLabel(category: PartnerVendorCategory): string {
  switch (category) {
    case 'DOLJABI_TABLE':
      return '돌상';
    case 'SNAP_PHOTO':
      return '스냅';
    case 'MC':
      return '사회자';
    case 'ATTIRE':
      return '한복/의상';
    case 'FAVOR_GIFT':
      return '답례품/떡';
    default:
      return '제휴업체';
  }
}

/**
 * 샘플 제휴업체 목록 생성 (돌상, 스냅, 사회자, 한복, 답례품)
 */
export function createSamplePartnerVendors(): VenuePartnerVendor[] {
  return [
    {
      id: 'v_doljabi_01',
      category: 'DOLJABI_TABLE',
      vendorName: '수려한 전통돌상',
      contactNumber: '010-3841-8821',
      partnershipBenefit: '식대 결제 시 돌상 10% 제휴 할인 & 첫돌 현수막 무료 제작',
      instagramUrl: 'https://instagram.com/suryeohan_dol',
      description: '고급 비단과 생화 세팅, 전통 유기 식기 풀세트 보유 전문 돌상 업체',
    },
    {
      id: 'v_snap_01',
      category: 'SNAP_PHOTO',
      vendorName: '기억 스냅',
      contactNumber: '010-9922-3410',
      partnershipBenefit: '원판 1컷 무료 & 프리미엄 인화권 10매 증정',
      instagramUrl: 'https://instagram.com/memory_snap_studio',
      description: '채광을 살린 자연스러운 감성 스냅 및 돌잡이 순간 포착 전문',
    },
    {
      id: 'v_mc_01',
      category: 'MC',
      vendorName: '메이커스 전문 사회단',
      contactNumber: '010-4411-9023',
      partnershipBenefit: '베뉴 단독 제휴 ₩50,000 할인 & 맞춤 퀴즈 이벤트 기획',
      instagramUrl: 'https://instagram.com/makers_mc_party',
      description: '돌잔치 진행 경력 7년 이상 베테랑 MC, 가족 중심의 따뜻한 진행',
    },
    {
      id: 'v_attire_01',
      category: 'ATTIRE',
      vendorName: '윤슬 전통한복 & 드레스',
      contactNumber: '010-7714-5509',
      partnershipBenefit: '엄마·아빠·아기 3인 가족 패키지 15% 제휴 할인',
      instagramUrl: 'https://instagram.com/yoonseul_hanbok',
      description: '최고급 본견 실크 한복 및 감성 파티 드레스 무료 피팅 지원',
    },
    {
      id: 'v_favor_01',
      category: 'FAVOR_GIFT',
      vendorName: '온정 빚은 수제 답례떡',
      contactNumber: '010-8833-2190',
      partnershipBenefit: '답례품 테이블 무료 세팅 & 맞춤 축하 네임텍 전량 지원',
      instagramUrl: 'https://instagram.com/onjeong_ricecake',
      description: '당일 아침 도정한 햅쌀로 빚는 3구 수제 꿀설기 및 오색송편 답례떡',
    },
  ];
}

/**
 * 카테고리별 제휴 협력업체 필터링
 */
export function filterVendorsByCategory(
  vendors: VenuePartnerVendor[] | undefined,
  category: PartnerVendorCategory | 'ALL'
): VenuePartnerVendor[] {
  if (!vendors || !Array.isArray(vendors)) return [];
  if (category === 'ALL') return vendors;
  return vendors.filter((v) => v.category === category);
}

/**
 * 지역화폐 시각적 뱃지 텍스트 포맷
 */
export function formatPaymentBadgeText(options?: VenuePaymentOptions): string | null {
  if (!options?.localCurrency?.isAccepted) return null;
  const name = options.localCurrency.currencyName || '지역화폐';
  const discount = options.localCurrency.discountRatePercent
    ? ` ${options.localCurrency.discountRatePercent}%`
    : '';
  return `💚 ${name}${discount} 결제 가능`;
}

/**
 * 플래너 고객 상담용 세일즈 팁 가이드 문구
 */
export function formatSalesPitchTip(options?: VenuePaymentOptions): string {
  if (options?.localCurrency?.isAccepted) {
    const name = options.localCurrency.currencyName || '지역화폐';
    const rate = options.localCurrency.discountRatePercent || 10;
    return `혼주 상담 시 "${name}로 결제하시면 정부/지자체 지원으로 실질 ${rate}% 할인 혜택을 받으실 수 있다"고 안내해 계약 성공률을 높여보세요.`;
  }
  return '온누리상품권 및 현금영수증 지출증빙 발행 가능 여부를 안내해 신뢰를 더해보세요.';
}
