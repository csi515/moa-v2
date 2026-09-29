/** 교재비 동시 수납 모델 — lock 후 remaining clip */
export function modelSerializedTextbookPayments(params: {
  total: number;
  paid: number;
  requests: number[];
}): { paid: number; applied: number[] } {
  let paid = params.paid;
  const applied: number[] = [];
  for (const req of params.requests) {
    const remaining = Math.max(0, params.total - paid);
    const apply = Math.min(Math.max(0, req), remaining);
    paid += apply;
    applied.push(apply);
  }
  return { paid, applied };
}
