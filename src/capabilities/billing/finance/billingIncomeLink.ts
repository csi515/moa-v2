import type { PaymentMethod, TuitionPayment, TextbookPayment } from '@/types';
import type { IncomeEntry } from '@/capabilities/billing/finance/types';
import { STORAGE_KEYS } from '@/services/adapters/storageKeys';
import { generateEntityId, getItem, setItem } from '@/services/storage/helpers';

type LinkedIncomeSource = 'tuition' | 'textbook' | 'booking' | 'retail';

function defaultCategory(sourceType: LinkedIncomeSource): string {
  if (sourceType === 'tuition') return 'membership';
  if (sourceType === 'textbook' || sourceType === 'retail') return 'product';
  if (sourceType === 'booking') return 'session';
  return 'other';
}

/** 납부/예약/판매 → 재무 수입 연결 (sourceId 기준 중복 방지) */
export function findIncomeByPaymentSource(
  sourceType: LinkedIncomeSource,
  paymentId: string
): IncomeEntry | undefined {
  return getItem<IncomeEntry[]>(STORAGE_KEYS.INCOME_ENTRIES, []).find(
    (e) => e.sourceType === sourceType && e.sourceId === paymentId
  );
}

/**
 * Skin 등 retail IncomeEntry 판매에 대한 반품 반전 기록.
 * - 원본 판매 income(sourceId=saleId)은 삭제·수정하지 않음
 * - sourceId=returnId 로 idempotent (동일 반품 재처리 시 중복 생성 없음)
 * - amount는 음수(반전)
 */
export function recordRetailSaleReturnIncomeReversal(params: {
  saleId: string;
  returnId: string;
  /** 반품 금액(양수) → 음수 income으로 기록 */
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  description: string;
  payer?: string;
}): IncomeEntry | null {
  const returnId = String(params.returnId || '').trim();
  const saleId = String(params.saleId || '').trim();
  const amount = Math.abs(Number(params.amount) || 0);
  if (!returnId || !saleId || amount <= 0) return null;

  const existing = findIncomeByPaymentSource('retail', returnId);
  if (existing) return existing;

  return upsertLinkedIncome({
    sourceType: 'retail',
    paymentId: returnId,
    date: params.date,
    amount: -amount,
    paymentMethod: params.paymentMethod,
    description: params.description,
    payer: params.payer || '',
    memo: `saleId=${saleId};returnId=${returnId}`,
    category: 'product',
  });
}

export function upsertLinkedIncome(params: {
  sourceType: LinkedIncomeSource;
  paymentId: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string;
  payer: string;
  memo?: string;
  category?: string;
}): IncomeEntry {
  const list = getItem<IncomeEntry[]>(STORAGE_KEYS.INCOME_ENTRIES, []);
  const existing = list.find(
    (e) => e.sourceType === params.sourceType && e.sourceId === params.paymentId
  );

  const entry: IncomeEntry = {
    id: existing?.id || generateEntityId('inc'),
    date: params.date,
    category: params.category || defaultCategory(params.sourceType),
    amount: params.amount,
    paymentMethod: params.paymentMethod,
    description: params.description,
    payer: params.payer,
    memo: params.memo,
    sourceType: params.sourceType,
    sourceId: params.paymentId,
  };

  if (existing) {
    const idx = list.findIndex((e) => e.id === existing.id);
    list[idx] = entry;
  } else {
    list.unshift(entry);
  }
  setItem(STORAGE_KEYS.INCOME_ENTRIES, list);
  return entry;
}

export function deleteLinkedIncome(
  sourceType: LinkedIncomeSource,
  paymentId: string
): boolean {
  const list = getItem<IncomeEntry[]>(STORAGE_KEYS.INCOME_ENTRIES, []);
  const filtered = list.filter(
    (e) => !(e.sourceType === sourceType && e.sourceId === paymentId)
  );
  if (filtered.length === list.length) return false;
  setItem(STORAGE_KEYS.INCOME_ENTRIES, filtered);
  return true;
}

export function deleteLinkedIncomesForPaymentIds(
  sourceType: LinkedIncomeSource,
  paymentIds: string[]
): number {
  if (paymentIds.length === 0) return 0;
  const idSet = new Set(paymentIds);
  const list = getItem<IncomeEntry[]>(STORAGE_KEYS.INCOME_ENTRIES, []);
  const filtered = list.filter(
    (e) => !(e.sourceType === sourceType && e.sourceId && idSet.has(e.sourceId))
  );
  const removed = list.length - filtered.length;
  if (removed > 0) setItem(STORAGE_KEYS.INCOME_ENTRIES, filtered);
  return removed;
}

export function getTuitionPayments(): TuitionPayment[] {
  return getItem<TuitionPayment[]>(STORAGE_KEYS.TUITION_PAYMENTS, []);
}

export function saveTuitionPaymentDirect(
  data: Omit<TuitionPayment, 'id' | 'createdAt' | 'receiptNumber'> & {
    receiptNumber?: string;
  }
): TuitionPayment {
  const list = getTuitionPayments();
  const now = new Date();
  const ymStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const payment: TuitionPayment = {
    ...data,
    id: generateEntityId('tup'),
    receiptNumber:
      data.receiptNumber ||
      `RCP-TU-${ymStr}-${String(Math.floor(Math.random() * 900) + 100)}`,
    createdAt: now.toISOString(),
  };
  list.unshift(payment);
  setItem(STORAGE_KEYS.TUITION_PAYMENTS, list);
  return payment;
}

/** 과거 납부분 → IncomeEntry backfill (중복 방지) */
export function backfillLinkedIncomeFromPayments(): {
  tuitionCreated: number;
  textbookCreated: number;
} {
  let tuitionCreated = 0;
  let textbookCreated = 0;

  for (const p of getTuitionPayments()) {
    if (findIncomeByPaymentSource('tuition', p.id)) continue;
    upsertLinkedIncome({
      sourceType: 'tuition',
      paymentId: p.id,
      date: p.paymentDate,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      description: `${p.yearMonth} 수강료 · ${p.studentName}`,
      payer: p.studentName,
      memo: p.memo,
    });
    tuitionCreated++;
  }

  const textbookPayments = getItem<TextbookPayment[]>(STORAGE_KEYS.TEXTBOOK_PAYMENTS, []);
  for (const p of textbookPayments) {
    if (findIncomeByPaymentSource('textbook', p.id)) continue;
    upsertLinkedIncome({
      sourceType: 'textbook',
      paymentId: p.id,
      date: p.paymentDate,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      description: `교재비 · ${p.textbookTitle || ''} · ${p.studentName || ''}`.trim(),
      payer: p.studentName || '',
      memo: p.memo,
    });
    textbookCreated++;
  }

  return { tuitionCreated, textbookCreated };
}
