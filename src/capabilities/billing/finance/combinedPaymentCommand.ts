/**
 * 통합 수납 command 계약.
 * 결제 금액 계산은 기존 tuition/textbook RPC에 맡긴다.
 */
import type { CombinedPaymentRequest, TextbookPayment, TuitionInvoice } from '@/types';

export type CombinedPaymentItemKind = 'tuition' | 'textbook';

export type CombinedTuitionItem = {
  invoiceId: string;
  amount: number;
  idempotencyKey: string;
};

export type CombinedTextbookItem = {
  saleId: string;
  amount: number;
  idempotencyKey: string;
  studentName?: string;
  textbookTitle?: string;
  billingInvoiceId?: string;
};

export type CombinedPaymentCommand = {
  commandKey: string;
  tuitionItems: CombinedTuitionItem[];
  textbookItems: CombinedTextbookItem[];
};

export type CombinedPaymentStatus = 'applied' | 'replay';

export type CombinedPaymentAtomicResult = {
  status: CombinedPaymentStatus;
  tuitionInvoice?: TuitionInvoice;
  textbookPayments: TextbookPayment[];
  totalPaidAmount: number;
  appliedTuitionInvoiceIds: string[];
  appliedTextbookSaleIds: string[];
};

export class CombinedPaymentCommandError extends Error {
  readonly appliedTuitionInvoiceIds: string[];
  readonly appliedTextbookSaleIds: string[];
  readonly compensated: boolean;

  constructor(params: {
    message: string;
    appliedTuitionInvoiceIds?: string[];
    appliedTextbookSaleIds?: string[];
    compensated?: boolean;
  }) {
    super(params.message);
    this.name = 'CombinedPaymentCommandError';
    this.appliedTuitionInvoiceIds = params.appliedTuitionInvoiceIds ?? [];
    this.appliedTextbookSaleIds = params.appliedTextbookSaleIds ?? [];
    this.compensated = params.compensated === true;
  }
}

export function combinedPaymentFailureMessage(err: CombinedPaymentCommandError): string {
  if (err.appliedTuitionInvoiceIds.length === 0 && err.appliedTextbookSaleIds.length === 0) {
    return err.compensated
      ? '통합 수납이 완료되지 않았습니다. 부분 반영분은 되돌렸습니다.'
      : '통합 수납이 완료되지 않았습니다. 수강료와 교재비는 함께 반영되지 않았습니다.';
  }
  return (
    `통합 수납이 완료되지 않았습니다. 반영된 항목: 수강료 ${err.appliedTuitionInvoiceIds.length}건, ` +
    `교재 ${err.appliedTextbookSaleIds.length}건. 다시 시도해도 같은 항목은 중복 결제되지 않습니다.`
  );
}

export function isCombinedPaymentFullyApplied(status: string): boolean {
  return status === 'applied' || status === 'replay';
}

