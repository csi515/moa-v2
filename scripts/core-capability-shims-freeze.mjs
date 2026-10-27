/**
 * Core Compatibility Shim Frozen Allowlist
 *
 * Core 디렉터리(src/core/)에서 @/capabilities/를 참조하는 re-export Shim 파일들은
 * 하위 호환성을 위해 아래 목록에 한해 영구 동결(Frozen) 상태로만 허용된다.
 *
 * AGENTS.md §5.5 규칙:
 * Core 디렉터리 내부에서는 @/capabilities를 참조하거나 re-export하는 어떠한 신규 파일도 생성할 수 없다.
 */

export const FROZEN_CORE_CAPABILITY_SHIMS = new Set([
  'src/core/attendance/attendanceClassKey.ts',
  'src/core/attendance/attendanceIndustryCopy.ts',
  'src/core/attendance/attendanceNotifyCopy.ts',
  'src/core/attendance/dayAttendance.ts',
  'src/core/attendance/features.ts',
  'src/core/attendance/index.ts',
  'src/core/attendance/pinCheckInSideEffects.ts',
  'src/core/attendance/services/attendanceService.ts',
  'src/core/attendance/types.ts',
  'src/core/calendar/fallbackHolidays.ts',
  'src/core/calendar/index.ts',
  'src/core/calendar/services/publicHolidayService.ts',
  'src/core/calendar/types.ts',
  'src/core/calendar/usePublicHolidays.ts',
  'src/core/commerce/index.ts',
  'src/core/commerce/inventory/index.ts',
  'src/core/commerce/payment/index.ts',
  'src/core/commerce/product/index.ts',
  'src/core/commerce/return/index.ts',
  'src/core/commerce/sale/customerPurchaseService.ts',
  'src/core/commerce/sale/index.ts',
  'src/core/commerce/sale/revenueAggregate.ts',
  'src/core/commerce/sale/revenueService.ts',
  'src/core/commerce/sale/revenueTypes.ts',
  'src/core/commerce/sale/saleHistoryService.ts',
  'src/core/commerce/sale/saleQuery.ts',
  'src/core/commerce/storeCapability.ts',
  'src/core/finance/billingIncomeLink.ts',
  'src/core/finance/index.ts',
  'src/core/finance/paymentMethodLabels.ts',
  'src/core/finance/teacherPayroll/index.ts',
  'src/core/finance/teacherPayroll/settlements.ts',
  'src/core/finance/types.ts',
  'src/core/inventory/index.ts',
  'src/core/inventory/inventoryService.ts',
  'src/core/inventory/mapStockMovementRpcError.ts',
  'src/core/inventory/saleStockAggregate.ts',
  'src/core/inventory/stockSaleOps.ts',
  'src/core/inventory/types.ts',
  'src/core/loyalty/earnPolicy.ts',
  'src/core/loyalty/index.ts',
  'src/core/loyalty/pointEarnService.ts',
  'src/core/loyalty/pointQueryService.ts',
  'src/core/loyalty/pointRedeemService.ts',
  'src/core/loyalty/pointReturnService.ts',
  'src/core/loyalty/saleReturnPointPlan.ts',
  'src/core/loyalty/types.ts',
  'src/core/product/index.ts',
  'src/core/product/productService.ts',
  'src/core/product/types.ts',
  'src/core/resources/index.ts',
  'src/core/sales/index.ts',
  'src/core/sales/mapCreateSaleRpcError.ts',
  'src/core/sales/saleReturnPlan.ts',
  'src/core/sales/saleReturnService.ts',
  'src/core/sales/saleService.ts',
  'src/core/sales/types.ts',
  'src/core/schedules/classAttendanceLedger.ts',
  'src/core/transport/index.ts',
  'src/core/waitlist/index.ts',
  'src/core/waitlist/transitions.ts',
  'src/core/waitlist/types.ts',
  'src/core/waitlist/waitlistCapability.ts',
  'src/core/waitlist/waitlistErrors.ts',
  'src/core/waitlist/waitlistMappers.ts',
  'src/core/waitlist/waitlistRepository.ts',
  'src/core/waitlist/waitlistService.ts',
]);

export function isFrozenCoreCapabilityShim(relPath) {
  return FROZEN_CORE_CAPABILITY_SHIMS.has(relPath);
}
