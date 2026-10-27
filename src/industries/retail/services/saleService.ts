import { saleService as commerceSaleService } from '@/capabilities/commerce';
import type { SaleCreateInput, SaleWithItems } from '@/capabilities/commerce';
import type { StockShortfall } from '@/capabilities/commerce';
import { pointEarnService } from '@/capabilities/commerce';

/**
 * Retail 판매 facade.
 * 상품·재고·판매·포인트 사용(redeem)은 Commerce → create_sale 원자 RPC.
 * 적립(earn)만 Retail 후처리 (실패해도 판매·redeem 일관 유지).
 */
export const saleService = {
  listCatalog: commerceSaleService.listCatalog.bind(commerceSaleService),

  checkStockShortfalls(
    organizationId: string,
    items: SaleCreateInput['items']
  ): Promise<StockShortfall[]> {
    return commerceSaleService.checkStockShortfalls(organizationId, items);
  },

  async createSale(input: SaleCreateInput): Promise<SaleWithItems> {
    // points_used > 0 이면 create_sale 내부에서 redeem까지 원자 처리
    // (부족/비활성 시 판매·재고 전체 rollback)
    const sale = await commerceSaleService.createSale(input);

    const eligibleEarnAmount = Math.max(0, sale.totalAmount - sale.pointsUsed);
    try {
      await pointEarnService.earnForSale({
        organizationId: input.organizationId,
        customerId: input.customerId,
        saleId: sale.id,
        eligibleAmount: eligibleEarnAmount,
      });
    } catch (earnError) {
      // 판매·redeem은 이미 확정. 적립만 실패 — 재시도 시 sale_id 멱등으로 중복 방지
      console.error('[saleService.createSale] point earn failed', earnError);
    }

    return sale;
  },
};
