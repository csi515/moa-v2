import assert from 'node:assert/strict';
import {
  filterPublicVenues,
  createDefaultProgramSteps,
  calculateVenueAvailability,
  validateEventPlan,
  sanitizeEventPlanForPlanner,
  calculatePlannerCommission,
  assignPlannerToEvent,
  calculatePlannerSettlementSummary,
  calculateEventDDay,
  calculateEstimatedSettlementDate,
  formatPlannerWalletBadgeText,
  calculateSetupAndTeardownTimes,
  checkBufferCollision,
  createDefaultVenueRules,
  generateBriefingToken,
  sanitizeForPublicBriefing,
  createDefaultPaymentOptions,
  createSamplePartnerVendors,
  getPartnerVendorCategoryLabel,
  filterVendorsByCategory,
  formatPaymentBadgeText,
  formatSalesPitchTip,
} from './firstBirthdayPlanningService';
import type {
  VenueIntroductionProfile,
  FirstBirthdayEventPlan,
  PlannerCommissionPolicy,
} from '@/types/firstBirthdayPlanning';

console.log('[TEST] firstBirthdayPlanningService 단위 테스트 시작...');

const mockVenues: VenueIntroductionProfile[] = [
  {
    venueId: 'v1_public',
    venueName: '더 파티 가든 (공개 업체)',
    category: '돌잔치·연회 전문점',
    tagline: '단독홀 프리미엄 돌잔치',
    description: '자연 채광 단독홀과 전문 돌상 패키지를 제공합니다.',
    isProfilePublic: true,
    address: '서울시 서초구 서초대로 300',
    commissionPolicy: {
      type: 'FIXED_PER_BOOKING',
      value: 150000,
      bonusTier: {
        offPeakSlotBonusAmount: 50000,
        description: '일요일 저녁 3부 성사 시 추가 보너스',
      },
      settlementRule: 'NEXT_MONTH_10TH',
      payoutTermDays: 14,
    },
    venueRules: createDefaultVenueRules(),
    halls: [
      { id: 'hall_main', name: '메인 다이닝홀', capacity: 80, minGuaranteed: 30, description: '대형홀' },
      { id: 'hall_garden', name: '가든 프라이빗룸', capacity: 35, minGuaranteed: 15, description: '소규모홀' },
    ],
    packages: [
      { id: 'pkg_1', name: '프리미엄 뷔페 패키지', pricePerPerson: 55000, rentalFee: 500000, features: ['돌상', '뷔페'] },
    ],
    amenities: {
      hasNursingRoom: true,
      hasElevator: true,
      parkingCapacity: '동시 100대',
      transitNotice: '지하철역 도보 5분',
    },
    operatingSlots: [
      { slotId: 'slot_1', label: '1부 (11:30~14:00)', startTime: '11:30', endTime: '14:00' },
      { slotId: 'slot_2', label: '2부 (15:00~17:30)', startTime: '15:00', endTime: '17:30' },
      { slotId: 'slot_3', label: '3부 (18:30~21:00)', startTime: '18:30', endTime: '21:00' },
    ],
  },
  {
    venueId: 'v2_private',
    venueName: '비공개 연회장',
    category: '돌잔치·연회 전문점',
    tagline: '내부 회원제 프라이빗 베뉴',
    description: '외부 플래너에게 비공개된 베뉴입니다.',
    isProfilePublic: false,
    halls: [
      { id: 'hall_vip', name: 'VIP룸', capacity: 20, minGuaranteed: 10, description: '회원제' },
    ],
    packages: [],
    amenities: {
      hasNursingRoom: false,
      hasElevator: true,
      parkingCapacity: '20대',
      transitNotice: '발렛 가능',
    },
    operatingSlots: [
      { slotId: 'slot_1', label: '1부 (12:00~15:00)', startTime: '12:00', endTime: '15:00' },
    ],
  },
];

// 1. 업체 소개자료 공개 여부 필터링 검증
const publicVenues = filterPublicVenues(mockVenues);
assert.equal(publicVenues.length, 1, '공개(isProfilePublic=true) 업체만 필터링되어야 합니다.');
assert.equal(publicVenues[0].venueId, 'v1_public');
assert.equal(publicVenues.some((v) => v.venueId === 'v2_private'), false, '비공개 업체는 포함되지 않아야 합니다.');
console.log('✓ [PASS] 업체 소개자료 공개/비공개 필터링 검증 완료');

