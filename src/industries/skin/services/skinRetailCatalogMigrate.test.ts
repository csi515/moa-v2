/**
 * Skin retailCatalog → Core 이관 계획·idempotent 복구 단위 테스트
 * 실행: npm run test:skin-retail-migrate
 */
import assert from 'node:assert/strict';
import type { RetailProduct } from '@/types';
import {
  SKIN_RETAIL_LEGACY_INBOUND_REASON,
  isSkinRetailCatalogItemFullyMigrated,
  isSkinRetailCatalogMigrationSettled,
  mergeMigratedProductIds,
  planSkinRetailCatalogItem,
  planSkinRetailCatalogMigration,
  readMigratedProductIdsForOrg,
  readOrgMigratedAt,
  type SkinRetailCatalogMigrateSnapshot,
} from './skinRetailCatalogMigratePlan';

type SimProduct = { id: string; name: string; price: number };
type SimState = {
  products: Map<string, SimProduct>;
  qty: Map<string, number>;
  legacyInbound: Set<string>;
  migratedIds: Set<string>;
  inboundLog: Array<{ productId: string; quantity: number; reason: string }>;
  /** org migration 완료 flag — settled 후에만 기록 */
  migratedAt: string | null;
};

function snapshotOf(state: SimState): SkinRetailCatalogMigrateSnapshot {
  return {
    existingProductIds: new Set(state.products.keys()),
    coreQuantityByProductId: new Map(state.qty),
    legacyInboundProductIds: new Set(state.legacyInbound),
    migratedProductIds: new Set(state.migratedIds),
  };
}

function catalogItem(plan: {
  productId: string;
  name: string;
  price: number;
  legacyStock: number;
}): Pick<RetailProduct, 'id' | 'name' | 'price' | 'stock'> {
  return {
    id: plan.productId,
    name: plan.name,
    price: plan.price,
    stock: plan.legacyStock,
  };
}

/**
 * migrateSkinRetailCatalogIfNeeded 핵심 루프를 인메모리로 재현.
 * - Product 메타와 재고 inbound 분리
 * - 항목 완료 마커는 fully migrated 후에만
 * - org migratedAt 은 전체 settled 후에만
 */
function simulateMigratePass(
  catalog: RetailProduct[],
  state: SimState,
  opts?: { failInboundForProductId?: string }
): {
  imported: number;
  inboundApplied: number;
  settled: boolean;
  alreadySettled: boolean;
} {
  let plans = planSkinRetailCatalogMigration(catalog, snapshotOf(state));

  // 완료 항목 마커 보강 (실서비스와 동일)
  for (const plan of plans) {
    if (
      isSkinRetailCatalogItemFullyMigrated(plan) &&
      !state.migratedIds.has(plan.productId)
    ) {
      state.migratedIds.add(plan.productId);
    }
  }
  plans = planSkinRetailCatalogMigration(catalog, snapshotOf(state));

  if (isSkinRetailCatalogMigrationSettled(plans)) {
    if (!state.migratedAt) {
      state.migratedAt = '2026-09-20T00:00:00.000Z';
    }
    return {
      imported: 0,
      inboundApplied: 0,
      settled: true,
      alreadySettled: true,
    };
  }

  let imported = 0;
  let inboundApplied = 0;

  for (const plan of plans) {
    try {
      if (plan.needCreateProduct) {
        state.products.set(plan.productId, {
          id: plan.productId,
          name: plan.name,
          price: plan.price,
        });
        imported += 1;
      } else if (plan.needSyncProductMeta) {
        const existing = state.products.get(plan.productId);
        if (existing) {
          existing.name = plan.name;
          existing.price = plan.price;
        }
      }

      if (plan.needInbound && plan.inboundQuantity > 0) {
        if (opts?.failInboundForProductId === plan.productId) {
          throw new Error(
            `Skin 상품 이관 실패: "${plan.name}" (${plan.productId}). simulated inbound failure`
          );
        }
        state.inboundLog.push({
          productId: plan.productId,
          quantity: plan.inboundQuantity,
          reason: SKIN_RETAIL_LEGACY_INBOUND_REASON,
        });
        state.qty.set(
          plan.productId,
          (state.qty.get(plan.productId) ?? 0) + plan.inboundQuantity
        );
        state.legacyInbound.add(plan.productId);
        inboundApplied += 1;
      }

      const afterItem = planSkinRetailCatalogItem(
        catalogItem(plan),
        snapshotOf(state)
      );
      if (afterItem && isSkinRetailCatalogItemFullyMigrated(afterItem)) {
        state.migratedIds.add(plan.productId);
      }
    } catch (err) {
      // 부분 진행만 유지 — migratedAt 기록 없음
      throw err;
    }
  }

  const after = planSkinRetailCatalogMigration(catalog, snapshotOf(state));
  const settled = isSkinRetailCatalogMigrationSettled(after);
  if (settled) {
    state.migratedAt = '2026-09-20T00:00:00.000Z';
  }
  return {
    imported,
    inboundApplied,
    settled,
    alreadySettled: false,
  };
}

