/**
 * Platform SaaS subscription / entitlement boundary.
 * 업종 플러그인 활성화를 대체하지 않는다.
 */
import { isEntitledBillingStatus, isFeatureEnabled, resolveFeatureMap } from './evaluate';
import {
  ENTITLED_BILLING_STATUSES,
  INDUSTRY_PLUGIN_AXIS,
  PLATFORM_BILLING_STATUSES,
  PLATFORM_ENTITLEMENT_AXIS,
  PLATFORM_FEATURE_KEYS,
  PLATFORM_PLAN_CODES,
} from './types';

export const platformSubscriptionCapability = {
  features: PLATFORM_FEATURE_KEYS,
  plans: PLATFORM_PLAN_CODES,
  billingStatuses: PLATFORM_BILLING_STATUSES,
  entitledStatuses: ENTITLED_BILLING_STATUSES,
  axes: {
    industryPlugin: INDUSTRY_PLUGIN_AXIS,
    entitlement: PLATFORM_ENTITLEMENT_AXIS,
  },
  isBillingEntitled: isEntitledBillingStatus,
  resolve: resolveFeatureMap,
  isEnabled: isFeatureEnabled,
} as const;

export type PlatformSubscriptionCapability = typeof platformSubscriptionCapability;