// 2. 기본 돌잔치 5단계 식순 시나리오 생성 검증
const defaultSteps = createDefaultProgramSteps();
assert.equal(defaultSteps.length, 5, '기본 식순은 5단계로 구성되어야 합니다.');
assert.ok(defaultSteps.some((s) => s.title.includes('돌잡이')), '돌잡이 이벤트 단계가 포함되어야 합니다.');
assert.ok(defaultSteps.some((s) => s.title.includes('성장 동영상')), '성장 동영상 단계가 포함되어야 합니다.');
console.log('✓ [PASS] 돌잔치 기본 식순 시나리오 생성 검증 완료');

// 3. 플래너 수수료 자동 계산 로직 단위 테스트 (정액제 & 비율제 & 보너스 티어)
const fixedPolicy: PlannerCommissionPolicy = {
  type: 'FIXED_PER_BOOKING',
  value: 150000,
  bonusTier: { offPeakSlotBonusAmount: 50000, description: '3부 타임 보너스' },
};

const fixedCalcStandard = calculatePlannerCommission(fixedPolicy, {
  guaranteedGuests: 40,
  timeSlot: '1부 (11:30~14:00)',
});
assert.equal(fixedCalcStandard.baseAmount, 150000);
assert.equal(fixedCalcStandard.bonusAmount, 0);
assert.equal(fixedCalcStandard.totalAmount, 150000);

const fixedCalcOffPeak = calculatePlannerCommission(fixedPolicy, {
  guaranteedGuests: 40,
  timeSlot: '3부 (18:30~21:00)',
});
assert.equal(fixedCalcOffPeak.baseAmount, 150000);
assert.equal(fixedCalcOffPeak.bonusAmount, 50000);
assert.equal(fixedCalcOffPeak.totalAmount, 200000);

const percentagePolicy: PlannerCommissionPolicy = {
  type: 'PERCENTAGE',
  value: 8,
  bonusTier: { offPeakSlotBonusAmount: 30000 },
};
const percentCalc = calculatePlannerCommission(percentagePolicy, {
  guaranteedGuests: 40,
  estimatedTotalAmount: 2500000,
  timeSlot: '1부 (11:30~14:00)',
});
assert.equal(percentCalc.baseAmount, 200000);
assert.equal(percentCalc.bonusAmount, 0);
assert.equal(percentCalc.totalAmount, 200000);
console.log('✓ [PASS] 플래너 수수료(정액제/비율제/보너스) 자동 계산 검증 완료');

// 4. 플래너 자동 귀속 및 정산 집계 테스트
const baseEvent: FirstBirthdayEventPlan = {
  id: 'ev_001',
  venueId: 'v1_public',
  title: '민준이 첫돌 잔치',
  babyName: '김민준',
  babyBirthDate: '2025-12-01',
  eventDate: '2026-12-05',
  timeSlot: '3부 (18:30~21:00)',
  eventStartTime: '18:30',
  eventEndTime: '21:00',
  roomId: 'hall_main',
  roomName: '메인 다이닝홀',
  guaranteedGuests: 40,
  expectedGuests: 50,
  highChairCount: 5,
  programSteps: defaultSteps,
  stylingOptions: {
    theme: 'TRADITIONAL',
    backdropText: '민준이의 첫 번째 생일',
    doljabiItems: ['판사봉', '청진기', '마이크'],
  },
  externalServices: {
    mcIncluded: true,
    snapPhotographer: true,
    hanbokDressRental: true,
    favorGiftTable: true,
  },
  status: 'CONFIRMED',
  createdAt: '2026-11-20T00:00:00Z',
  updatedAt: '2026-11-20T00:00:00Z',
};

const assignedEvent = assignPlannerToEvent(
  baseEvent,
  { id: 'pl_042', name: '박지민 플래너', agency: '해피웨딩에이전시' },
  fixedPolicy
);
assert.equal(assignedEvent.plannerId, 'pl_042');
assert.equal(assignedEvent.plannerName, '박지민 플래너');
assert.equal(assignedEvent.appliedCommissionType, 'FIXED_PER_BOOKING');
assert.equal(assignedEvent.commissionAmount, 150000);
assert.equal(assignedEvent.commissionBonusAmount, 50000);
assert.equal(assignedEvent.settlementStatus, 'PENDING_EVENT');
console.log('✓ [PASS] 예약 건 담당 플래너 ID 및 수수료 자동 귀속 검증 완료');

