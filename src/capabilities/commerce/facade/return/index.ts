/**
 * Commerce Return. 구현 SoT는 `@/capabilities/commerce/saleLedger` (create_sale_return).
 * 포인트 clawback은 `@/capabilities/commerce` loyalty. Retail 래퍼가 후처리한다.
 */
export type {
  SaleItemReturnable,
  SaleReturn,
  SaleReturnCreateInput,
  SaleReturnItem,
  SaleReturnWithItems,
} from '@/capabilities/commerce/saleLedger';
export {
  saleReturnService,
  computeReturnLineAmount,
  aggregateReturnRequestLines,
  assertReturnQuantitiesAllowed,
  mapCreateSaleReturnRpcError,
} from '@/capabilities/commerce/saleLedger';
