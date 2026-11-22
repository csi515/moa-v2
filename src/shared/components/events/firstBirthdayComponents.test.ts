import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { FirstBirthdayEventDetailModal } from './FirstBirthdayEventDetailModal';
import { VenueProfileSettingCard } from './VenueProfileSettingCard';
import { PlannerAvailabilityCalendar } from './PlannerAvailabilityCalendar';
import { PlannerVenueDirectory } from './PlannerVenueDirectory';
import { PlannerSettlementDashboard } from './PlannerSettlementDashboard';
import { MobileEventBriefingView } from './MobileEventBriefingView';
import {
  calculateVenueAvailability,
  createDefaultProgramSteps,
  createDefaultVenueRules,
  createDefaultPaymentOptions,
  createSamplePartnerVendors,
  sanitizeForPublicBriefing,
} from '@/shared/services/firstBirthdayPlanningService';
import type {
  VenueIntroductionProfile,
  FirstBirthdayEventPlan,
} from '@/types/firstBirthdayPlanning';

console.log('[TEST] 돌잔치 프리셋 및 플래너 수수료 정책/귀속 & 제휴업체 및 지역화폐 컴포넌트 SSR & 통합 테스트 시작...');

const mockProfilePublic: VenueIntroductionProfile = {
  venueId: 'venue_101',
  venueName: '라온제나 돌잔치 파티하우스',
  category: '돌잔치·연회 전문점',
  tagline: '단독홀 프리미엄 돌잔치 전문 베뉴',
  description: '최신 돌상과 넓은 통창 채광을 자랑하는 돌잔치 전문점입니다.',
  isProfilePublic: true,
  address: '서울특별시 강남구 테헤란로 123 파티타워 3층',
  commissionPolicy: {
    type: 'FIXED_PER_BOOKING',
    value: 150000,
    settlementRule: 'NEXT_MONTH_10TH',
    bonusTier: { offPeakSlotBonusAmount: 50000, description: '3부 저녁 타임 성사 보너스' },
    payoutTermDays: 14,
  },
  venueRules: createDefaultVenueRules(),
  paymentOptions: createDefaultPaymentOptions(),
  partnerVendors: createSamplePartnerVendors(),
  halls: [
    { id: 'h1', name: '아도니스홀', capacity: 70, minGuaranteed: 35, description: '화이트 플라워 컨셉' },
    { id: 'h2', name: '루나홀', capacity: 40, minGuaranteed: 20, description: '전통 한옥 컨셉' },
  ],
  packages: [
    {
      id: 'p1',
      name: '올인원 명품 돌상 패키지',
      pricePerPerson: 58000,
      rentalFee: 400000,
      badge: '대표',
      features: ['전통 돌상 풀세팅', '성장 동영상 상영 빔프로젝터', '전문 사회자'],
    },
  ],
  amenities: {
    hasNursingRoom: true,
    hasElevator: true,
    parkingCapacity: '동시 120대 무료 주차',
    transitNotice: '지하철 2호선 역 도보 3분',
  },
  operatingSlots: [
    { slotId: 'slot_1', label: '1부 (11:30~14:00)', startTime: '11:30', endTime: '14:00' },
    { slotId: 'slot_2', label: '2부 (15:00~17:30)', startTime: '15:00', endTime: '17:30' },
    { slotId: 'slot_3', label: '3부 (18:30~21:00)', startTime: '18:30', endTime: '21:00' },
  ],
};

const mockProfilePrivate: VenueIntroductionProfile = {
  venueId: 'venue_102',
  venueName: '비공개 시크릿 파티룸',
  category: '돌잔치·연회 전문점',
  tagline: '외부 비공개 베뉴',
  description: '플래너에게 공개되지 않는 업체입니다.',
  isProfilePublic: false,
  halls: [{ id: 'hp', name: '시크릿룸', capacity: 30, minGuaranteed: 10, description: '비공개홀' }],
  packages: [],
  amenities: {
    hasNursingRoom: false,
    hasElevator: false,
    parkingCapacity: '협소',
    transitNotice: '개별 안내',
  },
  operatingSlots: [
    { slotId: 'slot_1', label: '1부 (12:00~15:00)', startTime: '12:00', endTime: '15:00' },
  ],
};