// 5. 플래너 정산 통계 집계 테스트 (D-Day 및 익월 정산)
const event2: FirstBirthdayEventPlan = {
  ...assignedEvent,
  id: 'ev_002',
  settlementStatus: 'READY_TO_SETTLE',
  commissionAmount: 150000,
  commissionBonusAmount: 0,
};
const event3: FirstBirthdayEventPlan = {
  ...assignedEvent,
  id: 'ev_003',
  settlementStatus: 'SETTLED',
  commissionAmount: 180000,
  commissionBonusAmount: 0,
};

const summary = calculatePlannerSettlementSummary('pl_042', [assignedEvent, event2, event3], '2026-11-20');
assert.equal(summary.totalBookingsCount, 3);
assert.equal(summary.pendingEventAmount, 200000);
assert.equal(summary.readyToSettleAmount, 150000);
assert.equal(summary.settledAmount, 180000);
assert.equal(summary.totalCommissionAmount, 530000);
console.log('✓ [PASS] 플래너 정산 실적 집계 검증 완료');

// 6. 「D-Day 행사 완료 후 익월 정산」 D-Day 카운트다운 및 익월 10일 계산 검증
const dday15 = calculateEventDDay('2026-12-05', '2026-11-20');
assert.equal(dday15.daysDiff, 15);
assert.equal(dday15.label, 'D-15');

const payDate = calculateEstimatedSettlementDate('2026-12-05', 'NEXT_MONTH_10TH');
assert.equal(payDate, '2027-01-10');

const walletText = formatPlannerWalletBadgeText(assignedEvent, '2026-11-20');
assert.equal(walletText.headline, '확정 예정 수수료 ₩200,000');
assert.equal(walletText.dDayBadge, 'D-15');
assert.ok(walletText.settlementNotice.includes('2027-01-10'));
console.log('✓ [PASS] 「D-Day 행사 완료 후 익월 정산」 D-Day 및 지갑 텍스트 검증 완료');

// 7. [신규] 세팅(60분 전) 및 철수(30분 후) 시간 분리 계산 검증
const bufferTimes = calculateSetupAndTeardownTimes('11:30', '14:00', 60, 30);
assert.equal(bufferTimes.setupStartTime, '10:30', '11:30 행사 시작 시 60분 전 세팅 입실은 10:30이어야 합니다.');
assert.equal(bufferTimes.teardownEndTime, '14:30', '14:00 행사 종료 시 30분 후 철수 퇴실은 14:30이어야 합니다.');
console.log('✓ [PASS] 세팅 및 철수 버퍼 시간 분리 계산 검증 완료');

// 8. [신규] 버퍼 충돌 감지 로직 검증 (checkBufferCollision)
// 상황 A: 이전 행사 철수 14:30 vs 다음 행사 세팅 14:00 -> 충돌 발생!
const collisionTest = checkBufferCollision(
  { teardownEndTime: '14:30', eventEndTime: '14:00' },
  { setupStartTime: '14:00', eventStartTime: '15:00' }
);
assert.equal(collisionTest.hasCollision, true, '이전 행사 철수보다 다음 행사 세팅이 빠르면 충돌해야 합니다.');

// 상황 B: 이전 행사 철수 14:30 vs 다음 행사 세팅 15:00 -> 안전 통과
const safeTest = checkBufferCollision(
  { teardownEndTime: '14:30', eventEndTime: '14:00' },
  { setupStartTime: '15:00', eventStartTime: '16:00' }
);
assert.equal(safeTest.hasCollision, false, '시간 간격이 충분하면 충돌이 없어야 합니다.');
console.log('✓ [PASS] 타임슬롯 간 세팅/철수 버퍼 충돌 방지 검증 완료');

// 9. [신규] 모바일 브리핑 토큰 및 공개 데이터 생성 검증 (민감 개인정보 보호)
const briefingToken = generateBriefingToken('ev_001');
assert.ok(briefingToken.startsWith('brf_'), '브리핑 토큰은 brf_ 접두사를 가져야 합니다.');

