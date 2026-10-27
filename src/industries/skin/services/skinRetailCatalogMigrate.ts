import { productService } from '@/capabilities/commerce';
import { inventoryService } from '@/capabilities/commerce';
import { StorageService } from '@/services/storage';
import * as orgService from '@/core/organizations/services/organizationService';
import type { AcademySettings, RetailProduct } from '@/types';
import {
  SKIN_RETAIL_LEGACY_INBOUND_REASON,
  isSkinRetailCatalogItemFullyMigrated,
  isSkinRetailCatalogMigrationSettled,
  mergeMigratedProductIds,
  planSkinRetailCatalogItem,
  planSkinRetailCatalogMigration,
  readMigratedProductIdsForOrg,
  readOrgMigratedAt,
} from './skinRetailCatalogMigratePlan';

const MIGRATE_AT_BY_ORG = 'skinRetailCoreMigratedAtByOrg' as const;
const MIGRATED_PRODUCT_IDS_BY_ORG = 'skinRetailMigratedProductIdsByOrg' as const;
/** 하위 호환 — 현재 org 완료 시각 미러 (단독으로 완료를 단정하지 않음) */
const MIGRATE_FLAG_LEGACY = 'skinRetailCoreMigratedAt' as const;

export type SkinRetailCatalogMigrateResult = {
  migrated: boolean;
  imported: number;
  inboundApplied: number;
  /** 이미 Core와 일치해 추가 작업이 없었음 */
  alreadySettled: boolean;
};

function readCatalog(settings: AcademySettings): RetailProduct[] {
  return Array.isArray(settings.retailCatalog) ? settings.retailCatalog : [];
}

function persistLocalMigrateProgress(
  organizationId: string,
  patch: {
    migratedAt?: string;
    migratedProductIdsByOrg: Record<string, string[]>;
  }
): Record<string, string> {
  const settings = StorageService.getSettings();
  const atByOrg: Record<string, string> = {
    ...((settings.skinRetailCoreMigratedAtByOrg as Record<string, string>) || {}),
  };
  if (patch.migratedAt) {
    atByOrg[organizationId] = patch.migratedAt;
  }
  StorageService.updateSettings({
    [MIGRATED_PRODUCT_IDS_BY_ORG]: patch.migratedProductIdsByOrg,
    [MIGRATE_AT_BY_ORG]: atByOrg,
    ...(patch.migratedAt ? { [MIGRATE_FLAG_LEGACY]: patch.migratedAt } : {}),
  });
  return atByOrg;
}

async function syncMigrateProgress(
  organizationId: string,
  patch: {
    migratedAt?: string;
    migratedProductIdsByOrg: Record<string, string[]>;
  }
): Promise<void> {
  const migratedAtByOrg = persistLocalMigrateProgress(organizationId, patch);
  const remotePatch: Partial<AcademySettings> = {
    [MIGRATED_PRODUCT_IDS_BY_ORG]: patch.migratedProductIdsByOrg,
    [MIGRATE_AT_BY_ORG]: migratedAtByOrg,
  };
  if (patch.migratedAt) {
    remotePatch[MIGRATE_FLAG_LEGACY] = patch.migratedAt;
  }
  await orgService.updateOrganization(organizationId, { settings: remotePatch });
}

function buildSnapshot(
  existingProductIds: Set<string>,
  coreQuantityByProductId: Map<string, number>,
  legacyInboundProductIds: Set<string>,
  migratedProductIds: Set<string>
) {
  return {
    existingProductIds,
    coreQuantityByProductId,
    legacyInboundProductIds,
    migratedProductIds,
  };
}

/**
 * retailCatalog → Core Product/Inventory idempotent 이관.
 *
 * - retailCatalog는 삭제하지 않는다.
 * - Product 메타(이름/가격)와 재고 inbound를 분리 처리한다.
 * - Product+Inventory가 모두 반영된 항목만 완료 마커·org flag를 기록한다.
 * - Product만 있는 부분 실패는 다음 실행에서 재고 이관을 이어간다.
 * - 동일 legacy 재고를 두 번 inbound하지 않으며, 기존 Core 재고를 덮어쓰지 않는다.
 * - organization별로 독립적으로 동작한다.
 */
