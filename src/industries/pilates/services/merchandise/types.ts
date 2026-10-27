import type { SaleCatalogItem, SaleCreateInput, SalePaymentMethod, SaleWithItems } from '@/capabilities/commerce';
import type { Product, ProductListItem } from '@/capabilities/commerce';
import type { InventoryStockRow } from '@/capabilities/commerce';
import type { CustomerSearchResult } from '@/core/customer/services/customerLinkService';

/**
 * 필라테스 실물 상품(운동복·양말·소도구 등) 판매 도메인.
 *
 * 혼동 금지 — 아래와 분리한다.
 * - SessionPass / 회원권·회차권
 * - ServiceOffering / 수업·서비스
 * - Booking / 예약
 *
 * 이 도메인은 Core Product · Inventory · Sale · Customer 만 사용한다.
 */
export const PILATES_MERCHANDISE_DOMAIN = 'pilates_merchandise' as const;

export type PilatesMerchandiseProduct = ProductListItem;
export type PilatesMerchandiseProductDetail = Product;
export type PilatesMerchandiseCatalogItem = SaleCatalogItem;
export type PilatesMerchandiseStockRow = InventoryStockRow;
export type PilatesMerchandiseCustomer = CustomerSearchResult;
export type PilatesMerchandiseSale = SaleWithItems;
export type PilatesMerchandisePaymentMethod = SalePaymentMethod;

export type PilatesMerchandiseSaleLine = SaleCreateInput['items'][number];

/** Core Sale 호출용 최소 입력. 포인트·Finance·회원권은 포함하지 않는다. */
export interface PilatesMerchandiseSaleInput {
  organizationId: string;
  /** Core customers.id — 없으면 비회원 판매 */
  customerId?: string | null;
  paymentMethod: PilatesMerchandisePaymentMethod;
  items: PilatesMerchandiseSaleLine[];
}

export type { Product, ProductListItem };
