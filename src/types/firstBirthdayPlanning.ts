/**
 * 돌잔치·연회 전문점 (first_birthday_party) 전용 이벤트 기획 및 플래너 협업 도메인 모델
 */

/**
 * 플래너 제휴 수수료 정산 정책 타입
 */
export type PlannerCommissionType = 'FIXED_PER_BOOKING' | 'PERCENTAGE';

/**
 * 플래너 정산 상태
 */
export type CommissionSettlementStatus = 'PENDING_EVENT' | 'READY_TO_SETTLE' | 'SETTLED';

/**
 * 업계 표준 정산 지급 주기 규칙
 */
export type SettlementScheduleRule = 'NEXT_MONTH_10TH' | 'NEXT_MONTH_25TH' | 'AFTER_14_DAYS';

/**
 * 제휴 협력업체 카테고리 (돌상, 스냅, 사회자, 한복/드레스, 답례품/떡)
 */
export type PartnerVendorCategory =
  | 'DOLJABI_TABLE' // 돌상
  | 'SNAP_PHOTO' // 스냅
  | 'MC' // 사회자
  | 'ATTIRE' // 한복/드레스
  | 'FAVOR_GIFT'; // 답례품/떡

/**
 * 파티룸 공식 제휴업체 정보
 */
export interface VenuePartnerVendor {
  id: string;
  category: PartnerVendorCategory;
  vendorName: string; // e.g. "수려한 전통돌상", "기억 스냅"
  contactNumber: string; // 플래너/혼주 다이렉트 연락처 (e.g. "010-1234-5678")
  partnershipBenefit: string; // 베뉴 제휴 특별 혜택 (e.g. "식대 결제 시 돌상 10% 제휴 할인", "원판 1컷 무료")
  instagramUrl?: string; // 인스타그램 또는 포트폴리오 웹 링크
  description?: string; // 업체 상세 소개
}

/**
 * 지역화폐 및 결제 지원 옵션
 */
export interface VenuePaymentOptions {
  localCurrency?: {
    isAccepted: boolean;
    currencyName: string; // e.g. "서울페이", "경기지역화폐", "제로페이"
    discountRatePercent?: number; // e.g. 10 (10% 실질 할인 혜택)
    notice?: string; // e.g. "서울페이 10% 할인 구매 결제 가능 (월 발행한도 내)"
  };
  onnuriCertificate?: boolean; // 온누리상품권 사용 가능 여부
  zeroPayAccepted?: boolean; // 제로페이 사용 가능 여부
  cashReceiptOffered?: boolean; // 현금영수증/지출증빙 발행 여부
  creditCardAccepted?: boolean; // 신용카드 결제 가능 여부
}

/**
 * 비선호 타임 성사 보너스 티어
 */
export interface PlannerCommissionBonusTier {
  offPeakSlotBonusAmount: number;
  description?: string;
}

/**
 * 업체(베뉴)별 플래너 수수료 정책
 */
export interface PlannerCommissionPolicy {
  type: PlannerCommissionType;
  value: number;
  bonusTier?: PlannerCommissionBonusTier;
  settlementRule?: SettlementScheduleRule;
  payoutTermDays?: number;
  notice?: string;
}

/**
 * 파티룸 이용 규정 가이드 (벽면 부착, 외부 음식, 화기, 코키지)
 */
export interface VenueRulesDefinition {
  wallDecorPolicy: string; // e.g. "무흔적(블루텍/마스킹) 테이프만 허용, 압정 및 일반 테이프 금지"
  outsideFoodPolicy: string; // e.g. "수제 떡/과일/케이크 반입 무료, 1층 보관 냉장고 제공"
  firePolicy: string; // e.g. "안전을 위해 LED 촛불만 사용 가능 (화기 및 일반 성냥/초 금지)"
  corkagePolicy: string; // e.g. "와인 1병당 2만원, 잔 및 아이스버킷 기본 제공"
  cleaningGuideline?: string; // e.g. "퇴실 전 분리수거 및 돌상 원상복구 점검"
}

/**
 * 외부 반입 예정 물품 체크리스트
 */
export interface EventBringingItems {
  riceCakesFruits: boolean; // 외부 떡/과일
  customCake: boolean; // 생화/수제 케이크
  returnGifts: boolean; // 하객 답례품
  alcoholWine: boolean; // 외부 주류/와인
  customFlowerBalloons: boolean; // 커스텀 풍선/생화 오브제
  otherNotes?: string; // 기타 반입 요청사항
}

/**
 * 돌잔치 식순 진행 단계
 */
export interface FirstBirthdayProgramStep {
  stepOrder: number;
  time: string; // e.g. "11:30"
  title: string; // e.g. "하객 맞이 및 포토테이블 스냅 촬영"
  description?: string; // e.g. "입구 포토테이블 세팅 및 가족 원판 촬영"
}

/**
 * 돌상 스타일링 및 커스텀 옵션
 */
