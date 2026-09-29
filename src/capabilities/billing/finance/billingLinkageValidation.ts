import { billingStorage } from '@/capabilities/billing/infrastructure/billingStorage';
import { commerceStorage } from '@/capabilities/commerce/infrastructure/commerceStorage';
import { findIncomeByPaymentSource } from '@/capabilities/billing/finance/billingIncomeLink';

export type BillingValidationResult = {
  id: string;
  ok: boolean;
  message: string;
};

/**
 * 수납↔수입 연결 스모크 검증 (로컬 스토리지 기준).
 * UI/개발자 콘솔에서 billingStorage / commerceStorage + 이 함수로 확인 가능.
 */
export function runBillingLinkageValidation(): BillingValidationResult[] {
  const results: BillingValidationResult[] = [];

  const tuitionPayments = billingStorage.getTuitionPayments();
  const textbookPayments = commerceStorage.getTextbookPayments();
  const incomes = billingStorage.getIncomeEntries();

  for (const p of tuitionPayments) {
    const income = findIncomeByPaymentSource('tuition', p.id);
    results.push({
      id: `tuition-payment-${p.id}`,
      ok: !!income && income.amount === p.amount,
      message: income
        ? `월회비 납부 ${p.amount} ↔ 수입 연결 OK`
        : `월회비 납부 ${p.id}에 연동 수입 없음`,
    });
  }

  for (const p of textbookPayments) {
    const income = findIncomeByPaymentSource('textbook', p.id);
    results.push({
      id: `textbook-payment-${p.id}`,
      ok: !!income && income.amount === p.amount,
      message: income
        ? `교재 납부 ${p.amount} ↔ 수입 연결 OK`
        : `교재 납부 ${p.id}에 연동 수입 없음`,
    });
  }

  const linkedOrphans = incomes.filter(
    (e) =>
      (e.sourceType === 'tuition' || e.sourceType === 'textbook') &&
      e.sourceId &&
      !tuitionPayments.some((p) => p.id === e.sourceId) &&
      !textbookPayments.some((p) => p.id === e.sourceId)
  );
  results.push({
    id: 'orphan-linked-income',
    ok: linkedOrphans.length === 0,
    message:
      linkedOrphans.length === 0
        ? '고아 연동 수입 없음'
        : `고아 연동 수입 ${linkedOrphans.length}건`,
  });

  const summary = billingStorage.getFinanceSummary('piano');
  const entrySum = incomes
    .filter((e) => e.date.startsWith(summary.currentYearMonth))
    .reduce((s, e) => s + e.amount, 0);
  results.push({
    id: 'summary-matches-entries',
    ok: summary.totalIncomeThisMonth === entrySum,
    message:
      summary.totalIncomeThisMonth === entrySum
        ? '재무 요약 = IncomeEntry 합계 (이중합산 없음)'
        : `요약(${summary.totalIncomeThisMonth}) ≠ entries(${entrySum})`,
  });

  return results;
}

/** 시나리오 체크리스트 (수동 QA) */
export const BILLING_SCENARIO_CHECKLIST = [
  '1. 월회비+교재 청구 후 전액 납 → 항목 완납, 미납0, Income 합계 일치',
  '2. 월회비만 납 → 교재 미납 유지, Income=월회비만',
  '3. 항목별 부분납(예: 150k+10k) → 잔액 명확, 자동배분 없음',
  '4. 교재만 완납 / 월회비 미납 표현',
  '5. 일반 수입 수동 입력 → charge 미연결, 총수입 포함',
  '6. 연동 수입 삭제 → charge·미납·income 동시 복원',
  '7. backfillBillingLinkedIncome 후 동일 납부 이중 Income 없음',
] as const;