const mockEvent: FirstBirthdayEventPlan = {
  id: 'ev_2026',
  venueId: 'venue_101',
  title: '서윤이의 첫돌 잔치',
  babyName: '윤서윤',
  babyBirthDate: '2025-11-20',
  eventDate: '2026-11-28',
  timeSlot: '1부 (11:30~14:00)',
  eventStartTime: '11:30',
  eventEndTime: '14:00',
  setupStartTime: '10:30',
  teardownEndTime: '14:30',
  roomId: 'h1',
  roomName: '아도니스홀',
  guaranteedGuests: 35,
  expectedGuests: 45,
  highChairCount: 4,
  programSteps: createDefaultProgramSteps(),
  stylingOptions: {
    theme: 'TRADITIONAL',
    backdropText: '서윤이의 첫 번째 생일파티',
    doljabiItems: ['판사봉', '청진기', '엽전', '마이크', '명주실'],
  },
  externalServices: {
    mcIncluded: true,
    snapPhotographer: true,
    hanbokDressRental: true,
    favorGiftTable: true,
  },
  bringingItems: {
    riceCakesFruits: true,
    customCake: true,
    returnGifts: true,
    alcoholWine: false,
    customFlowerBalloons: false,
  },
  venueRulesAgreed: true,
  venueRulesAgreedAt: '2026-11-20T10:00:00Z',
  shareToken: 'brf_ev2026_test123',
  plannerId: 'pl_042',
  plannerName: '박지민',
  plannerAgency: '해피웨딩',
  appliedCommissionType: 'FIXED_PER_BOOKING',
  commissionAmount: 150000,
  commissionBonusAmount: 0,
  settlementStatus: 'PENDING_EVENT',
  plannerNotes: '외부 답례품 떡 반입 예정 (입구 안내 세팅 요망)',
  status: 'CONFIRMED',
  createdAt: '2026-11-20T10:00:00Z',
  updatedAt: '2026-11-20T10:00:00Z',
};

// 1. FirstBirthdayEventDetailModal SSR 검증
const modalHtml = renderToString(
  React.createElement(FirstBirthdayEventDetailModal, {
    isOpen: true,
    onClose: () => {},
    event: mockEvent,
  })
);
assert.ok(modalHtml.includes('윤서윤'), '모달에 아기 이름이 포함되어야 합니다.');
assert.ok(modalHtml.includes('담당 플래너'), '담당 플래너 레이블이 표시되어야 합니다.');
assert.ok(modalHtml.includes('박지민'), '배정된 플래너 이름이 표시되어야 합니다.');
assert.ok(modalHtml.includes('pl_042'), '플래너 고유 ID가 표시되어야 합니다.');
assert.ok(modalHtml.includes('확정 예정 수수료'), '확정 예정 수수료 문구가 표시되어야 합니다.');
assert.ok(modalHtml.includes('150,000'), '수수료 금액이 표시되어야 합니다.');
assert.ok(modalHtml.includes('세팅 및 철수 버퍼 시간'), '세팅/철수 버퍼 정보가 표시되어야 합니다.');
assert.ok(modalHtml.includes('10:30'), '세팅 시작 시간이 표시되어야 합니다.');
assert.ok(modalHtml.includes('14:30'), '철수 완료 시간이 표시되어야 합니다.');
assert.ok(modalHtml.includes('카카오톡 브리핑 링크 복사'), '카카오톡 브리핑 링크 복사 버튼이 제공되어야 합니다.');
console.log('✓ [PASS] FirstBirthdayEventDetailModal 플래너 ID, [확정 예정 수수료], 버퍼 시간 및 카톡 링크 복사 버튼 렌더링 검증 완료');

// 2. VenueProfileSettingCard SSR 검증 (지역화폐 설정 및 제휴업체 관리 폼 렌더링)
const cardHtml = renderToString(
  React.createElement(VenueProfileSettingCard, {
    profile: mockProfilePublic,
    onUpdateProfile: () => {},
  })
);
assert.ok(cardHtml.includes('라온제나 돌잔치 파티하우스'), '업체명이 표시되어야 합니다.');
assert.ok(cardHtml.includes('플래너 제휴 수수료 정책 설정'), '수수료 설정 섹션이 표시되어야 합니다.');
assert.ok(cardHtml.includes('건당 정액제'), '정액제 옵션이 표시되어야 합니다.');
assert.ok(cardHtml.includes('익월 10일'), '업계 표준 익월 10일 정산 옵션이 표시되어야 합니다.');
assert.ok(cardHtml.includes('지역화폐 및 결제 수단 지원 안내 설정'), '지역화폐 설정 섹션이 표시되어야 합니다.');
assert.ok(cardHtml.includes('베뉴 공식 제휴업체 관리'), '제휴업체 관리 섹션이 표시되어야 합니다.');
assert.ok(cardHtml.includes('수려한 전통돌상'), '제휴업체 목록에 돌상 업체가 렌더링되어야 합니다.');
assert.ok(cardHtml.includes('돌상 10% 제휴 할인'), '제휴업체 혜택이 렌더링되어야 합니다.');
console.log('✓ [PASS] VenueProfileSettingCard 수수료 정책, 결제 수단 및 제휴업체 관리 폼 렌더링 검증 완료');

