/**
 * 포인트 적립 계산 정책 (과거 거래 재계산 금지 — 거래 시점 스냅샷만 유효).
 */

/** 1P = 1원 (고정) */
export const POINT_WON_VALUE = 1;

/** 소수점 정책: 내림(floor). 정수 포인트만 적립. */
export const POINTS_EARN_ROUNDING = 'floor' as const;

export const POINTS_EARN_RATE_MIN = 0;
export const POINTS_EARN_RATE_MAX = 100;

export function clampEarnRatePercent(value: number, fallback = 1): number {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.round(value * 10) / 10;
  return Math.min(POINTS_EARN_RATE_MAX, Math.max(POINTS_EARN_RATE_MIN, rounded));
}

/**
 * 적립 포인트 = floor(적립 대상 결제금액 × 적립률 / 100)
 * 예: 30,000원 × 1% → 300P / 9,999원 × 1% → 99P
 */
export function computeEarnPoints(eligibleAmountWon: number, ratePercent: number): number {
  const amount = Math.max(0, Number(eligibleAmountWon));
  const rate = clampEarnRatePercent(Number(ratePercent), 0);
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || rate <= 0 || amount <= 0) {
    return 0;
  }
  return Math.floor((amount * rate) / 100);
}

/** organizations.settings.features.points 최소 해석 */
export function readOrgPointsEarnConfig(settings: unknown): {
  enabled: boolean;
  earnEnabled: boolean;
  earnRatePercent: number;
} {
  const root =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : {};
  const features =
    root.features && typeof root.features === 'object' && !Array.isArray(root.features)
      ? (root.features as Record<string, unknown>)
      : {};
  const points =
    features.points && typeof features.points === 'object' && !Array.isArray(features.points)
      ? (features.points as Record<string, unknown>)
      : {};

  const rate = Number(points.earnRatePercent);
  return {
    enabled: points.enabled === true,
    earnEnabled: points.earnEnabled === true,
    earnRatePercent: Number.isFinite(rate) ? clampEarnRatePercent(rate) : 1,
  };
}
