/**
 * Core 성공 후 local/DB persist 실패 시 보상 경로 unit test
 * 실행: npm run test:textbook-sale-compensate
 */
import assert from 'node:assert/strict';
import type { TextbookSale } from '@/types';
import { persistSaleAfterCoreSuccess } from './textbookSalePersist';

function baseSale(id: string): TextbookSale {
  return {
    id,
    studentId: 's1',
    studentName: '학생',
    parentName: '학부모',
    parentPhone: '',
    textbookId: 'tb1',
    textbookTitle: '교재',
    saleDate: '2026-09-22',
    quantity: 1,
    unitPrice: 10000,
    discount: 0,
    totalAmount: 10000,
    paidAmount: 0,
    unpaidAmount: 10000,
    status: 'unpaid',
    coreSaleId: 'core-sale-1',
    createdAt: '2026-09-22T00:00:00.000Z',
    updatedAt: '2026-09-22T00:00:00.000Z',
  };
}

async function run() {
  let compensateCalls = 0;
  let insertCalls = 0;

  await assert.rejects(
    () =>
      persistSaleAfterCoreSuccess({
        orgId: 'org-1',
        newSale: baseSale('sale-1'),
        coreSaleId: 'core-sale-1',
        initialPaid: 0,
        saleDate: '2026-09-22',
        textbookTitle: '교재',
        studentName: '학생',
        nowIso: '2026-09-22T00:00:00.000Z',
        deps: {
          insertSale: async () => {
            insertCalls += 1;
            throw new Error('local persist failed');
          },
          insertPayment: async (_org, payment) => payment,
          deleteSale: async () => undefined,
          compensateCoreSale: async () => {
            compensateCalls += 1;
            return { ok: true };
          },
          upsertLinkedIncome: () => {
            throw new Error('should not upsert income when insertSale fails');
          },
        },
      }),
    /local persist failed/
  );

  assert.equal(insertCalls, 1);
  assert.equal(compensateCalls, 1, 'Core 보상은 persist 실패 시 반드시 1회 호출');

  let deleteSaleCalls = 0;
  compensateCalls = 0;
  await assert.rejects(
    () =>
      persistSaleAfterCoreSuccess({
        orgId: 'org-1',
        newSale: { ...baseSale('sale-2'), paidAmount: 5000, unpaidAmount: 5000, status: 'partial' },
        coreSaleId: 'core-sale-2',
        initialPaid: 5000,
        saleDate: '2026-09-22',
        paymentMethod: 'card',
        textbookTitle: '교재',
        studentName: '학생',
        nowIso: '2026-09-22T00:00:00.000Z',
        deps: {
          insertSale: async (_org, sale) => sale,
          insertPayment: async () => {
            throw new Error('payment persist failed');
          },
          deleteSale: async () => {
            deleteSaleCalls += 1;
          },
          compensateCoreSale: async () => {
            compensateCalls += 1;
          },
          upsertLinkedIncome: () => {
            throw new Error('should not upsert when payment fails');
          },
        },
      }),
    /payment persist failed/
  );
  assert.equal(deleteSaleCalls, 1);
  assert.equal(compensateCalls, 1);

  let incomeCalls = 0;
  compensateCalls = 0;
  const ok = await persistSaleAfterCoreSuccess({
    orgId: 'org-1',
    newSale: { ...baseSale('sale-3'), paidAmount: 10000, unpaidAmount: 0, status: 'paid' },
    coreSaleId: 'core-sale-3',
    initialPaid: 10000,
    saleDate: '2026-09-22',
    paymentMethod: 'card',
    textbookTitle: '교재',
    studentName: '학생',
    nowIso: '2026-09-22T00:00:00.000Z',
    deps: {
      insertSale: async (_org, sale) => sale,
      insertPayment: async (_org, payment) => ({ ...payment, id: 'tp-ok' }),
      deleteSale: async () => {
        throw new Error('should not delete on success');
      },
      compensateCoreSale: async () => {
        compensateCalls += 1;
      },
      upsertLinkedIncome: (params) => {
        incomeCalls += 1;
        assert.equal(params.paymentId, 'tp-ok');
        assert.equal(params.amount, 10000);
        return {
          id: 'inc-1',
          date: params.date,
          category: 'product',
          amount: params.amount,
          paymentMethod: params.paymentMethod,
          description: params.description,
          payer: params.payer,
          sourceType: 'textbook',
          sourceId: params.paymentId,
        };
      },
    },
  });
  assert.ok(ok.payment);
  assert.equal(ok.payment?.id, 'tp-ok');
  assert.equal(incomeCalls, 1);
  assert.equal(compensateCalls, 0);

  console.log('textbookSaleService.compensate.test.ts: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
