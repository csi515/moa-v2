/**
 * Core Pure Domain Predicates & Calculations (순수 도메인 비즈니스 술어 엔진)
 *
 * 원칙:
 * 1. Zero External Dependencies: React, Supabase, 브라우저 DOM 종속성 없음.
 * 2. Deterministic & Pure: 동일 입력에 동일 출력, 외부 상태 변경 없음.
 * 3. Exact Edge-Case Guard: 0원 결제, 1초 전/후 경계값, 음수 재고, 단수 1원 보존.
 */

// ============================================================================
// 1. 금액 & 세금 & 분할 납부 계산 (Pricing, Tax, Installments)
// ============================================================================

export interface BillingCalculationResult {
  baseAmount: number;
  discountAmount: number;
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
}

/**
 * 기본 금액, 할인율, 부가세를 계산하는 순수 함수
 * @param baseAmount 기본 금액 (원)
 * @param discountRate 할인율 (0.0 ~ 1.0 또는 0 ~ 100 정수)
 * @param options 부가세 별도/포함 여부 (기본: VAT 10% 별도 추가)
 */
export function calculateDiscountAndTax(
  baseAmount: number,
  discountRate: number = 0,
  options: { vatIncluded?: boolean } = { vatIncluded: false }
): BillingCalculationResult {
  const safeBase = Math.max(0, Math.floor(Number.isFinite(baseAmount) ? baseAmount : 0));
  
  // 할인율 정규화 (0~1 소수점 또는 0~100 퍼센트 모두 수용)
  let rate = Number.isFinite(discountRate) ? discountRate : 0;
  if (rate > 1) rate = rate / 100;
  rate = Math.max(0, Math.min(1, rate));

  const discountAmount = Math.round(safeBase * rate);
  const netAmount = Math.max(0, safeBase - discountAmount);

  let vatAmount = 0;
  let totalAmount = 0;

  if (options.vatIncluded) {
    // 공급대가(VAT 포함)인 경우: 공급가액과 부가세 역산
    totalAmount = netAmount;
    const supplyValue = Math.round(netAmount / 1.1);
    vatAmount = netAmount - supplyValue;
  } else {
    // 공급가액(VAT 별도)인 경우: 10% 부가세 가산
    vatAmount = Math.round(netAmount * 0.1);
    totalAmount = netAmount + vatAmount;
  }

  return {
    baseAmount: safeBase,
    discountAmount,
    netAmount,
    vatAmount,
    totalAmount,
  };
}

/**
 * N회차 분할 납부 시 1원 단위 나머지 단수를 보존하는 배분 계산
 * 불변식: sum(splits) === totalAmount (1원도 소실되거나 추가되지 않음)
 */
export function calculateBillingSplit(
  totalAmount: number,
  installments: number
): number[] {
  const safeTotal = Math.max(0, Math.floor(Number.isFinite(totalAmount) ? totalAmount : 0));
  const safeCount = Math.max(1, Math.floor(Number.isFinite(installments) ? installments : 1));

  if (safeTotal === 0) {
    return Array.from({ length: safeCount }, () => 0);
  }

  const basePerInstallment = Math.floor(safeTotal / safeCount);
  const remainder = safeTotal % safeCount;

  // 나머지 단수는 첫 회차부터 1원씩 순차 배분하여 합계 불변성 보장
  return Array.from({ length: safeCount }, (_, index) => {
    return index < remainder ? basePerInstallment + 1 : basePerInstallment;
  });
}

/**
 * 중도 해지/환불 위약금 및 실 환불액 계산
 * - 정가 대비 사용 회차/일수 차감
 * - 위약금 기본 10% 공제
 */
export interface MidtermRefundResult {
  originalAmount: number;
  usedAmount: number;
  penaltyAmount: number;
  refundAmount: number;
  isRefundable: boolean;
}

export function calculateMidtermRefund(
  originalAmount: number,
  totalSessions: number,
  usedSessions: number,
  penaltyRate: number = 0.1
): MidtermRefundResult {
  const safeOriginal = Math.max(0, Math.floor(Number.isFinite(originalAmount) ? originalAmount : 0));
  const safeTotal = Math.max(1, Math.floor(Number.isFinite(totalSessions) ? totalSessions : 1));
  const safeUsed = Math.max(0, Math.min(safeTotal, Math.floor(Number.isFinite(usedSessions) ? usedSessions : 0)));
  const safePenaltyRate = Math.max(0, Math.min(1, Number.isFinite(penaltyRate) ? penaltyRate : 0.1));

  // 회당 정규 단가
  const perSessionRate = safeOriginal / safeTotal;
  const usedAmount = Math.round(perSessionRate * safeUsed);
  const remainingBase = Math.max(0, safeOriginal - usedAmount);

  // 총 결제액의 10% 위약금
  const penaltyAmount = Math.round(safeOriginal * safePenaltyRate);
  const rawRefund = remainingBase - penaltyAmount;
  const refundAmount = Math.max(0, rawRefund);

  return {
    originalAmount: safeOriginal,
    usedAmount,
    penaltyAmount,
    refundAmount,
    isRefundable: refundAmount > 0,
  };
}

