/**
 * Core 상품 도메인 타입 (DB: core.products / product_variants / product_categories).
 * Module(Retail/Skin/Piano 등)이 공유하는 공통 모델.
 */

export interface ProductCategory {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  organizationId: string;
  name: string;
  categoryId: string | null;
  productCode: string | null;
  price: number;
  cost: number | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** price·cost null이면 상위 Product 값 사용(앱 해석) */
export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  price: number | null;
  cost: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListItem extends Product {
  variantCount: number;
  categoryName: string | null;
}

export interface ProductVariantSaveInput {
  id?: string;
  name: string;
  sku?: string | null;
  price?: number | null;
  cost?: number | null;
  isActive?: boolean;
}

export interface ProductSaveInput {
  /** 생성 시에만 — 레거시 카탈로그 id 보존용(선택) */
  id?: string;
  name: string;
  categoryId?: string | null;
  /** categoryId 없을 때 생성 */
  newCategoryName?: string | null;
  productCode?: string | null;
  price: number;
  cost?: number | null;
  isActive?: boolean;
  /**
   * undefined: 옵션 변경 없음
   * []: 옵션 전부 제거
   * 항목: id 있으면 갱신, 없으면 추가. 목록에 없는 기존 id는 삭제
   */
  variants?: ProductVariantSaveInput[];
}
