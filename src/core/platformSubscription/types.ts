/**
 * Moa Platform SaaS 구독.
 * 사업장 회원권/회차권(core.session_passes) · 매출 · 수강료와 다른 개념이다.
 */
import type {
  PlatformBillingStatus,
  PlatformFeatureKey,
} from '@/lib/supabase/database.types';

export type { PlatformBillingStatus, PlatformFeatureKey };

export const PLATFORM_FEATURE_KEYS = [
  'booking',
  'loyalty',
  'maintenance',
] as const satisfies readonly PlatformFeatureKey[];

export const PLATFORM_BILLING_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'paused',
  'canceled',
  'expired',
] as const satisfies readonly PlatformBillingStatus[];

/** 기능 사용을 허용하는 청구 상태. provider 연동 전 수동 값. */
export const ENTITLED_BILLING_STATUSES: readonly PlatformBillingStatus[] = [
  'trialing',
  'active',
  'past_due',
];

export const PLATFORM_PLAN_CODES = ['starter', 'standard', 'operations'] as const;

export type PlatformPlanCode = (typeof PLATFORM_PLAN_CODES)[number];

/** 업종 플러그인과 직교하는 활성화 축 */
export const INDUSTRY_PLUGIN_AXIS = 'industry_plugin' as const;
export const PLATFORM_ENTITLEMENT_AXIS = 'platform_entitlement' as const;

export type PlatformPlan = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type PlatformFeatureEntitlement = {
  planId: string;
  featureKey: string;
  enabled: boolean;
};

export type PlatformSubscription = {
  id: string;
  organizationId: string;
  planId: string;
  billingStatus: PlatformBillingStatus | string;
  startsAt: string;
  endsAt: string | null;
};

export type PlatformSubscriptionItem = {
  organizationId: string;
  subscriptionId: string;
  featureKey: string;
  enabled: boolean;
};

export type ResolveEntitlementInput = {
  organizationId: string;
  subscription: PlatformSubscription | null;
  planEntitlements: readonly PlatformFeatureEntitlement[];
  items: readonly PlatformSubscriptionItem[];
};

export type PlatformFeatureMap = Record<PlatformFeatureKey, boolean>;
