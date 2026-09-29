/**
 * 업종 무관 매점(store) 시나리오 → 기존 Commerce API.
 * 로직을 복사하지 않는다. 새 RPC를 만들지 않는다.
 *
 * 판매 출고는 createSale(create_sale)만 사용한다.
 * 판매 취소·반품은 createReturn(create_sale_return)만 사용한다.
 * status=cancelled 전용 void API는 없다.
 */
import { productService } from './product';
import { inventoryService } from './inventory';
import { saleService, revenueService } from './sale';
import { saleReturnService } from './return';
import { SALE_PAYMENT_METHODS } from './payment';

export const storeCapability = {
  registerProduct: productService.saveProduct.bind(productService),
  changeProduct: productService.saveProduct.bind(productService),
  listProducts: productService.listProducts.bind(productService),
  inboundStock: inventoryService.applyInbound.bind(inventoryService),
  listStock: inventoryService.listStockRows.bind(inventoryService),
  listCatalog: saleService.listCatalog.bind(saleService),
  checkStock: saleService.checkStockShortfalls.bind(saleService),
  sell: saleService.createSale.bind(saleService),
  reverseSale: saleReturnService.createReturn.bind(saleReturnService),
  returnableLines: saleReturnService.buildReturnableLines.bind(saleReturnService),
  revenue: revenueService.getSummary.bind(revenueService),
  paymentMethods: SALE_PAYMENT_METHODS,
} as const;

export type StoreCapability = typeof storeCapability;
