import type { RetailProduct } from '@/types';

/** Core stock_movements.reason — 레거시 카탈로그 이관 입고 식별 */
export const SKIN_RETAIL_LEGACY_INBOUND_REASON = '레거시 카탈로그 이관';

export type SkinRetailCatalogItemPlan = {
  productId: string;
  name: string;
  price: number;
  legacyStock: number;
  /** Product 행이 없어 생성이 필요 */
  needCreateProduct: boolean;
  /**
   * Product는 있으나 카탈로그 이름·가격을 동기화할 수 있음
   * (재고와 무관 — 절대값 덮어쓰기 없음)
   */
  needSyncProductMeta: boolean;
  /** legacy 재고 inbound가 필요 (중복 방지 후) */
  needInbound: boolean;
  inboundQuantity: number;
  /** Product+Inventory 관점에서 이 항목이 이미 완료인지 */
  alreadyComplete: boolean;
  skipReason?: string;
};

export type SkinRetailCatalogMigrateSnapshot = {
  /** Core에 존재하는 product id */
  existingProductIds: ReadonlySet<string>;
  /** productId → Core inventory 수량 (variant 없는 행) */
  coreQuantityByProductId: ReadonlyMap<string, number>;
  /**
   * 이미 레거시 이관 inbound가 기록된 product id
   * (movement reason = SKIN_RETAIL_LEGACY_INBOUND_REASON)
   */
  legacyInboundProductIds: ReadonlySet<string>;
  /**
   * 조직별로 이관 완료로 기록된 product id
   * (settings 마커 — 매진 후 coreQty=0 이어도 중복 inbound 방지)
   */
  migratedProductIds: ReadonlySet<string>;
};

/**
 * 단일 legacy catalog 항목에 대한 Core 이관 계획.
 * - Product 메타(이름/가격)와 재고 inbound를 분리
 * - Product만 있는 부분 실패 → needInbound로 재고 이관 이어감
 * - 이미 반영된 재고/이관 마커/레거시 inbound → 중복 inbound 금지
 * - 기존 Core 재고를 임의로 덮어쓰지 않음
 */
export function planSkinRetailCatalogItem(
  item: Pick<RetailProduct, 'id' | 'name' | 'price' | 'stock'>,
  snapshot: SkinRetailCatalogMigrateSnapshot
): SkinRetailCatalogItemPlan | null {
  const productId = String(item.id || '').trim();
  const name = String(item.name || '').trim();
  if (!productId || !name) return null;

  const price = Math.max(0, Number(item.price) || 0);
  const legacyStock = Math.max(0, Math.floor(Number(item.stock) || 0));
  const needCreateProduct = !snapshot.existingProductIds.has(productId);
  const needSyncProductMeta = !needCreateProduct;
  const coreQty = snapshot.coreQuantityByProductId.get(productId) ?? 0;
  const hasLegacyInbound = snapshot.legacyInboundProductIds.has(productId);
  const markedMigrated = snapshot.migratedProductIds.has(productId);

  if (legacyStock === 0) {
    return {
      productId,
      name,
      price,
      legacyStock,
      needCreateProduct,
      needSyncProductMeta,
      needInbound: false,
      inboundQuantity: 0,
      alreadyComplete: !needCreateProduct,
      skipReason: needCreateProduct ? undefined : '재고 0 — Product만 확인',
    };
  }

  // 이미 이관 완료로 기록되었거나 레거시 inbound movement가 있으면 재입고 금지
  if (markedMigrated || hasLegacyInbound) {
    return {
      productId,
      name,
      price,
      legacyStock,
      needCreateProduct,
      needSyncProductMeta,
      needInbound: false,
      inboundQuantity: 0,
      alreadyComplete: !needCreateProduct,
      skipReason: markedMigrated
        ? '이관 완료 마커 존재'
        : '레거시 inbound movement 존재',
    };
  }

  // Core에 이미 수량이 있으면 이관 반영된 것으로 보고 중복 inbound 금지
  // (임의 덮어쓰기/보충 inbound 금지)
  if (coreQty > 0) {
    return {
      productId,
      name,
      price,
      legacyStock,
      needCreateProduct,
      needSyncProductMeta,
      needInbound: false,
      inboundQuantity: 0,
      alreadyComplete: !needCreateProduct,
      skipReason: 'Core 재고 이미 존재',
    };
  }

  // Product만 생성되고 입고 실패했거나, 아직 재고 이관 전
  return {
    productId,
    name,
    price,
    legacyStock,
    needCreateProduct,
    needSyncProductMeta,
    needInbound: true,
    inboundQuantity: legacyStock,
    alreadyComplete: false,
  };
}

export function planSkinRetailCatalogMigration(
  catalog: ReadonlyArray<Pick<RetailProduct, 'id' | 'name' | 'price' | 'stock'>>,
  snapshot: SkinRetailCatalogMigrateSnapshot
): SkinRetailCatalogItemPlan[] {
  const plans: SkinRetailCatalogItemPlan[] = [];
  for (const item of catalog) {
    const plan = planSkinRetailCatalogItem(item, snapshot);
    if (plan) plans.push(plan);
  }
  return plans;
}

/** 모든 유효 항목이 완료이고 추가 작업이 없으면 true (메타 동기화는 완료 조건에서 제외) */
export function isSkinRetailCatalogMigrationSettled(
  plans: ReadonlyArray<SkinRetailCatalogItemPlan>
): boolean {
  if (plans.length === 0) return true;
  return plans.every(
    (p) => p.alreadyComplete && !p.needCreateProduct && !p.needInbound
  );
}

/** Product+재고가 모두 반영된 뒤에만 항목 완료로 본다 */
export function isSkinRetailCatalogItemFullyMigrated(
  plan: SkinRetailCatalogItemPlan
): boolean {
  return !plan.needCreateProduct && !plan.needInbound;
}

export function readMigratedProductIdsForOrg(
  byOrg: Record<string, string[]> | null | undefined,
  organizationId: string
): Set<string> {
  const list = byOrg?.[organizationId];
  if (!Array.isArray(list)) return new Set();
  return new Set(list.map((id) => String(id || '').trim()).filter(Boolean));
}

export function mergeMigratedProductIds(
  byOrg: Record<string, string[]> | null | undefined,
  organizationId: string,
  productId: string
): Record<string, string[]> {
  const next: Record<string, string[]> = { ...(byOrg || {}) };
  const prev = new Set(
    (Array.isArray(next[organizationId]) ? next[organizationId] : []).map(String)
  );
  prev.add(productId);
  next[organizationId] = [...prev];
  return next;
}

export function readOrgMigratedAt(
  byOrg: Record<string, string> | null | undefined,
  organizationId: string,
  legacyGlobalAt?: string | null
): string | null {
  const scoped = byOrg?.[organizationId];
  if (typeof scoped === 'string' && scoped.trim()) return scoped;
  // 레거시 전역 플래그는 org 격리 보장이 없어 완료 힌트로만 쓰지 않음
  void legacyGlobalAt;
  return null;
}
