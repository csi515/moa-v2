/**
 * 모바일 전자 스탬프 / 칭찬 스티커 보드 도메인 엔진 (Pure Functions)
 *
 * 적용 대상:
 *  - 카페/음료: 음료 10잔 구매 시 아메리카노 1잔 무료 도장 판
 *  - 태권도/체육관: 10회 출석/선행 시 칭찬 스티커 판 완성 -> 승급 포인트 또는 선물 증정
 *  - 세차장/공방: 10회 이용 시 1회 무료 또는 왁스 코팅 서비스
 */

export type StampTriggerSource = 'MANUAL' | 'ATTENDANCE' | 'PURCHASE';

export interface StampRewardCoupon {
  id: string;
  couponName: string; // e.g. "무료 음료 1잔 교환권", "달란트 100점 교환권", "1회 무료 수업권"
  boardId: string;
  customerId: string;
  issuedAt: string;
  expiresAt: string; // YYYY-MM-DD
  isRedeemed: boolean;
  redeemedAt?: string;
  convertedPassId?: string; // passes Capability 이용권 연동 ID
}

export interface StampBoard {
  id: string;
  customerId: string;
  customerName: string;
  boardTitle: string; // e.g. "단골 음료 스탬프 카드", "태권 열정 칭찬 스티커판"
  targetCount: number; // 목표 칸수 (예: 10칸, 12칸)
  currentCount: number; // 현재 찍힌 개수
  rewardTitle: string; // e.g. "아메리카노 1잔 무료", "칭찬 메달 & 달란트", "1회 무료 수강권"
  rewardCouponValidityDays: number; // 쿠폰 유효기간 (일)
  completedCount: number; // 스탬프 판 완성 누적 횟수
  updatedAt: string;
}

export interface StampActionResult {
  updatedBoard: StampBoard;
  isCompleted: boolean;
  issuedCoupon?: StampRewardCoupon;
  overflowStamps: number; // 목표 칸수 초과 달성분 (다음 판으로 이월)
  eventRecord?: StampEventRecord;
}

export interface StampEventRecord {
  id: string;
  boardId: string;
  customerId: string;
  source: StampTriggerSource;
  sourceReferenceId?: string; // attendance_id, order_id, sale_id
  stampsAdded: number;
  timestamp: string;
}

/** passes Capability 연동용 이용권 레코드 규격 */
export interface ConvertedPassRecord {
  id: string;
  organization_id: string;
  student_id: string;
  name: string;
  pass_type: 'COUNT' | 'PERIOD';
  remaining_count: number;
  total_count: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'depleted';
  notes: string;
}

/**
 * 1. 스탬프 날인 처리 (순수 함수)
 *    목표 칸수를 채우면 판을 완성하고 리워드 쿠폰 발급 및 다음 판 초기화
 */