// 3. PlannerAvailabilityCalendar SSR 검증 (예약 슬롯 내 플래너 및 수수료, 세팅/철수 버퍼 표시)
const slots = calculateVenueAvailability(mockProfilePublic, '2026-11-28', [mockEvent]);
const calendarHtml = renderToString(
  React.createElement(PlannerAvailabilityCalendar, {
    venue: mockProfilePublic,
    slots,
    events: [mockEvent],
    selectedDate: '2026-11-28',
    onDateChange: () => {},
  })
);
assert.ok(calendarHtml.includes('예약 확정'), '예약된 일정 슬롯에는 [예약 확정] 뱃지가 표시되어야 합니다.');
assert.ok(calendarHtml.includes('박지민'), '예약 슬롯에 담당 플래너 이름이 표시되어야 합니다.');
assert.ok(calendarHtml.includes('pl_042'), '예약 슬롯에 플래너 ID가 표시되어야 합니다.');
assert.ok(calendarHtml.includes('150,000'), '예약 슬롯에 수수료가 표시되어야 합니다.');
assert.ok(calendarHtml.includes('세팅:'), '예약 슬롯에 세팅 레이블이 표시되어야 합니다.');
assert.ok(calendarHtml.includes('10:30'), '예약 슬롯에 세팅 시작 버퍼 시간이 표시되어야 합니다.');
assert.ok(calendarHtml.includes('철수:'), '예약 슬롯에 철수 레이블이 표시되어야 합니다.');
assert.ok(calendarHtml.includes('14:30'), '예약 슬롯에 철수 완료 버퍼 시간이 표시되어야 합니다.');
console.log('✓ [PASS] PlannerAvailabilityCalendar 플래너 ID, 수수료 슬롯 및 세팅/철수 버퍼 렌더링 검증 완료');

// 4. PlannerVenueDirectory SSR 검증 (지역화폐 뱃지, 세일즈 팁, 공식 제휴업체 탭 렌더링)
const directoryHtml = renderToString(
  React.createElement(PlannerVenueDirectory, {
    venues: [mockProfilePublic, mockProfilePrivate],
    events: [mockEvent],
  })
);
assert.ok(
  directoryHtml.includes('성사 수수료: 건당 ₩150,000'),
  '업체 카드에 성사 수수료 배너가 표시되어야 합니다.'
);
assert.ok(
  directoryHtml.includes('비선호 타임 성사 시'),
  '비선호 타임 추가 보너스 안내가 표시되어야 합니다.'
);
assert.ok(
  !directoryHtml.includes('비공개 시크릿 파티룸'),
  '비공개로 선택한 업체는 플래너 디렉토리에 일절 노출되지 않아야 합니다.'
);
// [신규 요구사항 1] 지역화폐 시각적 뱃지 노출 검증 (구체적 할인율 수치 제외)
assert.ok(
  directoryHtml.includes('💚 서울페이 결제 가능'),
  '베뉴 카드 상단에 [💚 서울페이 결제 가능] 뱃지가 표시되어야 합니다.'
);
assert.ok(
  !directoryHtml.includes('10% 결제 가능'),
  '할인율 변동 가능성을 고려하여 뱃지에 특정 할인율 수치는 노출되지 않아야 합니다.'
);
assert.ok(
  directoryHtml.includes('온누리상품권'),
  '온누리상품권 지원 뱃지가 표시되어야 합니다.'
);
// [신규 요구사항 2] 플래너 세일즈 팁 박스 검증
assert.ok(
  directoryHtml.includes('플래너 세일즈 팁:'),
  '플래너 고객 상담용 세일즈 팁 박스가 제공되어야 합니다.'
);
assert.ok(
  directoryHtml.includes('공식 제휴업체 리스트'),
  '상단 탭에 공식 제휴업체 리스트 버튼이 제공되어야 합니다.'
);
console.log('✓ [PASS] PlannerVenueDirectory 지역화폐 뱃지, 세일즈 팁 및 공식 제휴업체 버튼 렌더링 검증 완료');

