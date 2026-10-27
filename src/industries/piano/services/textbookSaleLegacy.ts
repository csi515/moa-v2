/**
 * 교재 판매/수납 legacy localStorage 경계.
 * - 자동 서버 업로드 금지
 * - DB 행과 id가 겹치면 DB 우선(중복 생성 방지)
 * - localStorage 즉시 삭제 금지
 */
import type { TextbookPayment, TextbookSale } from '@/types';

/** DB에 없는 local-only 행 (legacy). coreSaleId 있어도 DB 미반영이면 legacy로 취급. */
export function pickLegacyTextbookSales(
  localSales: TextbookSale[],
  dbSales: TextbookSale[]
): TextbookSale[] {
  const dbIds = new Set(dbSales.map((s) => s.id));
  return localSales.filter((s) => !dbIds.has(s.id));
}

export function pickLegacyTextbookPayments(
  localPayments: TextbookPayment[],
  dbPayments: TextbookPayment[]
): TextbookPayment[] {
  const dbIds = new Set(dbPayments.map((p) => p.id));
  const dbSaleIds = new Set(
    // 호출측에서 sale merge 후 전달 가능 — payment만으로도 id 중복 방지
    dbPayments.map((p) => p.id)
  );
  void dbSaleIds;
  return localPayments.filter((p) => !dbIds.has(p.id));
}

/** DB SoT + legacy 표시용 병합 (DB 먼저) */
export function mergeTextbookSalesWithLegacy(
  dbSales: TextbookSale[],
  localSales: TextbookSale[]
): TextbookSale[] {
  const legacy = pickLegacyTextbookSales(localSales, dbSales);
  return [...dbSales, ...legacy];
}

export function mergeTextbookPaymentsWithLegacy(
  dbPayments: TextbookPayment[],
  localPayments: TextbookPayment[]
): TextbookPayment[] {
  const legacy = pickLegacyTextbookPayments(localPayments, dbPayments);
  return [...dbPayments, ...legacy];
}

/**
 * 명시적 backfill용 — 자동 실행하지 않음.
 * local-only 판매를 DB로 올리는 작업은 운영자가 별도 호출해야 한다.
 */
export function listLegacyTextbookSalesForManualBackfill(
  localSales: TextbookSale[],
  dbSales: TextbookSale[]
): TextbookSale[] {
  return pickLegacyTextbookSales(localSales, dbSales);
}
