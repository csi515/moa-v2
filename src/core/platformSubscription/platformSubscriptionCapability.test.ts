/**
 * Platform SaaS 구독 경계.
 * 실행: npm run test:platform-subscription
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isFeatureEnabled, resolveFeatureMap } from './evaluate';
import { platformSubscriptionCapability } from './platformSubscriptionCapability';
import type {
  PlatformFeatureEntitlement,
  PlatformSubscription,
  PlatformSubscriptionItem,
  ResolveEntitlementInput,
} from './types';
import { INDUSTRY_PLUGIN_AXIS, PLATFORM_ENTITLEMENT_AXIS, PLATFORM_FEATURE_KEYS } from './types';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');

const PLAN_STANDARD = 'plan-standard';
const PLAN_OPS = 'plan-operations';

const PLAN_ENTS: PlatformFeatureEntitlement[] = [
  { planId: PLAN_STANDARD, featureKey: 'booking', enabled: true },
  { planId: PLAN_STANDARD, featureKey: 'loyalty', enabled: true },
  { planId: PLAN_STANDARD, featureKey: 'maintenance', enabled: false },
  { planId: PLAN_OPS, featureKey: 'booking', enabled: true },
  { planId: PLAN_OPS, featureKey: 'loyalty', enabled: false },
  { planId: PLAN_OPS, featureKey: 'maintenance', enabled: true },
];

function subscription(
  organizationId: string,
  planId: string,
  billingStatus: string,
  id = `${organizationId}-sub`
): PlatformSubscription {
  return {
    id,
    organizationId,
    planId,
    billingStatus,
    startsAt: '2026-09-01T00:00:00.000Z',
    endsAt: null,
  };
}

function snapshot(
  organizationId: string,
  sub: PlatformSubscription | null,
  items: PlatformSubscriptionItem[] = []
): ResolveEntitlementInput {
  return {
    organizationId,
    subscription: sub,
    planEntitlements: PLAN_ENTS,
    items,
  };
}

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walkTs(full, acc);
      continue;
    }
    if ((name.endsWith('.ts') || name.endsWith('.tsx')) && !name.endsWith('.test.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function run() {
  assert.deepEqual([...PLATFORM_FEATURE_KEYS], ['booking', 'loyalty', 'maintenance']);
  assert.equal(platformSubscriptionCapability.axes.industryPlugin, INDUSTRY_PLUGIN_AXIS);
  assert.equal(platformSubscriptionCapability.axes.entitlement, PLATFORM_ENTITLEMENT_AXIS);
  assert.notEqual(INDUSTRY_PLUGIN_AXIS, PLATFORM_ENTITLEMENT_AXIS);

  const orgA = snapshot('org-a', subscription('org-a', PLAN_STANDARD, 'active'));
  const mapA = resolveFeatureMap(orgA);
  assert.equal(mapA.booking, true);
  assert.equal(mapA.loyalty, true);
  assert.equal(mapA.maintenance, false);

  const orgB = snapshot('org-b', subscription('org-b', PLAN_OPS, 'active'));
  const mapB = resolveFeatureMap(orgB);
  assert.equal(mapB.booking, true);
  assert.equal(mapB.loyalty, false);
  assert.equal(mapB.maintenance, true);

  assert.equal(isFeatureEnabled(orgA, 'loyalty'), true);
  assert.equal(isFeatureEnabled(orgB, 'loyalty'), false);
  assert.equal(isFeatureEnabled(orgA, 'unknown'), false);

  const none = resolveFeatureMap(snapshot('org-c', null));
  assert.deepEqual(none, { booking: false, loyalty: false, maintenance: false });

  const canceled = resolveFeatureMap(
    snapshot('org-a', subscription('org-a', PLAN_STANDARD, 'canceled'))
  );
  assert.deepEqual(canceled, { booking: false, loyalty: false, maintenance: false });

  const overridden = resolveFeatureMap(
    snapshot('org-a', subscription('org-a', PLAN_STANDARD, 'active'), [
      {
        organizationId: 'org-a',
        subscriptionId: 'org-a-sub',
        featureKey: 'loyalty',
        enabled: false,
      },
      {
        organizationId: 'org-a',
        subscriptionId: 'org-a-sub',
        featureKey: 'maintenance',
        enabled: true,
      },
    ])
  );
  assert.equal(overridden.booking, true);
  assert.equal(overridden.loyalty, false);
  assert.equal(overridden.maintenance, true);

  const leaked = resolveFeatureMap({
    organizationId: 'org-a',
    subscription: subscription('org-b', PLAN_OPS, 'active'),
    planEntitlements: PLAN_ENTS,
    items: [],
  });
  assert.deepEqual(leaked, { booking: false, loyalty: false, maintenance: false });

  const foreignItem = resolveFeatureMap(
    snapshot('org-a', subscription('org-a', PLAN_STANDARD, 'active'), [
      {
        organizationId: 'org-b',
        subscriptionId: 'org-a-sub',
        featureKey: 'maintenance',
        enabled: true,
      },
    ])
  );
  assert.equal(foreignItem.maintenance, false);

  const industryOffersBooking = true;
  assert.equal(industryOffersBooking && mapA.booking, true);
  assert.equal(industryOffersBooking && mapB.booking, true);
  assert.notEqual(mapA.loyalty, mapB.loyalty);
  assert.notEqual(mapA.maintenance, mapB.maintenance);

  for (const file of walkTs(join(here))) {
    const src = readFileSync(file, 'utf8');
    assert.doesNotMatch(src, /from '@\/modules\//);
    assert.doesNotMatch(src, /from '@\/core\/industry/);
    assert.doesNotMatch(src, /from '@\/core\/schedules/);
    assert.doesNotMatch(src, /from '@\/core\/sales'|from '@\/core\/finance'|from '@\/core\/loyalty'/);
    assert.doesNotMatch(src, /stripe|tosspayments|iamport|portone/i);
  }

  const sql = readFileSync(
    join(root, 'supabase/migrations/20260924340000_platform_subscription_entitlement.sql'),
    'utf8'
  );
  assert.match(sql, /CREATE SCHEMA IF NOT EXISTS platform/);
  assert.match(sql, /CREATE TABLE platform\.plans/);
  assert.match(sql, /CREATE TABLE platform\.subscriptions/);
  assert.match(sql, /CREATE TABLE platform\.subscription_items/);
  assert.match(sql, /CREATE TABLE platform\.feature_entitlements/);
  assert.match(sql, /billing_status/);
  assert.match(sql, /organization_id UUID NOT NULL REFERENCES core\.organizations/);
  assert.match(sql, /platform\.is_feature_enabled/);
  assert.match(sql, /INSERT INTO platform\.plans/);
  assert.doesNotMatch(sql, /ALTER TABLE core\.(session_passes|sales|payments|membership)/);
  assert.doesNotMatch(sql, /CREATE TABLE core\.(session_passes|sales|payments)/);
  assert.doesNotMatch(sql, /stripe|tosspayments|iamport|portone/i);
  assert.doesNotMatch(sql, /industry_type/);

  console.log('platformSubscriptionCapability.test.ts: ok');
}

run();