function fnvPairHex(canonical: string): string {
  let h1 = 2166136261;
  let h2 = 2166136261 ^ 0x9e3779b9;
  for (let i = 0; i < canonical.length; i += 1) {
    const code = canonical.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 16777619);
    h2 ^= code + i;
    h2 = Math.imul(h2, 16777619);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export function hashCombinedPaymentCanonical(canonical: string): string {
  return `cmb:${fnvPairHex(canonical)}`;
}

export function combinedPaymentItemKey(
  commandKey: string,
  kind: CombinedPaymentItemKind,
  targetId: string
): string {
  const tag = kind === 'tuition' ? 't' : 'b';
  return `${commandKey}:${tag}:${targetId}`;
}

export function resolveCombinedTuitionItems(req: CombinedPaymentRequest): { invoiceId: string; amount: number }[] {
  if (req.tuitionPayments && req.tuitionPayments.length > 0) {
    return req.tuitionPayments
      .map((item) => ({ invoiceId: item.invoiceId, amount: item.amount }))
      .filter((item) => item.amount > 0 && item.invoiceId);
  }
  return [];
}

/** 월청구 합산 교재는 수강료 완납 정산 경로만 사용한다. */
export function excludeLinkedTextbookPayments(
  items: Array<{ saleId: string; amount: number; billingInvoiceId?: string }>
): Array<{ saleId: string; amount: number; billingInvoiceId?: string }> {
  return items.filter((item) => item.amount > 0 && item.saleId && !item.billingInvoiceId);
}

export function buildCombinedPaymentCommand(params: {
  organizationId: string;
  request: CombinedPaymentRequest;
  textbookMeta?: Record<string, { studentName?: string; textbookTitle?: string; billingInvoiceId?: string }>;
  fallbackInvoiceId?: string;
}): CombinedPaymentCommand {
  const req = params.request;
  let tuitionSource = resolveCombinedTuitionItems(req);
  if (
    tuitionSource.length === 0 &&
    req.tuitionAmount &&
    req.tuitionAmount > 0 &&
    params.fallbackInvoiceId
  ) {
    tuitionSource = [{ invoiceId: params.fallbackInvoiceId, amount: req.tuitionAmount }];
  }

  const textbookSource = excludeLinkedTextbookPayments(
    (req.textbookPayments || []).map((item) => ({
      saleId: item.saleId,
      amount: item.amount,
      billingInvoiceId: params.textbookMeta?.[item.saleId]?.billingInvoiceId,
    }))
  );

  const tuitionCanon = [...tuitionSource]
    .sort((a, b) => a.invoiceId.localeCompare(b.invoiceId))
    .map((item) => `${item.invoiceId}=${item.amount}`)
    .join(',');
  const textbookCanon = [...textbookSource]
    .sort((a, b) => a.saleId.localeCompare(b.saleId))
    .map((item) => `${item.saleId}=${item.amount}`)
    .join(',');
  const canonical = [
    params.organizationId,
    req.studentId,
    req.yearMonth,
    req.paymentMethod,
    req.paymentDate,
    req.memo ?? '',
    `t:${tuitionCanon}`,
    `b:${textbookCanon}`,
  ].join('|');

  const commandKey = req.commandKey || hashCombinedPaymentCanonical(canonical);
  const tuitionItems = tuitionSource.map((item) => ({
    invoiceId: item.invoiceId,
    amount: item.amount,
    idempotencyKey: combinedPaymentItemKey(commandKey, 'tuition', item.invoiceId),
  }));
  const textbookItems = textbookSource.map((item) => {
    const meta = params.textbookMeta?.[item.saleId];
    return {
      saleId: item.saleId,
      amount: item.amount,
      idempotencyKey: combinedPaymentItemKey(commandKey, 'textbook', item.saleId),
      studentName: meta?.studentName,
      textbookTitle: meta?.textbookTitle,
    };
  });

  return { commandKey, tuitionItems, textbookItems };
}

export type CombinedLedgerLine = {
  id: string;
  billed: number;
  paid: number;
  kind: CombinedPaymentItemKind;
  linked?: boolean;
};

export type CombinedPaymentAttempt = {
  commandKey: string;
  tuition: Array<{ id: string; amount: number; fail?: boolean }>;
  textbooks: Array<{ id: string; amount: number; fail?: boolean }>;
};

export type CombinedPaymentModelResult = {
  action: 'applied' | 'replay' | 'rolled_back';
  lines: CombinedLedgerLine[];
  appliedTuition: number[];
  appliedTextbook: number[];
  textbooksProcessed: boolean;
  settledLinkedIds: string[];
};

function applyLineAmount(line: CombinedLedgerLine, request: number): number {
  const remaining = Math.max(0, line.billed - line.paid);
  return Math.min(Math.max(0, request), remaining);
}

/** 한 트랜잭션 모델. 중간 실패 시 시작 잔액으로 롤백한다. */
export function modelCombinedPaymentTransaction(params: {
  lines: CombinedLedgerLine[];
  attempt: CombinedPaymentAttempt;
  succeededCommandKeys?: ReadonlySet<string>;
}): CombinedPaymentModelResult {
  const start = params.lines.map((line) => ({ ...line }));
  if (params.succeededCommandKeys?.has(params.attempt.commandKey)) {
    return {
      action: 'replay',
      lines: start,
      appliedTuition: params.attempt.tuition.map(() => 0),
      appliedTextbook: params.attempt.textbooks.map(() => 0),
      textbooksProcessed: false,
      settledLinkedIds: [],
    };
  }

  const next = start.map((line) => ({ ...line }));
  const appliedTuition: number[] = [];
  const appliedTextbook: number[] = [];

  for (const item of params.attempt.tuition) {
    if (item.fail) {
      return {
        action: 'rolled_back',
        lines: start,
        appliedTuition,
        appliedTextbook: [],
        textbooksProcessed: false,
        settledLinkedIds: [],
      };
    }
    const line = next.find((row) => row.id === item.id && row.kind === 'tuition');
    const apply = line ? applyLineAmount(line, item.amount) : 0;
    if (line) line.paid += apply;
    appliedTuition.push(apply);
  }

  for (const item of params.attempt.textbooks) {
    const line = next.find((row) => row.id === item.id && row.kind === 'textbook');
    if (line?.linked) {
      appliedTextbook.push(0);
      continue;
    }
    if (item.fail) {
      return {
        action: 'rolled_back',
        lines: start,
        appliedTuition: [],
        appliedTextbook,
        textbooksProcessed: true,
        settledLinkedIds: [],
      };
    }
    const apply = line ? applyLineAmount(line, item.amount) : 0;
    if (line) line.paid += apply;
    appliedTextbook.push(apply);
  }

  const settledLinkedIds: string[] = [];
  const anyTuitionPaid = next.some((row) => row.kind === 'tuition' && row.paid >= row.billed);
  if (anyTuitionPaid) {
    for (const linked of next.filter((row) => row.kind === 'textbook' && row.linked)) {
      if (linked.paid < linked.billed) {
        linked.paid = linked.billed;
        settledLinkedIds.push(linked.id);
      }
    }
  }

  return {
    action: 'applied',
    lines: next,
    appliedTuition,
    appliedTextbook,
    textbooksProcessed: true,
    settledLinkedIds,
  };
}
