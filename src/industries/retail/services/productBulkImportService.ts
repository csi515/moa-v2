/**
 * 상품 대량 일괄 등록 & 업데이트 서비스 (배치 청크 처리)
 */
import { productService } from './productService';
import { inventoryService } from './inventoryService';
import type { ValidatedProductGroup } from './productBulkImportEngine';

export interface BulkImportOptions {
  /** 기존 바코드 일치 시 기존 상품 정보 업데이트 여부 (기본 true) */
  updateExistingByCode?: boolean;
  /** 초기 재고가 0보다 클 때 재고 입고 자동 반영 여부 (기본 true) */
  applyInitialStock?: boolean;
}

export interface ImportProgress {
  current: number;
  total: number;
  percent: number;
  message: string;
}

export interface BulkImportSummary {
  totalGroups: number;
  inserted: number;
  updated: number;
  stockInitialized: number;
  errors: Array<{ productName: string; message: string }>;
}

export const productBulkImportService = {
  async bulkImport(
    organizationId: string,
    groups: ValidatedProductGroup[],
    options: BulkImportOptions = {},
    onProgress?: (progress: ImportProgress) => void
  ): Promise<BulkImportSummary> {
    const { updateExistingByCode = true, applyInitialStock = true } = options;

    const summary: BulkImportSummary = {
      totalGroups: groups.length,
      inserted: 0,
      updated: 0,
      stockInitialized: 0,
      errors: [],
    };

    if (groups.length === 0) {
      return summary;
    }

    onProgress?.({
      current: 0,
      total: groups.length,
      percent: 0,
      message: '기존 상품 및 카테고리 정보 조회 중...',
    });

    // 1. 기존 상품 및 카테고리 사전 조회 (인메모리 인덱싱)
    const [existingProducts, existingCategories] = await Promise.all([
      productService.listProducts(organizationId),
      productService.listCategories(organizationId),
    ]);

    // 바코드 및 이름 인덱스
    const productByCode = new Map<string, (typeof existingProducts)[0]>();
    const productByName = new Map<string, (typeof existingProducts)[0]>();
    for (const p of existingProducts) {
      if (p.productCode) {
        productByCode.set(p.productCode.toLowerCase(), p);
      }
      productByName.set(p.name.toLowerCase(), p);
    }

    const categoryMap = new Map<string, string>(); // 카테고리명 -> id
    for (const c of existingCategories) {
      categoryMap.set(c.name.toLowerCase(), c.id);
    }

    // 2. 누락된 신규 카테고리 사전 일괄 생성
    const neededCategories = new Set<string>();
    for (const g of groups) {
      if (g.categoryName && !categoryMap.has(g.categoryName.toLowerCase())) {
        neededCategories.add(g.categoryName.trim());
      }
    }

    for (const catName of neededCategories) {
      try {
        const created = await productService.createCategory(organizationId, catName);
        categoryMap.set(catName.toLowerCase(), created.id);
      } catch (err) {
        console.warn(`[BulkImport] 카테고리 생성 실패: ${catName}`, err);
      }
    }

    // 3. 상품 그룹 순차/배치 처리 (청크 단위 브라우저 이벤트 루프 양보)
    const CHUNK_SIZE = 10;
    for (let i = 0; i < groups.length; i += CHUNK_SIZE) {
      const chunk = groups.slice(i, i + CHUNK_SIZE);

      await Promise.all(
        chunk.map(async (group, chunkIdx) => {
          const currentIndex = i + chunkIdx + 1;
          const percent = Math.round((currentIndex / groups.length) * 100);

          onProgress?.({
            current: currentIndex,
            total: groups.length,
            percent,
            message: `'${group.name}' 처리 중... (${currentIndex}/${groups.length})`,
          });

          try {
            // 기존 상품 매칭 (1순위: 바코드, 2순위: 상품명)
            let existing: (typeof existingProducts)[0] | undefined;
            if (group.productCode && productByCode.has(group.productCode.toLowerCase())) {
              existing = productByCode.get(group.productCode.toLowerCase());
            } else if (!group.productCode && productByName.has(group.name.toLowerCase())) {
              existing = productByName.get(group.name.toLowerCase());
            }

            const categoryId = group.categoryName
              ? categoryMap.get(group.categoryName.toLowerCase()) || null
              : null;

            const isUpdate = Boolean(existing && updateExistingByCode);

            // 상품 저장 (Insert 또는 Update)
            const savedProduct = await productService.saveProduct(
              organizationId,
              {
                name: group.name,
                productCode: group.productCode,
                price: group.price,
                cost: group.cost,
                categoryId,
                isActive: true,
                variants: group.variants.map((v) => ({
                  name: v.name,
                  sku: v.sku,
                  price: v.price,
                  cost: v.cost,
                  isActive: true,
                })),
              },
              isUpdate ? existing?.id : undefined
            );

            if (isUpdate) {
              summary.updated++;
            } else {
              summary.inserted++;
            }

            // 초기 재고 반영 (신규 등록이거나 기초 재고 입고가 요청된 경우)
            if (applyInitialStock) {
              if (group.variants.length === 0 && group.initialStock > 0) {
                // 단품 상품 기초 재고 입고
                await inventoryService.applyInbound({
                  organizationId,
                  productId: savedProduct.id,
                  variantId: null,
                  quantity: group.initialStock,
                  reason: '엑셀 대량 등록 기초 재고',
                });
                summary.stockInitialized += group.initialStock;
              } else if (group.variants.length > 0) {
                // 옵션 상품 옵션별 기초 재고 입고
                const savedVariants = await productService.listVariants(savedProduct.id);
                const variantByName = new Map(savedVariants.map((v) => [v.name.toLowerCase(), v.id]));

                for (const v of group.variants) {
                  if (v.initialStock > 0) {
                    const variantId = variantByName.get(v.name.toLowerCase());
                    if (variantId) {
                      await inventoryService.applyInbound({
                        organizationId,
                        productId: savedProduct.id,
                        variantId,
                        quantity: v.initialStock,
                        reason: '엑셀 대량 등록 기초 재고 (옵션)',
                      });
                      summary.stockInitialized += v.initialStock;
                    }
                  }
                }
              }
            }
          } catch (err) {
            summary.errors.push({
              productName: group.name,
              message: err instanceof Error ? err.message : '저장 중 오류 발생',
            });
          }
        })
      );

      // UI 렌더링 블로킹 방지를 위한 짧은 틱 양보
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    onProgress?.({
      current: groups.length,
      total: groups.length,
      percent: 100,
      message: '대량 일괄 등록 완료!',
    });

    return summary;
  },
};
