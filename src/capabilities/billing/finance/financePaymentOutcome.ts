/**
 * 온라인 수납 결과. Remote가 진실 원천이고 local projection은 별도 상태다.
 */
export type RemotePaymentStatus = 'applied' | 'replay' | 'rejected';
export type FinanceMirrorStatus = 'applied' | 'partial' | 'failed' | 'skipped';

export type RemotePaymentResult<T> = {
  status: Exclude<RemotePaymentStatus, 'rejected'>;
  data: T;
};

export type FinanceMirrorResult = {
  status: FinanceMirrorStatus;
  appliedKeys: string[];
  failedKeys: string[];
  errors: string[];
};

export type FinancePaymentOutcome<T> = {
  remote: RemotePaymentResult<T>;
  mirror: FinanceMirrorResult;
};

export function emptyFinanceMirrorResult(status: FinanceMirrorStatus): FinanceMirrorResult {
  return { status, appliedKeys: [], failedKeys: [], errors: [] };
}

export function isRemotePaymentApplied(status: RemotePaymentStatus): boolean {
  return status === 'applied' || status === 'replay';
}

export function summarizeFinanceMirror(result: FinanceMirrorResult): FinanceMirrorStatus {
  if (result.failedKeys.length === 0) return 'applied';
  if (result.appliedKeys.length === 0) return 'failed';
  return 'partial';
}