export interface FirstBirthdayStylingOptions {
  theme: 'TRADITIONAL' | 'MODERN_FLOWER' | 'SIMPLE_ELEGANT' | 'CUSTOM';
  backdropText: string;
  doljabiItems: string[];
  flowerColor?: string;
  specialNotes?: string;
}

/**
 * 외부 연계 서비스 (플래너 / 협력사)
 */
export interface FirstBirthdayExternalServices {
  mcIncluded: boolean;
  snapPhotographer: boolean;
  hanbokDressRental: boolean;
  favorGiftTable: boolean;
}

/**
 * 돌잔치 행사 상세 계획서 (행사 일시, 세팅/철수 버퍼, 반입 규정, 브리핑 링크 지원)
 */
export interface FirstBirthdayEventPlan {
  id: string;
  venueId: string;
  title: string;
  babyName: string;
  babyBirthDate: string; // YYYY-MM-DD
  eventDate: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "1부 (11:30~14:00)"
  roomId: string;
  roomName: string;
  guaranteedGuests: number;
  expectedGuests: number;
  highChairCount: number;

  // 1. 세팅 시작 및 철수 완료 버퍼 분리 관리
  eventStartTime?: string; // e.g. "11:30" (하객 입장 및 본 행사)
  eventEndTime?: string; // e.g. "14:00"
  setupStartTime?: string; // e.g. "10:30" (플래너/돌상 세팅 입실 가능 시간)
  teardownEndTime?: string; // e.g. "14:30" (물품 정리 및 최종 퇴실 완료)

  programSteps: FirstBirthdayProgramStep[];
  stylingOptions: FirstBirthdayStylingOptions;
  externalServices: FirstBirthdayExternalServices;

  // 2. 파티룸 이용 규정 및 반입 물품 체크리스트
  bringingItems?: EventBringingItems;
  venueRulesAgreed?: boolean; // 규정 사전 확인 및 동의 여부
  venueRulesAgreedAt?: string; // 동의 시각 ISO

  // 3. 모바일 원클릭 식순·안내 브리핑 공유 토큰
  shareToken?: string; // e.g. "brf_9f8a32"

  // 플래너 귀속 및 수수료 정산 연동 필드
  plannerId?: string;
  plannerName?: string;
  plannerAgency?: string;
  appliedCommissionType?: PlannerCommissionType;
  commissionAmount?: number;
  commissionBonusAmount?: number;
  settlementStatus?: CommissionSettlementStatus;
  estimatedTotalAmount?: number;

  plannerNotes?: string;
  status: 'INQUIRY' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

/**
 * 연회홀 / 룸 정보
 */
export interface VenueHallDetail {
  id: string;
  name: string;
  capacity: number;
  minGuaranteed: number;
  description: string;
  imageUrl?: string;
}

/**
 * 돌잔치 패키지 상품
 */
export interface VenuePartyPackage {
  id: string;
  name: string;
  pricePerPerson: number;
  rentalFee: number;
  badge?: string;
  features: string[];
}

/**
 * 업체 소개자료 및 공개 여부 프로필
 */
export interface VenueIntroductionProfile {
  venueId: string;
  venueName: string;
  category: string;
  tagline: string;
  description: string;
  coverImageUrl?: string;
  address?: string; // 베뉴 도로명 주소
  isProfilePublic: boolean;
  commissionPolicy?: PlannerCommissionPolicy;

  // 파티룸 이용 및 시설 규정
  venueRules?: VenueRulesDefinition;

  // 공식 제휴업체 목록 (돌상, 스냅, 사회자, 한복/드레스, 답례품/떡)
  partnerVendors?: VenuePartnerVendor[];

  // 지역화폐 및 결제 지원 옵션 (서울페이, 온누리상품권, 제로페이 등)
  paymentOptions?: VenuePaymentOptions;

  halls: VenueHallDetail[];
  packages: VenuePartyPackage[];
  amenities: {
    hasNursingRoom: boolean;
    hasElevator: boolean;
    parkingCapacity: string;
    transitNotice: string;
  };
  operatingSlots: Array<{
    slotId: string;
    label: string;
    startTime: string;
    endTime: string;
    defaultSetupMinutes?: number; // 기본 세팅 제공 시간 (기본 60분)
    defaultTeardownMinutes?: number; // 기본 철수 제공 시간 (기본 30분)
  }>;
}

/**
 * 플래너가 조회하는 타임슬롯별 가용성 현황
 */
export interface PlannerScheduleSlot {
  slotId: string;
  timeSlotLabel: string;
  startTime: string;
  endTime: string;
  setupStartTime?: string;
  teardownEndTime?: string;
  roomId: string;
  roomName: string;
  date: string;
  status: 'AVAILABLE' | 'BOOKED';
  eventSummary?: {
    eventId: string;
    title: string;
    babyName: string;
    guaranteedGuests: number;
    expectedGuests: number;
    programSummary: string;
    stylingTheme: string;
    plannerId?: string;
    plannerName?: string;
    commissionAmount?: number;
    settlementStatus?: CommissionSettlementStatus;
    setupStartTime?: string;
    teardownEndTime?: string;
  };
}
