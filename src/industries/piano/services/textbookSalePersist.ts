import type { PaymentMethod, TextbookPayment, TextbookSale } from '@/types';
import type { IncomeEntry } from '@/core/finance/types';

function buildReceiptNumber(): string {
  const now = new Date();
  const ymStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const randNum = String(Math.floor(Math.random() * 900) + 100);
  return `RCP-TB-${ymStr}-${randNum}`;
}

function newEntityId(): string {
  return crypto.randomUUID();
}

/** Core 성공 후 DB/로컬 persist 실패 시 보상 — 테스트에서 deps 주입 가능 */
export type CreateSalePersistDeps = {
  insertSale: (orgId: string, sale: TextbookSale) => Promise<TextbookSale>;
  insertPayment: (orgId: string, payment: TextbookPayment) => Promise<TextbookPayment>;
  deleteSale: (orgId: string, saleId: string) => Promise<void>;
  compensateCoreSale: (coreSaleId: string) => Promise<unknown>;
  upsertLinkedIncome: (params: {
    sourceType: 'textbook';
    paymentId: string;
    date: string;
    amount: number;
    paymentMethod: PaymentMethod;
    description: string;
    payer: string;
    memo?: string;
  }) => IncomeEntry;
};

/**
 * Core Sale 생성 이후 piano DB persist + 초기 수납·수입 연동.
 * persist 실패 시 coreSaleId가 있으면 compensateCoreSale 호출 후 에러를 다시 던진다.
 */
export async function persistSaleAfterCoreSuccess(params: {
  orgId: string;
  newSale: TextbookSale;
  coreSaleId: string;
  initialPaid: number;
  saleDate: string;
  paymentMethod?: PaymentMethod | null;
  textbookTitle: string;
  studentName: string;
  nowIso: string;
  deps: CreateSalePersistDeps;
}): Promise<{ payment?: TextbookPayment }> {
  const deps = params.deps;

  let payment: TextbookPayment | undefined;
  try {
    await deps.insertSale(params.orgId, params.newSale);

    if (params.initialPaid > 0) {
      payment = {
        textbookSaleId: params.newSale.id,
        studentId: params.newSale.studentId,
        studentName: params.studentName,
        textbookTitle: params.textbookTitle,
        paymentDate: params.saleDate,
        amount: params.initialPaid,
        paymentMethod: params.paymentMethod || 'card',
        memo: '교재 판매 시 현장 수납',
        id: newEntityId(),
        receiptNumber: buildReceiptNumber(),
        createdAt: params.nowIso,
      };
      try {
        payment = await deps.insertPayment(params.orgId, payment);
      } catch (payErr) {
        try {
          await deps.deleteSale(params.orgId, params.newSale.id);
        } catch (delErr) {
          console.error('[createSale] 수납 실패 후 판매 롤백 실패', delErr);
        }
        throw payErr;
      }
      deps.upsertLinkedIncome({
        sourceType: 'textbook',
        paymentId: payment.id,
        date: params.saleDate,
        amount: params.initialPaid,
        paymentMethod: params.paymentMethod || 'card',
        description: `교재비 · ${params.textbookTitle} · ${params.studentName}`,
        payer: params.studentName,
        memo: '교재 판매 시 현장 수납',
      });
    }
  } catch (persistError) {
    if (params.coreSaleId) {
      try {
        await deps.compensateCoreSale(params.coreSaleId);
      } catch (compensateError) {
        console.error('[createSale] Core 보상 반품 실패', compensateError);
      }
    }
    throw persistError;
  }

  return { payment };
}

/** DB 우선 수납 — local mirror는 호출측에서 성공 후에만 갱신 */
export type RecordPaymentDbDeps = {
  getSale: (orgId: string, saleId: string) => Promise<TextbookSale | null>;
  insertPayment: (orgId: string, payment: TextbookPayment) => Promise<TextbookPayment>;
  updateSale: (orgId: string, saleId: string, sale: TextbookSale) => Promise<TextbookSale>;
  deletePayment: (orgId: string, paymentId: string) => Promise<void>;
};

export async function recordPaymentOnDb(params: {
  orgId: string;
  saleId: string;
  payment: TextbookPayment;
  updatedSale: TextbookSale;
  deps: RecordPaymentDbDeps;
}): Promise<TextbookPayment> {
  const dbSale = await params.deps.getSale(params.orgId, params.saleId);
  if (!dbSale) {
    throw new Error(
      '교재 판매가 DB에 없습니다. legacy 전용 건이거나 동기화되지 않은 판매에는 DB 모드에서 수납할 수 없습니다.'
    );
  }

  const savedPayment = await params.deps.insertPayment(params.orgId, params.payment);
  try {
    await params.deps.updateSale(params.orgId, params.saleId, params.updatedSale);
  } catch (updErr) {
    try {
      await params.deps.deletePayment(params.orgId, savedPayment.id);
    } catch (delErr) {
      console.error('[recordTextbookPayment] 판매 갱신 실패 후 수납 롤백 실패', delErr);
    }
    throw updErr;
  }
  return savedPayment;
}

/** DB 우선 수납 취소 — 성공 후에만 local 갱신 */
export type ReversePaymentDbDeps = {
  deletePayment: (orgId: string, paymentId: string) => Promise<void>;
  updateSale: (orgId: string, saleId: string, sale: TextbookSale) => Promise<TextbookSale>;
};

export async function reversePaymentOnDb(params: {
  orgId: string;
  paymentId: string;
  updatedSale: TextbookSale | null;
  deps: ReversePaymentDbDeps;
}): Promise<void> {
  await params.deps.deletePayment(params.orgId, params.paymentId);
  if (params.updatedSale) {
    await params.deps.updateSale(params.orgId, params.updatedSale.id, params.updatedSale);
  }
}

/**
 * DB 모드 판매 취소의 DB 단계.
 * - DB에 판매가 있으면 payments+sale 삭제 필수(실패 시 throw)
 * - DB에 없으면 legacy-only로 간주하고 DB 삭제 생략
 */
export type CancelSaleDbDeps = {
  getSale: (orgId: string, saleId: string) => Promise<TextbookSale | null>;
  deletePaymentsForSale: (orgId: string, saleId: string) => Promise<TextbookPayment[]>;
  deleteSale: (orgId: string, saleId: string) => Promise<void>;
  insertPayment: (orgId: string, payment: TextbookPayment) => Promise<TextbookPayment>;
};

export async function cancelSaleOnDb(params: {
  orgId: string;
  saleId: string;
  deps: CancelSaleDbDeps;
}): Promise<{ legacyOnly: boolean }> {
  const dbSale = await params.deps.getSale(params.orgId, params.saleId);
  if (!dbSale) {
    return { legacyOnly: true };
  }
  const removedPayments = await params.deps.deletePaymentsForSale(params.orgId, params.saleId);
  try {
    await params.deps.deleteSale(params.orgId, params.saleId);
  } catch (delSaleErr) {
    for (const payment of removedPayments) {
      try {
        await params.deps.insertPayment(params.orgId, payment);
      } catch (restoreErr) {
        console.error('[cancelSale] 판매 삭제 실패 후 수납 복구 실패', restoreErr);
      }
    }
    throw delSaleErr;
  }
  return { legacyOnly: false };
}
