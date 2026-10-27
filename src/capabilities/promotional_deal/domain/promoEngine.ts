/**
 * 기간 한정 특가 & 이벤트 스케줄러 도메인 엔진 (Pure Functions)
 *
 * Core-Capability-Preset 3계층 아키텍처 및 비용 0원 원칙 준수:
 * 백그라운드 Cron 스케줄러 없이 현재 시각(Date)을 기반으로 순수 함수를 통해
 * 조회 시점에 유효 가격, 할인율, 한정 수량 소진 여부를 실시간 판정합니다.
 */

export type PromoTargetType = 'PASS' | 'RETAIL';

export interface PromotionalDeal {
  id: string;
  tenant_id: string;
  title: string;
  target_type: PromoTargetType;
  target_id: string;
  original_price: number;
  special_price: number;
  start_at: string | Date;
  end_at: string | Date;
  limited_quantity: number | null;
  sold_quantity: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PromoDraft {
  title: string;
  target_type: PromoTargetType;
  target_id: string;
  original_price: number;
  special_price: number;
  start_at: string | Date;
  end_at: string | Date;
  limited_quantity?: number | null;
  is_active?: boolean;
}

export type PromoStatus =
  | 'UPCOMING'  // 시작 전 대기
  | 'ACTIVE'    // 진행 중 특가 적용
  | 'EXPIRED'   // 기간 만료
  | 'SOLD_OUT'  // 한정 수량 완판
  | 'INACTIVE'  // 조기 마감/비활성화
  | 'NO_DEAL';  // 특가 정책 없음

export interface PriceResolutionResult {
  currentPrice: number;
  isDiscounted: boolean;
  discountRate: number; // 0 ~ 100 (%) 반올림 정수
  activeDeal: PromotionalDeal | null;
  status: PromoStatus;
  statusLabel: string;
}

/**
 * 프로모션의 현재 시점 활성 상태 상세 판정
 */
export function getPromotionStatus(
  promo: PromotionalDeal | null | undefined,
  currentTime: Date = new Date()
): PromoStatus {
  if (!promo) {
    return 'NO_DEAL';
  }

  if (!promo.is_active) {
    return 'INACTIVE';
  }

  // 한정 수량 완판 여부 체크
  if (promo.limited_quantity !== null && promo.limited_quantity !== undefined) {
    if (promo.sold_quantity >= promo.limited_quantity) {
      return 'SOLD_OUT';
    }
  }

  const startMs = new Date(promo.start_at).getTime();
  const endMs = new Date(promo.end_at).getTime();
  const nowMs = currentTime.getTime();

  if (nowMs < startMs) {
    return 'UPCOMING';
  }

  if (nowMs > endMs) {
    return 'EXPIRED';
  }

  return 'ACTIVE';
}

/**
 * 프로모션 유효 여부 판정 (특가 적용 가능 여부)
 */
export function isPromotionActive(
  promo: PromotionalDeal | null | undefined,
  currentTime: Date = new Date()
): boolean {
  return getPromotionStatus(promo, currentTime) === 'ACTIVE';
}

/**
 * 상태 코드별 사용자/사업주 친화적 한글 라벨
 */
export function getPromoStatusLabel(status: PromoStatus): string {
  switch (status) {
    case 'ACTIVE':
      return '진행 중 특가';
    case 'UPCOMING':
      return '시작 전 대기';
    case 'EXPIRED':
      return '이벤트 종료';
    case 'SOLD_OUT':
      return '선착순 완판';
    case 'INACTIVE':
      return '조기 마감';
    case 'NO_DEAL':
      return '정가 판매';
  }
}

/**
 * 현재 시각 기준 실제 청구 가격 및 할인율(%) 실시간 판정
 */
export function resolveCurrentPrice(
  originalPrice: number,
  promo: PromotionalDeal | null | undefined,
  currentTime: Date = new Date()
): PriceResolutionResult {
  const status = getPromotionStatus(promo, currentTime);
  const statusLabel = getPromoStatusLabel(status);

  if (status === 'ACTIVE' && promo) {
    const specialPrice = Math.max(0, promo.special_price);
    const isDiscounted = specialPrice < originalPrice;
    const discountRate =
      originalPrice > 0 && isDiscounted
        ? Math.round(((originalPrice - specialPrice) / originalPrice) * 100)
        : 0;

    return {
      currentPrice: specialPrice,
      isDiscounted,
      discountRate,
      activeDeal: promo,
      status: 'ACTIVE',
      statusLabel,
    };
  }

  return {
    currentPrice: originalPrice,
    isDiscounted: false,
    discountRate: 0,
    activeDeal: null,
    status,
    statusLabel,
  };
}

/**
 * 프로모션 초안(Draft) 입력값 유효성 검증
 */
export function validatePromoDraft(draft: PromoDraft): { isValid: boolean; error?: string } {
  if (!draft.title || draft.title.trim().length === 0) {
    return { isValid: false, error: '이벤트 제목을 입력해 주세요.' };
  }

  if (!draft.target_type || !['PASS', 'RETAIL'].includes(draft.target_type)) {
    return { isValid: false, error: '할인 대상을 올바르게 선택해 주세요.' };
  }

  if (!draft.target_id) {
    return { isValid: false, error: '할인 대상 품목을 선택해 주세요.' };
  }

  if (typeof draft.original_price !== 'number' || draft.original_price < 0) {
    return { isValid: false, error: '정가는 0원 이상이어야 합니다.' };
  }

  if (typeof draft.special_price !== 'number' || draft.special_price < 0) {
    return { isValid: false, error: '특가는 0원 이상이어야 합니다.' };
  }

  if (draft.special_price > draft.original_price) {
    return { isValid: false, error: '특가(할인가)는 정가보다 높을 수 없습니다.' };
  }

  const start = new Date(draft.start_at);
  const end = new Date(draft.end_at);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: '유효한 시작 및 종료 일시를 입력해 주세요.' };
  }

  if (start.getTime() >= end.getTime()) {
    return { isValid: false, error: '종료 일시는 시작 일시보다 이후여야 합니다.' };
  }

  if (draft.limited_quantity !== undefined && draft.limited_quantity !== null) {
    if (draft.limited_quantity <= 0) {
      return { isValid: false, error: '한정 판매 수량은 1개 이상이어야 합니다.' };
    }
  }

  return { isValid: true };
}

/**
 * 잔여 한정 수량 및 소진율 계산 (UI 프로그레스 바용)
 */
export function calculateRemainingQuantity(promo: PromotionalDeal): {
  remaining: number | null;
  isSoldOut: boolean;
  percentSold: number;
} {
  if (promo.limited_quantity === null || promo.limited_quantity === undefined) {
    return { remaining: null, isSoldOut: false, percentSold: 0 };
  }

  const remaining = Math.max(0, promo.limited_quantity - promo.sold_quantity);
  const isSoldOut = remaining === 0;
  const percentSold =
    promo.limited_quantity > 0
      ? Math.min(100, Math.round((promo.sold_quantity / promo.limited_quantity) * 100))
      : 100;

  return { remaining, isSoldOut, percentSold };
}