export async function migrateSkinRetailCatalogIfNeeded(
  organizationId: string
): Promise<SkinRetailCatalogMigrateResult> {
  const orgId = String(organizationId || '').trim();
  if (!orgId) {
    throw new Error('사업장(organizationId)이 없어 Skin 상품 이관을 할 수 없습니다.');
  }

  const settings = StorageService.getSettings();
  const catalog = readCatalog(settings);
  let migratedProductIdsByOrg: Record<string, string[]> = {
    ...(settings.skinRetailMigratedProductIdsByOrg || {}),
  };
  let migratedProductIds = readMigratedProductIdsForOrg(
    migratedProductIdsByOrg,
    orgId
  );

  const [existingProducts, stockRows, inboundMovements] = await Promise.all([
    productService.listProducts(orgId),
    inventoryService.listStockRows(orgId),
    inventoryService.listMovements({
      organizationId: orgId,
      movementType: 'inbound',
      limit: 500,
    }),
  ]);

  const existingProductIds = new Set(existingProducts.map((p) => p.id));
  const coreQuantityByProductId = new Map<string, number>();
  for (const row of stockRows) {
    if (row.variantId) continue;
    coreQuantityByProductId.set(row.productId, row.quantity);
  }
  const legacyInboundProductIds = new Set<string>();
  for (const m of inboundMovements) {
    if (
      m.productId &&
      !m.variantId &&
      m.reason === SKIN_RETAIL_LEGACY_INBOUND_REASON
    ) {
      legacyInboundProductIds.add(m.productId);
    }
  }

  let plans = planSkinRetailCatalogMigration(
    catalog,
    buildSnapshot(
      existingProductIds,
      coreQuantityByProductId,
      legacyInboundProductIds,
      migratedProductIds
    )
  );

  // 이미 완료로 볼 수 있는 항목은 마커 보강 (매진 후 coreQty=0 중복 inbound 방지)
  let markersDirty = false;
  for (const plan of plans) {
    if (isSkinRetailCatalogItemFullyMigrated(plan) && !migratedProductIds.has(plan.productId)) {
      migratedProductIdsByOrg = mergeMigratedProductIds(
        migratedProductIdsByOrg,
        orgId,
        plan.productId
      );
      migratedProductIds = readMigratedProductIdsForOrg(
        migratedProductIdsByOrg,
        orgId
      );
      markersDirty = true;
    }
  }

  // 마커 반영 후 재계획 — 작업 루프는 최신 plan만 사용
  plans = planSkinRetailCatalogMigration(
    catalog,
    buildSnapshot(
      existingProductIds,
      coreQuantityByProductId,
      legacyInboundProductIds,
      migratedProductIds
    )
  );

  if (isSkinRetailCatalogMigrationSettled(plans)) {
    const migratedAt =
      readOrgMigratedAt(
        settings.skinRetailCoreMigratedAtByOrg,
        orgId,
        settings.skinRetailCoreMigratedAt
      ) || new Date().toISOString();
    if (markersDirty || !settings.skinRetailCoreMigratedAtByOrg?.[orgId]) {
      try {
        await syncMigrateProgress(orgId, {
          migratedAt,
          migratedProductIdsByOrg,
        });
      } catch {
        persistLocalMigrateProgress(orgId, {
          migratedAt,
          migratedProductIdsByOrg,
        });
      }
    }
    return {
      migrated: false,
      imported: 0,
      inboundApplied: 0,
      alreadySettled: true,
    };
  }

  let imported = 0;
  let inboundApplied = 0;

  for (const plan of plans) {
    try {
      // 1) Product 메타 — 생성 또는 이름/가격 동기화 (재고와 분리)
      if (plan.needCreateProduct) {
        await productService.saveProduct(orgId, {
          id: plan.productId,
          name: plan.name,
          price: plan.price,
          isActive: true,
        });
        existingProductIds.add(plan.productId);
        imported += 1;
      } else if (plan.needSyncProductMeta) {
        await productService.saveProduct(
          orgId,
          {
            name: plan.name,
            price: plan.price,
            isActive: true,
          },
          plan.productId
        );
      }

      // 2) 재고 — 필요할 때만 inbound (기존 수량 덮어쓰기 없음)
      if (plan.needInbound && plan.inboundQuantity > 0) {
        await inventoryService.applyInbound({
          organizationId: orgId,
          productId: plan.productId,
          quantity: plan.inboundQuantity,
          reason: SKIN_RETAIL_LEGACY_INBOUND_REASON,
        });
        coreQuantityByProductId.set(
          plan.productId,
          (coreQuantityByProductId.get(plan.productId) ?? 0) + plan.inboundQuantity
        );
        legacyInboundProductIds.add(plan.productId);
        inboundApplied += 1;
      }

      // 3) Product(+필요 시 Inventory) 반영 후에만 항목 완료 마커
      //    inbound 실패 시 여기까지 오지 않음 → 다음 실행에서 재고 이관 재시도
      const afterItem = planSkinRetailCatalogItem(
        {
          id: plan.productId,
          name: plan.name,
          price: plan.price,
          stock: plan.legacyStock,
        },
        buildSnapshot(
          existingProductIds,
          coreQuantityByProductId,
          legacyInboundProductIds,
          migratedProductIds
        )
      );
      if (afterItem && isSkinRetailCatalogItemFullyMigrated(afterItem)) {
        migratedProductIdsByOrg = mergeMigratedProductIds(
          migratedProductIdsByOrg,
          orgId,
          plan.productId
        );
        migratedProductIds = readMigratedProductIdsForOrg(
          migratedProductIdsByOrg,
          orgId
        );
        // 완료 flag(migratedAt)는 넣지 않음 — 전체 settled 후에만
        persistLocalMigrateProgress(orgId, { migratedProductIdsByOrg });
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      // 부분 진행 마커만 유지 (실패한 항목은 미완료) — migratedAt 없음
      try {
        await syncMigrateProgress(orgId, { migratedProductIdsByOrg });
      } catch {
        persistLocalMigrateProgress(orgId, { migratedProductIdsByOrg });
      }
      throw new Error(
        `Skin 상품 이관 실패: "${plan.name}" (${plan.productId}). ${detail}`
      );
    }
  }

  // 최종 검증 — org migration flag는 전부 완료일 때만
  plans = planSkinRetailCatalogMigration(
    catalog,
    buildSnapshot(
      existingProductIds,
      coreQuantityByProductId,
      legacyInboundProductIds,
      migratedProductIds
    )
  );
  if (!isSkinRetailCatalogMigrationSettled(plans)) {
    try {
      await syncMigrateProgress(orgId, { migratedProductIdsByOrg });
    } catch {
      persistLocalMigrateProgress(orgId, { migratedProductIdsByOrg });
    }
    throw new Error(
      'Skin 상품 이관이 완료되지 않았습니다. Core Product/Inventory를 확인한 뒤 다시 시도해 주세요.'
    );
  }

  const migratedAt = new Date().toISOString();
  try {
    await syncMigrateProgress(orgId, {
      migratedAt,
      migratedProductIdsByOrg,
    });
  } catch {
    persistLocalMigrateProgress(orgId, {
      migratedAt,
      migratedProductIdsByOrg,
    });
  }

  return {
    migrated: true,
    imported,
    inboundApplied,
    alreadySettled: false,
  };
}
