export type TuitionPaymentRpcClass =
  | { kind: 'applied' }
  | { kind: 'already_paid' }
  | { kind: 'invalid_amount' }
  | { kind: 'failed'; message: string };

/** RPC 오류와 성공 응답을 구분한다. 로컬 mirror는 성공 근거가 아니다. */
export function classifyTuitionPaymentRpcResult(input: {
  errorMessage?: string | null;
  invoice?: unknown;
}): TuitionPaymentRpcClass {
  const message = (input.errorMessage || '').trim();
  if (message.includes('Invoice already paid')) return { kind: 'already_paid' };
  if (message.includes('Invalid payment amount')) return { kind: 'invalid_amount' };
  if (message) return { kind: 'failed', message };
  if (input.invoice) return { kind: 'applied' };
  return { kind: 'failed', message: '수강료 수납 응답이 비어 있습니다.' };
}

export function tuitionPaymentRejectMessage(classified: TuitionPaymentRpcClass): string {
  if (classified.kind === 'already_paid') {
    return '이미 완납된 청구서입니다. 최신 상태를 반영했습니다.';
  }
  if (classified.kind === 'invalid_amount') {
    return '납부 금액이 올바르지 않습니다. 최신 청구 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  if (classified.kind === 'failed') return classified.message;
  return '수강료 수납에 실패했습니다.';
}

/** UI는 applied일 때만 수납 성공 toast를 보여야 한다. */
export function isTuitionPaymentApplied(classified: TuitionPaymentRpcClass): boolean {
  return classified.kind === 'applied';
}
