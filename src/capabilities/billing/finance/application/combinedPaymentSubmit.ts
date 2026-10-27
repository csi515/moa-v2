/**
 * 통합 수납 submit 조율: 중복 실행 방지, 결과 해석, toast/refresh.
 * 저장은 recordCombinedPayment / atomic에 맡긴다.
 */
import type { CombinedPaymentRequest } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import {
  CombinedPaymentCommandError,
  combinedPaymentFailureMessage,
  isCombinedPaymentFullyApplied,
  type CombinedPaymentAtomicResult,
} from '@/capabilities/billing/finance/combinedPaymentCommand';

export const COMBINED_PAYMENT_EMPTY_SELECTION_MESSAGE =
  '납부할 항목을 1개 이상 선택하고 금액을 입력해주세요.';

export const COMBINED_PAYMENT_INCOMPLETE_MESSAGE =
  '통합 수납이 완료되지 않았습니다. 수강료와 교재비는 함께 반영되지 않았습니다.';

export const COMBINED_PAYMENT_UNKNOWN_ERROR_MESSAGE = '통합 수납 처리 중 오류가 발생했습니다.';

export function combinedPaymentSuccessMessage(params: {
  studentName: string;
  customerLabel: string;
  totalPaidAmount: number;
}): string {
  return `${params.studentName} ${params.customerLabel} 통합 수납 ${formatCurrency(params.totalPaidAmount)} 처리 · 재무 수입에 반영됨`;
}

export function mapCombinedPaymentError(err: unknown): string {
  if (err instanceof CombinedPaymentCommandError) return combinedPaymentFailureMessage(err);
  if (err instanceof Error) return err.message;
  return COMBINED_PAYMENT_UNKNOWN_ERROR_MESSAGE;
}

export type CombinedPaymentSubmitOutcome =
  | { ok: true; totalPaidAmount: number }
  | { ok: false; message: string };

export function interpretCombinedPaymentResult(
  result: CombinedPaymentAtomicResult
): CombinedPaymentSubmitOutcome {
  if (!isCombinedPaymentFullyApplied(result.status)) {
    return { ok: false, message: COMBINED_PAYMENT_INCOMPLETE_MESSAGE };
  }
  return { ok: true, totalPaidAmount: result.totalPaidAmount };
}

export type CombinedPaymentSubmitDeps = {
  busy: { current: boolean };
  request: CombinedPaymentRequest | null;
  execute: (req: CombinedPaymentRequest) => Promise<CombinedPaymentAtomicResult>;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
  triggerRefresh: () => void;
  onSuccess: () => void;
  studentName: string;
  customerLabel: string;
};

export async function runCombinedPaymentSubmit(deps: CombinedPaymentSubmitDeps): Promise<void> {
  if (deps.busy.current) return;
  if (!deps.request) {
    deps.showToast(COMBINED_PAYMENT_EMPTY_SELECTION_MESSAGE, 'warning');
    return;
  }

  deps.busy.current = true;
  try {
    const outcome = interpretCombinedPaymentResult(await deps.execute(deps.request));
    if (outcome.ok === false) {
      deps.showToast(outcome.message, 'error');
      return;
    }
    deps.showToast(
      combinedPaymentSuccessMessage({
        studentName: deps.studentName,
        customerLabel: deps.customerLabel,
        totalPaidAmount: outcome.totalPaidAmount,
      }),
      'success'
    );
    deps.triggerRefresh();
    deps.onSuccess();
  } catch (err: unknown) {
    deps.showToast(mapCombinedPaymentError(err), 'error');
  } finally {
    deps.busy.current = false;
  }
}
