import { productService } from '@/capabilities/commerce';
import { inventoryService } from '@/capabilities/commerce';
import { saleService } from '@/capabilities/commerce';
import { customerLinkService } from '@/core/customer/services/customerLinkService';
import {
  PILATES_MERCHANDISE_DOMAIN,
  type PilatesMerchandiseCatalogItem,
  type PilatesMerchandiseCustomer,
  type PilatesMerchandiseProduct,
  type PilatesMerchandiseProductDetail,
  type PilatesMerchandiseSale,
  type PilatesMerchandiseSaleInput,
  type PilatesMerchandiseStockRow,
} from './types';

/**
 * 필라테스 Module → Core 상품/재고/판매 최소 연결.
 *
 * 판매 UI·POS·포인트·재고 화면은 포함하지 않는다.
 * 회원권·수업·예약 API를 호출하지 않는다.
 *
 * 향후 운동복/양말/소도구 판매 UI가 필요할 때 이 서비스만 사용한다.
 */
export const pilatesMerchandiseService = {
  domain: PILATES_MERCHANDISE_DOMAIN,

  /** Core Product 목록 (활성/비활성 포함) */
  async listProducts(organizationId: string): Promise<PilatesMerchandiseProduct[]> {
    return productService.listProducts(organizationId);
  },

  async getProduct(
    organizationId: string,
    productId: string
  ): Promise<PilatesMerchandiseProductDetail | null> {
    return productService.getProduct(organizationId, productId);
  },

  /** 판매용 카탈로그 (활성 상품·옵션) */
  async listCatalog(organizationId: string): Promise<PilatesMerchandiseCatalogItem[]> {
    return saleService.listCatalog(organizationId);
  },

  /** Core Inventory 잔량 (화면 없이 조회만) */
  async listStockRows(organizationId: string): Promise<PilatesMerchandiseStockRow[]> {
    return inventoryService.listStockRows(organizationId);
  },

  /** Core Customer 검색 — 회원 목록(Student)과 별도 */
  async searchCustomers(
    organizationId: string,
    query = '',
    limit = 20
  ): Promise<PilatesMerchandiseCustomer[]> {
    return customerLinkService.searchCustomers(organizationId, query, limit);
  },

  async getCustomer(
    organizationId: string,
    customerId: string
  ): Promise<PilatesMerchandiseCustomer | null> {
    return customerLinkService.getCustomerById(organizationId, customerId);
  },

  /**
   * 비회원(게스트) Core Customer 보장.
   * source는 merchandise로 고정해 예약·회원권 소스와 구분한다.
   */
  async ensureGuestCustomer(input: {
    organizationId: string;
    name: string;
    phone?: string | null;
  }): Promise<string> {
    return customerLinkService.ensureGuestCustomer({
      organizationId: input.organizationId,
      name: input.name,
      phone: input.phone,
      source: PILATES_MERCHANDISE_DOMAIN,
    });
  },

  /**
   * Core Sale 생성 + 재고 차감.
   * 포인트 적립/사용·Finance·회원권 차감은 하지 않는다.
   */
  async createSale(input: PilatesMerchandiseSaleInput): Promise<PilatesMerchandiseSale> {
    if (!input.items.length) {
      throw new Error('판매할 상품을 담아 주세요.');
    }
    return saleService.createSale({
      organizationId: input.organizationId,
      customerId: input.customerId ?? null,
      paymentMethod: input.paymentMethod,
      items: input.items,
    });
  },

  async getSale(
    organizationId: string,
    saleId: string
  ): Promise<PilatesMerchandiseSale | null> {
    return saleService.getSaleWithItems(organizationId, saleId);
  },
};
