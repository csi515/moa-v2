/**
 * Core Loyalty 포인트 도메인 타입
 * (DB: core.point_accounts / core.point_transactions).
 * 사업장×고객 잔액 + 거래 이력. 판매 UI·적립 계산·소멸과 무관.
 */

/** 포인트 거래 유형 — core.point_transaction_type 와 동기화 */
export type PointTransactionType = 'earn' | 'redeem' | 'adjust';

export const POINT_TRANSACTION_TYPES: readonly PointTransactionType[] = [
  'earn',
  'redeem',
  'adjust',
] as const;

export const POINT_TRANSACTION_TYPE_LABELS: Record<PointTransactionType, string> = {
  earn: '적립',
  redeem: '사용',
  adjust: '보정',
};

/** 고객별 사업장 포인트 잔액 */
export interface PointAccount {
  id: string;
  organizationId: string;
  customerId: string;
  balance: number;
  updatedAt: string;
  createdAt: string;
}

/**
 * 포인트 거래 이력.
 * amount는 부호 있는 증감(적립+, 사용-).
 * balanceAfter는 거래 직후 잔액 스냅샷 — 이후 설정 변경으로 재계산하지 않음.
 * earnRatePercent / baseAmount 는 earn 시점 확정값(과거 불변).
 */
export interface PointTransaction {
  id: string;
  organizationId: string;
  customerId: string;
  type: PointTransactionType;
  amount: number;
  balanceAfter: number;
  /** earn 시점 적용 적립률(%). 그 외 유형은 null */
  earnRatePercent: number | null;
  /** earn 대상 결제금액(원) 스냅샷. 그 외 유형은 null */
  baseAmount: number | null;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}
