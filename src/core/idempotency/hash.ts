/** 요청 본문 정규 문자열. SQL core.idempotency_request_hash 입력과 같아야 한다. */

export function bookingIdempotencyCanonical(input: {
  organizationId: string;
  bookingId: string;
  status: string;
  consumeOnNoShow: boolean;
}): string {
  return `${input.organizationId}:${input.bookingId}:${input.status}:${input.consumeOnNoShow}`;
}

function canonicalMoney(amount: string | number): string {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
}

function canonicalMemo(memo: string | null | undefined): string {
  return memo === null || memo === undefined ? 'n' : `s:${memo}`;
}

function canonicalBool(value: boolean | null | undefined): string {
  return value === true ? 'true' : 'false';
}

/** SQL core.tuition_payment_idempotency_canonical 과 동일해야 한다. */
export function paymentIdempotencyCanonical(input: {
  organizationId: string;
  invoiceId: string;
  amount: string | number;
  method: string;
  paidAt: string;
  memo?: string | null;
  cashReceiptIssued?: boolean | null;
}): string {
  return [
    input.organizationId,
    input.invoiceId,
    canonicalMoney(input.amount),
    input.method,
    input.paidAt,
    canonicalMemo(input.memo),
    canonicalBool(input.cashReceiptIssued),
  ].join(':');
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