// 5. PlannerSettlementDashboard SSR 검증 (D-Day 행사 완료 후 익월 정산 & 적립 지갑 뷰)
const dashboardHtml = renderToString(
  React.createElement(PlannerSettlementDashboard, {
    plannerId: 'pl_042',
    events: [mockEvent],
    venues: [mockProfilePublic],
  })
);
assert.ok(dashboardHtml.includes('D-Day 행사 완료 후 익월 정산'), '업계 표준 원칙 배너가 표시되어야 합니다.');
assert.ok(dashboardHtml.includes('확정 예정 수수료'), '확정 예정 수수료 카드가 표시되어야 합니다.');
assert.ok(dashboardHtml.includes('pl_042'), '플래너 본인 식별자가 표시되어야 합니다.');
assert.ok(dashboardHtml.includes('150,000'), '총 누적 성사 수수료가 표시되어야 합니다.');
assert.ok(dashboardHtml.includes('서윤이의 첫돌 잔치'), '귀속된 예약 건이 목록에 표시되어야 합니다.');
assert.ok(dashboardHtml.includes('익월 10일 정산'), '정산 타임라인 프로그레스 바가 표시되어야 합니다.');
console.log('✓ [PASS] PlannerSettlementDashboard D-Day 적립 지갑 뷰 렌더링 검증 완료');

// 6. MobileEventBriefingView SSR 검증 (게스트/스태프용 브리핑 뷰 & 개인정보 보호)
const sanitizedBriefingData = sanitizeForPublicBriefing(mockEvent, mockProfilePublic);
const briefingHtml = renderToString(
  React.createElement(MobileEventBriefingView, {
    data: sanitizedBriefingData,
  })
);
assert.ok(briefingHtml.includes('윤서윤'), '브리핑 뷰에 아기 이름이 포함되어야 합니다.');
assert.ok(briefingHtml.includes('아기 첫돌 잔치'), '브리핑 뷰 헤더에 아기 첫돌 안내가 포함되어야 합니다.');
assert.ok(briefingHtml.includes('서윤이의 첫돌 잔치'), '행사 타이틀이 표시되어야 합니다.');
assert.ok(briefingHtml.includes('11:30'), '본 행사 시작 시간이 표시되어야 합니다.');
assert.ok(briefingHtml.includes('14:00'), '본 행사 종료 시간이 표시되어야 합니다.');
assert.ok(briefingHtml.includes('10:30'), '스태프/플래너 세팅 가능 시작 시간이 표시되어야 합니다.');
assert.ok(briefingHtml.includes('입실 가능'), '세팅 입실 가능 안내 문구가 표시되어야 합니다.');
assert.ok(briefingHtml.includes('돌잔치 진행 식순'), '돌잔치 진행 식순 섹션이 표시되어야 합니다.');
assert.ok(briefingHtml.includes('5단계 타임라인'), '5단계 타임라인 문구가 표시되어야 합니다.');
assert.ok(briefingHtml.includes('돌잡이 이벤트'), '식순에 돌잡이 단계가 포함되어야 합니다.');
assert.ok(briefingHtml.includes('파티룸 이용 규정 및 유의사항'), '파티룸 이용 규정 섹션이 표시되어야 합니다.');
assert.ok(briefingHtml.includes('무흔적'), '벽면 데코 규정이 표시되어야 합니다.');
assert.ok(briefingHtml.includes('오시는 길'), '오시는 길 안내가 표시되어야 합니다.');
assert.ok(briefingHtml.includes('주차 정보:'), '주차 안내가 표시되어야 합니다.');
assert.ok(briefingHtml.includes('동시 120대 무료 주차'), '주차 상세 안내가 표시되어야 합니다.');
assert.ok(briefingHtml.includes('카카오톡 브리핑 링크 복사'), '원클릭 링크 복사 버튼이 제공되어야 합니다.');

// 개인정보 및 내부 정산 보호 검증: 게스트 브리핑 뷰에 수수료나 플래너 내부 정보가 누출되지 않아야 함
assert.ok(!briefingHtml.includes('150,000원'), '게스트용 브리핑 화면에 수수료 금액이 노출되지 않아야 합니다.');
assert.ok(!briefingHtml.includes('pl_042'), '게스트용 브리핑 화면에 플래너 고유 ID가 노출되지 않아야 합니다.');
console.log('✓ [PASS] MobileEventBriefingView 식순 타임라인, 버퍼 안내, 파티룸 규정 및 개인정보 보호 SSR 렌더링 검증 완료');

console.log('🎉 모든 돌잔치 프리셋 및 플래너 수수료 정책/귀속, 제휴업체 및 지역화폐 컴포넌트 통합 테스트 100% 통과!');