function emptyState(): SimState {
  return {
    products: new Map(),
    qty: new Map(),
    legacyInbound: new Set(),
    migratedIds: new Set(),
    inboundLog: [],
    migratedAt: null,
  };
}

// ── 빈 catalog ────────────────────────────────────────────────────
{
  const catalog: RetailProduct[] = [];
  const plans = planSkinRetailCatalogMigration(catalog, {
    existingProductIds: new Set(),
    coreQuantityByProductId: new Map(),
    legacyInboundProductIds: new Set(),
    migratedProductIds: new Set(),
  });
  assert.equal(plans.length, 0);
  assert.equal(isSkinRetailCatalogMigrationSettled(plans), true);
}

// ── 1) 정상 최초 이관 ────────────────────────────────────────────
{
  const catalog: RetailProduct[] = [
    { id: 'p1', name: '세럼', price: 30000, stock: 5 },
    { id: 'p2', name: '크림', price: 45000, stock: 0 },
  ];
  const state = emptyState();
  assert.equal(state.migratedAt, null);

  const pass1 = simulateMigratePass(catalog, state);
  assert.equal(pass1.imported, 2);
  assert.equal(pass1.inboundApplied, 1);
  assert.equal(pass1.settled, true);
  assert.equal(pass1.alreadySettled, false);
  assert.equal(state.qty.get('p1'), 5);
  assert.equal(state.qty.get('p2') ?? 0, 0);
  assert.ok(state.products.has('p1'));
  assert.ok(state.products.has('p2'));
  assert.ok(state.migratedIds.has('p1'));
  assert.ok(state.migratedIds.has('p2'));
  assert.ok(state.migratedAt, '완료 후에만 migration flag 기록');
  assert.equal(state.inboundLog.length, 1);
  assert.equal(state.inboundLog[0]?.reason, SKIN_RETAIL_LEGACY_INBOUND_REASON);
}

// ── 2) 상품만 이미 존재하는 경우 (재고 이관만) ───────────────────
{
  const catalog: RetailProduct[] = [
    { id: 'pre', name: '앰플', price: 15000, stock: 7 },
  ];
  const state = emptyState();
  state.products.set('pre', { id: 'pre', name: '옛이름', price: 10000 });

  const plan = planSkinRetailCatalogItem(catalog[0]!, snapshotOf(state));
  assert.ok(plan);
  assert.equal(plan.needCreateProduct, false);
  assert.equal(plan.needSyncProductMeta, true);
  assert.equal(plan.needInbound, true);
  assert.equal(plan.inboundQuantity, 7);
  assert.equal(plan.alreadyComplete, false);

  const pass = simulateMigratePass(catalog, state);
  assert.equal(pass.imported, 0);
  assert.equal(pass.inboundApplied, 1);
  assert.equal(pass.settled, true);
  assert.equal(state.qty.get('pre'), 7);
  assert.equal(state.products.get('pre')?.name, '앰플');
  assert.equal(state.products.get('pre')?.price, 15000);
  assert.ok(state.migratedAt);
}

