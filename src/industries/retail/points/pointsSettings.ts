import type { AcademySettings } from '@/types';
import {
  clampEarnRatePercent,
  computeEarnPoints,
  POINT_WON_VALUE as CORE_POINT_WON,
  POINTS_EARN_RATE_MAX as CORE_RATE_MAX,
  POINTS_EARN_RATE_MIN as CORE_RATE_MIN,
  POINTS_EARN_ROUNDING,
} from '@/capabilities/commerce';

/** 1P = 1원 (고정, DB 저장 안 함) */
export const POINT_WON_VALUE = CORE_POINT_WON;

export const POINTS_EARN_RATE_MIN = CORE_RATE_MIN;
export const POINTS_EARN_RATE_MAX = CORE_RATE_MAX;
/** 소수 첫째 자리까지 허용 (예: 1.0) */
export const POINTS_EARN_RATE_STEP = 0.1;
export const POINTS_EARN_RATE_DEFAULT = 1;

export { POINTS_EARN_ROUNDING, computeEarnPoints };

export interface RetailPointsSettings {
  /** 포인트 사용 */
  enabled: boolean;
  /** 포인트 적립 */
  earnEnabled: boolean;
  /** 기본 적립률(%) */
  earnRatePercent: number;
}

export const DEFAULT_RETAIL_POINTS_SETTINGS: RetailPointsSettings = {
  enabled: false,
  earnEnabled: false,
  earnRatePercent: POINTS_EARN_RATE_DEFAULT,
};

export function getRetailPointsSettings(
  settings: AcademySettings | null | undefined
): RetailPointsSettings {
  const raw = settings?.features?.points;
  const rate = Number(raw?.earnRatePercent);
  return {
    enabled: raw?.enabled === true,
    earnEnabled: raw?.earnEnabled === true,
    earnRatePercent: Number.isFinite(rate)
      ? clampEarnRate(rate)
      : POINTS_EARN_RATE_DEFAULT,
  };
}

export function withRetailPointsSettings(
  settings: AcademySettings,
  points: RetailPointsSettings
): AcademySettings {
  const normalized = normalizeRetailPointsSettings(points);
  return {
    ...settings,
    features: {
      ...settings.features,
      points: {
        enabled: normalized.enabled,
        earnEnabled: normalized.enabled ? normalized.earnEnabled : false,
        earnRatePercent: normalized.earnRatePercent,
      },
    },
  };
}

/** 적립률 반올림(소수 1자리) + min/max */
export function clampEarnRate(value: number): number {
  return clampEarnRatePercent(value, POINTS_EARN_RATE_DEFAULT);
}

export function normalizeRetailPointsSettings(
  input: Partial<RetailPointsSettings>
): RetailPointsSettings {
  const enabled = input.enabled === true;
  const earnEnabled = enabled && input.earnEnabled === true;
  return {
    enabled,
    earnEnabled,
    earnRatePercent: clampEarnRate(
      input.earnRatePercent == null
        ? POINTS_EARN_RATE_DEFAULT
        : Number(input.earnRatePercent)
    ),
  };
}

/**
 * 폼 검증. 통과 시 null, 실패 시 메시지.
 */
export function validateRetailPointsSettings(
  input: Partial<RetailPointsSettings>
): string | null {
  if (input.earnRatePercent == null || Number.isNaN(Number(input.earnRatePercent))) {
    return '적립률을 입력해 주세요.';
  }
  const rate = Number(input.earnRatePercent);
  if (!Number.isFinite(rate)) {
    return '적립률은 숫자여야 합니다.';
  }
  if (rate < POINTS_EARN_RATE_MIN || rate > POINTS_EARN_RATE_MAX) {
    return `적립률은 ${POINTS_EARN_RATE_MIN}% ~ ${POINTS_EARN_RATE_MAX}% 사이여야 합니다.`;
  }
  if (Math.round(rate * 10) / 10 !== rate) {
    return '적립률은 소수 첫째 자리까지만 입력할 수 있습니다.';
  }
  return null;
}

/** 예시: 10,000원 × 1% = 100P (표시용) */
export function exampleEarnPoints(amountWon: number, ratePercent: number): number {
  return computeEarnPoints(amountWon, ratePercent);
}
