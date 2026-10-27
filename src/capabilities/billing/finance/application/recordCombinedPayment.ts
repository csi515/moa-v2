/**
 * 통합 수납 Application Command.
 * 저장은 기존 atomic RPC/offline 경로를 재사용한다.
 */
import type { CombinedPaymentRequest } from '@/types';
import { recordCombinedPaymentAtomic } from '@/capabilities/billing/finance/combinedPaymentAtomic';
import type { CombinedPaymentAtomicResult } from '@/capabilities/billing/finance/combinedPaymentCommand';

export type { CombinedPaymentAtomicResult as CombinedPaymentResult };

export async function recordCombinedPayment(
  req: CombinedPaymentRequest
): Promise<CombinedPaymentAtomicResult> {
  return recordCombinedPaymentAtomic(req);
}