// ── 3) 상품 생성 후 재고 이관 실패 → 재실행 복구 ─────────────────
{
  const catalog: RetailProduct[] = [
    { id: 'serum', name: '세럼', price: 30000, stock: 10 },
  ];
  const state = emptyState();

  assert.throws(
    () => simulateMigratePass(catalog, state, { failInboundForProductId: 'serum' }),
    /이관 실패.*세럼/
  );
  assert.ok(state.products.has('serum'), 'Product는 유지');
  assert.equal(state.qty.get('serum') ?? 0, 0);
  assert.equal(state.inboundLog.length, 0);
  assert.equal(state.migratedIds.has('serum'), false);
  assert.equal(state.migratedAt, null, '부분 실패 시 migration flag 금지');

  const retryPlan = planSkinRetailCatalogItem(catalog[0]!, snapshotOf(state));
  assert.ok(retryPlan);
  assert.equal(retryPlan.needCreateProduct, false);
  assert.equal(retryPlan.needInbound, true);
  assert.equal(retryPlan.inboundQuantity, 10);

  const pass2 = simulateMigratePass(catalog, state);
  assert.equal(pass2.imported, 0);
  assert.equal(pass2.inboundApplied, 1);
  assert.equal(pass2.settled, true);
  assert.equal(state.qty.get('serum'), 10);
  assert.ok(state.migratedIds.has('serum'));
  assert.ok(state.migratedAt);
}

// ── 4) 이미 완료된 경우 재실행 ───────────────────────────────────
{
  const catalog: RetailProduct[] = [
    { id: 'done', name: '토너', price: 20000, stock: 4 },
  ];
  const state = emptyState();
  const first = simulateMigratePass(catalog, state);
  assert.equal(first.alreadySettled, false);
  assert.equal(first.settled, true);
  const flag = state.migratedAt;
  assert.ok(flag);

  const again = simulateMigratePass(catalog, state);
  assert.equal(again.alreadySettled, true);
  assert.equal(again.imported, 0);
  assert.equal(again.inboundApplied, 0);
  assert.equal(state.qty.get('done'), 4);
  assert.equal(state.inboundLog.length, 1);
  assert.equal(state.migratedAt, flag);
}

// ── 5) 재실행 시 중복 입고 방지 ───────────────────────────────────
{
  const catalog: RetailProduct[] = [
    { id: 'x1', name: '로션', price: 12000, stock: 15 },
    { id: 'x2', name: '클렌저', price: 9000, stock: 3 },
  ];
  const state = emptyState();
  simulateMigratePass(catalog, state);
  assert.equal(state.inboundLog.length, 2);
  const finalQty = {
    x1: state.qty.get('x1'),
    x2: state.qty.get('x2'),
  };

  for (let i = 0; i < 5; i += 1) {
    const pass = simulateMigratePass(catalog, state);
    assert.equal(pass.inboundApplied, 0);
    assert.equal(pass.alreadySettled, true);
    assert.equal(state.qty.get('x1'), finalQty.x1);
    assert.equal(state.qty.get('x2'), finalQty.x2);
  }
  assert.equal(finalQty.x1, 15);
  assert.equal(finalQty.x2, 3);
  assert.equal(state.inboundLog.length, 2);
}

// ── Core 재고가 이미 있으면 덮어쓰지 않음 ─────────────────────────
{
  const catalog: RetailProduct[] = [
    { id: 'keep', name: '마스크', price: 5000, stock: 20 },
  ];
  const state = emptyState();
  state.products.set('keep', { id: 'keep', name: '마스크', price: 5000 });
  state.qty.set('keep', 2); // Core에 이미 2개 (레거시 20과 다름)

  const plan = planSkinRetailCatalogItem(catalog[0]!, snapshotOf(state));
  assert.ok(plan);
  assert.equal(plan.needInbound, false);
  assert.equal(plan.alreadyComplete, true);
  assert.equal(plan.skipReason, 'Core 재고 이미 존재');

  const pass = simulateMigratePass(catalog, state);
  assert.equal(pass.inboundApplied, 0);
  assert.equal(state.qty.get('keep'), 2, '기존 Core 재고 유지');
  assert.equal(state.inboundLog.length, 0);
}

// ── 매진(coreQty=0) 후에도 마커가 있으면 재입고 금지 ─────────────
{
  const plan = planSkinRetailCatalogItem(
    { id: 'c', name: '마스크', price: 5000, stock: 20 },
    {
      existingProductIds: new Set(['c']),
      coreQuantityByProductId: new Map([['c', 0]]),
      legacyInboundProductIds: new Set(),
      migratedProductIds: new Set(['c']),
    }
  );
  assert.ok(plan);
  assert.equal(plan.needInbound, false);
  assert.equal(isSkinRetailCatalogItemFullyMigrated(plan), true);
}

