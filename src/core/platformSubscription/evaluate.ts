/**
 * tenant 단위 feature gate.
 * industry_type / 업종 플러그인을 읽지 않는다.
 */
import {
  ENTITLED_BILLING_STATUSES,
  PLATFORM_FEATURE_KEYS,
  type PlatformFeatureKey,
  type PlatformFeatureMap,
  type ResolveEntitlementInput,
} from './types';

export function isPlatformFeatureKey(value: string): value is PlatformFeatureKey {
  return (PLATFORM_FEATURE_KEYS as readonly string[]).includes(value);
}

export function emptyFeatureMap(): PlatformFeatureMap {
  return {
    booking: false,
    loyalty: false,
    maintenance: false,
  };
}

export function isEntitledBillingStatus(status: string): boolean {
  return (ENTITLED_BILLING_STATUSES as readonly string[]).includes(status);
}

export function resolveFeatureMap(input: ResolveEntitlementInput): PlatformFeatureMap {
  const map = emptyFeatureMap();
  const sub = input.subscription;
  if (!sub) return map;
  if (sub.organizationId !== input.organizationId) return map;
  if (!isEntitledBillingStatus(sub.billingStatus)) return map;

  for (const entitlement of input.planEntitlements) {
    if (entitlement.planId !== sub.planId) continue;
    if (!isPlatformFeatureKey(entitlement.featureKey)) continue;
    map[entitlement.featureKey] = entitlement.enabled;
  }

  for (const item of input.items) {
    if (item.subscriptionId !== sub.id) continue;
    if (item.organizationId !== input.organizationId) continue;
    if (!isPlatformFeatureKey(item.featureKey)) continue;
    map[item.featureKey] = item.enabled;
  }

  return map;
}

export function isFeatureEnabled(
  input: ResolveEntitlementInput,
  featureKey: string
): boolean {
  if (!isPlatformFeatureKey(featureKey)) return false;
  return resolveFeatureMap(input)[featureKey];
}