const publicBriefing = sanitizeForPublicBriefing(baseEvent, mockVenues[0]);
assert.equal(publicBriefing.babyName, '김민준');
assert.equal(publicBriefing.setupStartTime, '17:30', '18:30 시작 기준 60분 전 세팅 시간 자동 매핑');
assert.equal(publicBriefing.teardownEndTime, '21:30', '21:00 종료 기준 30분 후 철수 시간 자동 매핑');
assert.ok(publicBriefing.venueRules?.wallDecorPolicy, '벽면 부착 규정이 포함되어야 합니다.');
assert.equal((publicBriefing as unknown as Record<string, unknown>).plannerId, undefined, '플래너 ID 등 내부 정보는 공개 브리핑에서 마스킹되어야 합니다.');
assert.equal((publicBriefing as unknown as Record<string, unknown>).commissionAmount, undefined, '수수료 정보는 게스트 브리핑에서 마스킹되어야 합니다.');
console.log('✓ [PASS] 모바일 카카오톡 브리핑 데이터 생성 및 개인정보 보호 마스킹 검증 완료');

// 10. 플래너 일정 가용성(비어있는 일정 vs 예약된 일정) 계산 검증
const targetDate = '2026-12-05';
const slots = calculateVenueAvailability(mockVenues[0], targetDate, [assignedEvent]);
assert.equal(slots.length, 6);

const bookedSlot = slots.find(
  (s) => s.roomId === 'hall_main' && s.startTime === '18:30'
);
assert.ok(bookedSlot);
assert.equal(bookedSlot.status, 'BOOKED');
assert.equal(bookedSlot.setupStartTime, '17:30');
assert.equal(bookedSlot.teardownEndTime, '21:30');
console.log('✓ [PASS] 플래너 가용성 슬롯에 세팅/철수 버퍼 시간 매핑 검증 완료');

// 11. [신규] 공식 제휴업체(Partner Vendors) 카테고리별 필터링 및 혜택 매핑 검증
const sampleVendors = createSamplePartnerVendors();
assert.equal(sampleVendors.length, 5, '기본 제휴업체 5대 카테고리가 모두 생성되어야 합니다.');

const doljabiVendors = filterVendorsByCategory(sampleVendors, 'DOLJABI_TABLE');
assert.equal(doljabiVendors.length, 1);
assert.equal(doljabiVendors[0].vendorName, '수려한 전통돌상');
assert.ok(doljabiVendors[0].partnershipBenefit.includes('돌상 10% 제휴 할인'));

const snapVendors = filterVendorsByCategory(sampleVendors, 'SNAP_PHOTO');
assert.equal(snapVendors.length, 1);
assert.equal(snapVendors[0].vendorName, '기억 스냅');
assert.ok(snapVendors[0].partnershipBenefit.includes('원판 1컷 무료'));

assert.equal(getPartnerVendorCategoryLabel('DOLJABI_TABLE'), '돌상');
assert.equal(getPartnerVendorCategoryLabel('SNAP_PHOTO'), '스냅');
assert.equal(getPartnerVendorCategoryLabel('MC'), '사회자');
assert.equal(getPartnerVendorCategoryLabel('ATTIRE'), '한복/의상');
assert.equal(getPartnerVendorCategoryLabel('FAVOR_GIFT'), '답례품/떡');
console.log('✓ [PASS] 공식 제휴업체(Partner Vendors) 카테고리 필터링 및 혜택 매핑 검증 완료');

// 12. [신규] 지역화폐 시각적 뱃지 및 플래너 세일즈 팁 생성 검증 (구체적 할인율 수치 미언급)
const paymentOptions = createDefaultPaymentOptions();
const badgeText = formatPaymentBadgeText(paymentOptions);
assert.equal(badgeText, '💚 서울페이 결제 가능');

const salesTip = formatSalesPitchTip(paymentOptions);
assert.ok(salesTip.includes('서울페이 등 지역화폐로 결제하시면'));
assert.ok(salesTip.includes('구매 할인 혜택'));

// 지역화폐 미지원 시 뱃지 null 검증
const noLocalCurrency = { ...paymentOptions, localCurrency: { isAccepted: false, currencyName: '' } };
assert.equal(formatPaymentBadgeText(noLocalCurrency), null);
console.log('✓ [PASS] 지역화폐 시각적 뱃지 및 플래너 세일즈 팁 생성 검증 완료');

console.log('모든 firstBirthdayPlanningService 단위 테스트 100% 통과!');