// ── 레거시 inbound movement만 있어도 중복 방지 ───────────────────
{
  const plan = planSkinRetailCatalogItem(
    { id: 'd', name: '오일', price: 8000, stock: 4 },
    {
      existingProductIds: new Set(['d']),
      coreQuantityByProductId: new Map([['d', 0]]),
      legacyInboundProductIds: new Set(['d']),
      migratedProductIds: new Set(),
    }
  );
  assert.ok(plan);
  assert.equal(plan.needInbound, false);
}

// ── 메타(이름/가격)와 재고 계획 분리 ─────────────────────────────
{
  const plan = planSkinRetailCatalogItem(
    { id: 'meta', name: '새이름', price: 9999, stock: 0 },
    {
      existingProductIds: new Set(['meta']),
      coreQuantityByProductId: new Map([['meta', 0]]),
      legacyInboundProductIds: new Set(),
      migratedProductIds: new Set(),
    }
  );
  assert.ok(plan);
  assert.equal(plan.needCreateProduct, false);
  assert.equal(plan.needSyncProductMeta, true);
  assert.equal(plan.needInbound, false);
  assert.equal(plan.alreadyComplete, true);
}

// ── 다수 상품 이관 ───────────────────────────────────────────────
{
  const catalog: RetailProduct[] = Array.from({ length: 20 }, (_, i) => ({
    id: `item-${i}`,
    name: `상품${i}`,
    price: 1000 * (i + 1),
    stock: i % 3 === 0 ? 0 : i + 1,
  }));
  const state = emptyState();
  const pass1 = simulateMigratePass(catalog, state);
  assert.equal(pass1.imported, 20);
  assert.equal(pass1.settled, true);
  const expectedInbound = catalog.filter((c) => c.stock > 0).length;
  assert.equal(pass1.inboundApplied, expectedInbound);

  for (const item of catalog) {
    assert.equal(state.qty.get(item.id) ?? 0, item.stock);
  }

  const pass2 = simulateMigratePass(catalog, state);
  assert.equal(pass2.alreadySettled, true);
  assert.equal(pass2.inboundApplied, 0);
}

// ── organization 격리 (마커/완료시각) ────────────────────────────
{
  const byIds = mergeMigratedProductIds(undefined, 'org-A', 'p1');
  const next = mergeMigratedProductIds(byIds, 'org-B', 'p2');
  assert.deepEqual(readMigratedProductIdsForOrg(next, 'org-A'), new Set(['p1']));
  assert.deepEqual(readMigratedProductIdsForOrg(next, 'org-B'), new Set(['p2']));
  assert.equal(readMigratedProductIdsForOrg(next, 'org-C').size, 0);

  const atByOrg = { 'org-A': '2026-01-01T00:00:00.000Z' };
  assert.equal(readOrgMigratedAt(atByOrg, 'org-A'), '2026-01-01T00:00:00.000Z');
  assert.equal(
    readOrgMigratedAt(atByOrg, 'org-B', '2026-01-01T00:00:00.000Z'),
    null,
    '레거시 전역 플래그만으로는 다른 org 완료로 보지 않음'
  );
}

// ── 서로 다른 org 재고 격리 시뮬레이션 ───────────────────────────
{
  const catalogA: RetailProduct[] = [
    { id: 'shared-id', name: '크림A', price: 1000, stock: 5 },
  ];
  const catalogB: RetailProduct[] = [
    { id: 'shared-id', name: '크림B', price: 2000, stock: 8 },
  ];
  const stateA = emptyState();
  const stateB = emptyState();
  simulateMigratePass(catalogA, stateA);
  simulateMigratePass(catalogB, stateB);
  assert.equal(stateA.qty.get('shared-id'), 5);
  assert.equal(stateB.qty.get('shared-id'), 8);
  simulateMigratePass(catalogA, stateA);
  simulateMigratePass(catalogB, stateB);
  assert.equal(stateA.qty.get('shared-id'), 5);
  assert.equal(stateB.qty.get('shared-id'), 8);
}

console.log('skinRetailCatalogMigrate.test.ts: ok');
console.log(
  JSON.stringify(
    {
      legacyInboundReason: SKIN_RETAIL_LEGACY_INBOUND_REASON,
      scenarios: [
        'first-migrate',
        'product-already-exists',
        'product-ok-inbound-fail-retry',
        'already-settled-rerun',
        'no-duplicate-inbound',
      ],
    },
    null,
    2
  )
);