// ============================================================================
// 2. 미납 및 연체 여부 판정 (Payment & Overdue Predicates)
// ============================================================================

export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';

function parseTimestamp(input: string | Date | number): number {
  if (typeof input === 'number') return Number.isFinite(input) ? input : NaN;
  if (input instanceof Date) return input.getTime();
  if (typeof input === 'string') {
    // YYYY-MM-DD 형식인 경우 해당 날짜의 23:59:59.999 로 마감 정규화
    if (/^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
      const d = new Date(`${input.trim()}T23:59:59.999Z`);
      return d.getTime();
    }
    const parsed = Date.parse(input);
    return Number.isNaN(parsed) ? NaN : parsed;
  }
  return NaN;
}

/**
 * 청구서 납부 기한 경과(연체) 여부 술어 함수
 * @param dueDate 납부 기한 (YYYY-MM-DD 또는 ISO 날짜)
 * @param referenceDate 기준 시각 (미지정 시 현재 시각)
 * @param graceDays 유예 일수 (기본 0일)
 */
export function isInvoiceOverdue(
  dueDate: string | Date,
  referenceDate: string | Date = new Date(),
  graceDays: number = 0
): boolean {
  const dueTs = parseTimestamp(dueDate);
  const refTs = parseTimestamp(referenceDate);

  if (Number.isNaN(dueTs) || Number.isNaN(refTs)) return false;

  const graceMs = Math.max(0, graceDays) * 24 * 60 * 60 * 1000;
  const finalDeadlineTs = dueTs + graceMs;

  return refTs > finalDeadlineTs;
}

/**
 * 청구 금액 대비 수납 상태 종합 판정 술어 함수
 */
export function determinePaymentStatus(
  totalAmount: number,
  paidAmount: number,
  dueDate: string | Date,
  referenceDate: string | Date = new Date()
): PaymentStatus {
  const total = Math.max(0, Number.isFinite(totalAmount) ? totalAmount : 0);
  const paid = Math.max(0, Number.isFinite(paidAmount) ? paidAmount : 0);

  if (total === 0 || paid >= total) {
    return 'paid';
  }

  const overdue = isInvoiceOverdue(dueDate, referenceDate);

  if (overdue) {
    return 'overdue';
  }

  if (paid > 0 && paid < total) {
    return 'partial';
  }

  return 'unpaid';
}

/**
 * 연체 일수(Overdue Days) 계산 술어 함수
 */