export function stampCard(params: {
  board: StampBoard;
  addCount?: number;
  source?: StampTriggerSource;
  sourceReferenceId?: string;
  timestamp?: string;
}): StampActionResult {
  const {
    board,
    addCount = 1,
    source = 'MANUAL',
    sourceReferenceId,
    timestamp = new Date().toISOString(),
  } = params;

  if (addCount <= 0) {
    return {
      updatedBoard: board,
      isCompleted: false,
      overflowStamps: 0,
    };
  }

  const nextTotal = board.currentCount + addCount;
  const isCompleted = nextTotal >= board.targetCount;

  const eventRecord: StampEventRecord = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    boardId: board.id,
    customerId: board.customerId,
    source,
    sourceReferenceId,
    stampsAdded: addCount,
    timestamp,
  };

  if (isCompleted) {
    const overflow = nextTotal - board.targetCount;
    const completedRounds = board.completedCount + 1;

    const expiryDate = new Date(
      new Date(timestamp).getTime() + board.rewardCouponValidityDays * 24 * 3600 * 1000
    )
      .toISOString()
      .slice(0, 10);

    const coupon: StampRewardCoupon = {
      id: `cpn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      couponName: board.rewardTitle,
      boardId: board.id,
      customerId: board.customerId,
      issuedAt: timestamp,
      expiresAt: expiryDate,
      isRedeemed: false,
    };

    const updatedBoard: StampBoard = {
      ...board,
      currentCount: overflow, // 다음 판으로 이월된 잔여 스탬프
      completedCount: completedRounds,
      updatedAt: timestamp,
    };

    return {
      updatedBoard,
      isCompleted: true,
      issuedCoupon: coupon,
      overflowStamps: overflow,
      eventRecord,
    };
  }

  return {
    updatedBoard: {
      ...board,
      currentCount: nextTotal,
      updatedAt: timestamp,
    },
    isCompleted: false,
    overflowStamps: 0,
    eventRecord,
  };
}

/**
 * 2. 출석 이벤트 기반 스탬프 자동 적립 (순수 함수)
 *    이미 해당 출결 기록(attendanceId)으로 적립된 이력이 있으면 중복 적립 방지
 */
export function recordAttendanceStamp(params: {
  board: StampBoard;
  attendanceId: string;
  processedEventIds?: string[];
  timestamp?: string;
}): { success: boolean; result?: StampActionResult; error?: string } {
  const { board, attendanceId, processedEventIds = [], timestamp = new Date().toISOString() } = params;

  if (processedEventIds.includes(attendanceId)) {
    return { success: false, error: 'ALREADY_PROCESSED_ATTENDANCE' };
  }

  const result = stampCard({
    board,
    addCount: 1,
    source: 'ATTENDANCE',
    sourceReferenceId: attendanceId,
    timestamp,
  });

  return { success: true, result };
}

/**
 * 3. 결제/구매 이벤트 기반 스탬프 자동 적립 (순수 함수)
 *    결제 금액에 따라 스탬프 개수 자동 계산 (예: unitAmountPerStamp = 5,000원당 1개)
 */
export function recordPurchaseStamp(params: {
  board: StampBoard;
  saleId: string;
  saleAmount: number;
  unitAmountPerStamp?: number; // 미지정 시 건당 1개
  processedSaleIds?: string[];
  timestamp?: string;
}): { success: boolean; result?: StampActionResult; stampsCalculated: number; error?: string } {
  const {
    board,
    saleId,
    saleAmount,
    unitAmountPerStamp,
    processedSaleIds = [],
    timestamp = new Date().toISOString(),
  } = params;

  if (processedSaleIds.includes(saleId)) {
    return { success: false, stampsCalculated: 0, error: 'ALREADY_PROCESSED_SALE' };
  }

  let addCount = 1;
  if (unitAmountPerStamp && unitAmountPerStamp > 0) {
    addCount = Math.floor(saleAmount / unitAmountPerStamp);
  }

  if (addCount <= 0) {
    return { success: false, stampsCalculated: 0, error: 'AMOUNT_BELOW_UNIT_THRESHOLD' };
  }

  const result = stampCard({
    board,
    addCount,
    source: 'PURCHASE',
    sourceReferenceId: saleId,
    timestamp,
  });

  return { success: true, result, stampsCalculated: addCount };
}

/**
 * 4. 리워드 쿠폰 -> passes (이용권/수강권) 자동 생성 연동 (순수 함수)
 */
export function convertRewardCouponToPass(params: {
  coupon: StampRewardCoupon;
  organizationId: string;
  validityDays?: number;
}): { passRecord: ConvertedPassRecord; updatedCoupon: StampRewardCoupon } {
  const { coupon, organizationId, validityDays = 30 } = params;

  const now = new Date();
  const startDate = now.toISOString().slice(0, 10);
  const endDate = new Date(now.getTime() + validityDays * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const passId = `pass-reward-${coupon.id}`;

  const passRecord: ConvertedPassRecord = {
    id: passId,
    organization_id: organizationId,
    student_id: coupon.customerId,
    name: `[스탬프달성] ${coupon.couponName}`,
    pass_type: 'COUNT',
    remaining_count: 1,
    total_count: 1,
    start_date: startDate,
    end_date: endDate,
    status: 'active',
    notes: `전자 스탬프 판 완성 보상으로 자동 발행 (쿠폰ID: ${coupon.id})`,
  };

  const updatedCoupon: StampRewardCoupon = {
    ...coupon,
    convertedPassId: passId,
  };

  return { passRecord, updatedCoupon };
}

/**
 * 5. 리워드 쿠폰 사용(소진) 처리 (순수 함수)
 */
export function redeemRewardCoupon(
  coupon: StampRewardCoupon,
  targetDate: string = new Date().toISOString().slice(0, 10)
): { updatedCoupon: StampRewardCoupon; success: boolean; error?: string } {
  if (coupon.isRedeemed) {
    return { updatedCoupon: coupon, success: false, error: 'ALREADY_REDEEMED' };
  }
  if (targetDate > coupon.expiresAt) {
    return { updatedCoupon: coupon, success: false, error: 'COUPON_EXPIRED' };
  }

  return {
    updatedCoupon: {
      ...coupon,
      isRedeemed: true,
      redeemedAt: new Date().toISOString(),
    },
    success: true,
  };
}

/**
 * 6. 신규 기본 스탬프 보드 생성 헬퍼
 */
export function createCustomerDefaultBoard(params: {
  customerId: string;
  customerName: string;
  templateType?: 'RETAIL_CAFE' | 'ACADEMY_PRAISE' | 'FITNESS_BEAUTY';
  customTitle?: string;
  targetCount?: number;
  rewardTitle?: string;
}): StampBoard {
  const {
    customerId,
    customerName,
    templateType = 'RETAIL_CAFE',
    customTitle,
    targetCount,
    rewardTitle,
  } = params;

  const now = new Date().toISOString();

  if (templateType === 'ACADEMY_PRAISE') {
    return {
      id: `board-${customerId}-${Date.now()}`,
      customerId,
      customerName,
      boardTitle: customTitle || '성실 출석 & 열정 칭찬 스티커판',
      targetCount: targetCount || 10,
      currentCount: 0,
      rewardTitle: rewardTitle || '칭찬 메달 & 1회 보강/원데이 수업권',
      rewardCouponValidityDays: 60,
      completedCount: 0,
      updatedAt: now,
    };
  }

  if (templateType === 'FITNESS_BEAUTY') {
    return {
      id: `board-${customerId}-${Date.now()}`,
      customerId,
      customerName,
      boardTitle: customTitle || 'VIP 정기 관리 스탬프 카드',
      targetCount: targetCount || 10,
      currentCount: 0,
      rewardTitle: rewardTitle || '1회 무료 전신 케어 / PT 1회권',
      rewardCouponValidityDays: 45,
      completedCount: 0,
      updatedAt: now,
    };
  }

  // RETAIL_CAFE 기본
  return {
    id: `board-${customerId}-${Date.now()}`,
    customerId,
    customerName,
    boardTitle: customTitle || '단골 감사 음료 스탬프 카드',
    targetCount: targetCount || 10,
    currentCount: 0,
    rewardTitle: rewardTitle || '제조 음료 1잔 무료 교환권',
    rewardCouponValidityDays: 30,
    completedCount: 0,
    updatedAt: now,
  };
}