export function calculateOverdueDays(
  dueDate: string | Date,
  referenceDate: string | Date = new Date()
): number {
  const dueTs = parseTimestamp(dueDate);
  const refTs = parseTimestamp(referenceDate);

  if (Number.isNaN(dueTs) || Number.isNaN(refTs)) return 0;
  if (refTs <= dueTs) return 0;

  const diffMs = refTs - dueTs;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

// ============================================================================
// 3. 예약 정원 및 예약 가능 여부 판정 (Capacity & Booking Predicates)
// ============================================================================

export interface CapacityCheckParams {
  capacity: number;
  confirmedCount: number;
  lockedCount?: number;
  userAlreadyBooked?: boolean;
}

export interface BookingEligibilityResult {
  canBook: boolean;
  isFull: boolean;
  remainingSeats: number;
  reason?: 'capacity_exceeded' | 'already_booked' | 'invalid_capacity';
}

/**
 * 예약 정원 초과 여부 술어 함수
 */
export function isCapacityExceeded(
  capacity: number,
  confirmedCount: number,
  lockedCount: number = 0
): boolean {
  if (!Number.isFinite(capacity) || capacity <= 0) return true;
  const activeCount = Math.max(0, confirmedCount) + Math.max(0, lockedCount);
  return activeCount >= capacity;
}

/**
 * 예약 가능 여부 종합 판정 술어 함수
 */
export function canBookReservationSlot(
  params: CapacityCheckParams
): BookingEligibilityResult {
  const { capacity, confirmedCount, lockedCount = 0, userAlreadyBooked = false } = params;

  if (!Number.isFinite(capacity) || capacity <= 0) {
    return {
      canBook: false,
      isFull: true,
      remainingSeats: 0,
      reason: 'invalid_capacity',
    };
  }

  if (userAlreadyBooked) {
    return {
      canBook: false,
      isFull: isCapacityExceeded(capacity, confirmedCount, lockedCount),
      remainingSeats: Math.max(0, capacity - (confirmedCount + lockedCount)),
      reason: 'already_booked',
    };
  }

  const activeOccupied = Math.max(0, confirmedCount) + Math.max(0, lockedCount);
  const remainingSeats = Math.max(0, capacity - activeOccupied);

  if (activeOccupied >= capacity) {
    return {
      canBook: false,
      isFull: true,
      remainingSeats: 0,
      reason: 'capacity_exceeded',
    };
  }

  return {
    canBook: true,
    isFull: false,
    remainingSeats,
  };
}

// ============================================================================
// 4. 이용권 유효기간 및 세션 차감 판정 (Pass Validity & Deduction Predicates)
// ============================================================================

export interface PassDeductionInput {
  status: string;
  remainingSessions: number;
  validUntil?: string | Date;
}

export interface PassDeductionDecision {
  canDeduct: boolean;
  remainingAfter: number;
  reason?: 'inactive_status' | 'exhausted' | 'expired' | 'invalid_sessions';
}

/**
 * 특정 시각 기준 이용권 유효기간 내 존재 여부 판정 (마감 1초 전/후 정밀 경계값)
 * - validUntil이 YYYY-MM-DD인 경우 해당일 23:59:59.999까지 유효 판정
 */
export function isPassValidAt(
  validUntil: string | Date | undefined,
  referenceTime: string | Date = new Date()
): boolean {
  if (!validUntil) return true; // 유효기간 무제한인 경우 상시 유효

  const deadlineTs = parseTimestamp(validUntil);
  const currentTs = parseTimestamp(referenceTime);

  if (Number.isNaN(deadlineTs) || Number.isNaN(currentTs)) return false;

  return currentTs <= deadlineTs;
}

/**
 * 이용권 출결/수업 세션 1회 차감 가능 여부 종합 판정 술어 함수
 */
export function canDeductSessionPass(
  pass: PassDeductionInput,
  referenceTime: string | Date = new Date()
): PassDeductionDecision {
  if (pass.status !== 'active') {
    return {
      canDeduct: false,
      remainingAfter: pass.remainingSessions,
      reason: 'inactive_status',
    };
  }

  if (!Number.isFinite(pass.remainingSessions) || pass.remainingSessions <= 0) {
    return {
      canDeduct: false,
      remainingAfter: 0,
      reason: 'exhausted',
    };
  }

  if (!isPassValidAt(pass.validUntil, referenceTime)) {
    return {
      canDeduct: false,
      remainingAfter: pass.remainingSessions,
      reason: 'expired',
    };
  }

  return {
    canDeduct: true,
    remainingAfter: pass.remainingSessions - 1,
  };
}

// ============================================================================
// 5. 재고 및 잔액 안전성 검증 (Inventory & Wallet Balance Guards)
// ============================================================================

export interface StockMovementResult {
  isValid: boolean;
  resultingStock: number;
  error?: 'negative_stock_prevented' | 'invalid_quantity';
}

/**
 * 재고 출고 시 음수 재고 발생 원천 차단 검증 술어 함수
 */
export function validateStockMovement(
  currentStock: number,
  requestQty: number,
  type: 'IN' | 'OUT'
): StockMovementResult {
  const stock = Number.isFinite(currentStock) ? currentStock : 0;
  const qty = Number.isFinite(requestQty) ? requestQty : 0;

  if (qty <= 0) {
    return {
      isValid: false,
      resultingStock: stock,
      error: 'invalid_quantity',
    };
  }

  if (type === 'IN') {
    return {
      isValid: true,
      resultingStock: stock + qty,
    };
  }

  // OUT: 음수 재고 방어
  if (stock - qty < 0) {
    return {
      isValid: false,
      resultingStock: stock,
      error: 'negative_stock_prevented',
    };
  }

  return {
    isValid: true,
    resultingStock: stock - qty,
  };
}

export interface WalletDeductionResult {
  canDeduct: boolean;
  resultingBalance: number;
  error?: 'insufficient_funds' | 'invalid_amount';
}

/**
 * 크레딧/포인트 지갑 출금 시 잔액 0원 및 음수 잔액 방어 술어 함수
 */
export function validateWalletDeduction(
  currentBalance: number,
  deductAmount: number
): WalletDeductionResult {
  const balance = Number.isFinite(currentBalance) ? currentBalance : 0;
  const amount = Number.isFinite(deductAmount) ? deductAmount : 0;

  if (amount <= 0) {
    return {
      canDeduct: false,
      resultingBalance: balance,
      error: 'invalid_amount',
    };
  }

  if (balance < amount) {
    return {
      canDeduct: false,
      resultingBalance: balance,
      error: 'insufficient_funds',
    };
  }

  return {
    canDeduct: true,
    resultingBalance: balance - amount,
  };
}
