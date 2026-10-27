/**
 * DB 모드 수납/취소 실패 시 local 성공 처리 금지
 * 실행: npm run test:textbook-sale-db-write
 */
import assert from 'node:assert/strict';
import type { TextbookPayment, TextbookSale } from '@/types';
import {
  cancelSaleOnDb,
  recordPaymentOnDb,
  reversePaymentOnDb,
} from './textbookSalePersist';
import {
  mergeTextbookPaymentsWithLegacy,
  mergeTextbookSalesWithLegacy,
  pickLegacyTextbookSales,
} from './textbookSaleLegacy';

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
    createdAt: '2026-09-22T00:00:00.000Z',
    updatedAt: '2026-09-22T00:00:00.000Z',
  };
}

function basePayment(id: string, saleId: string): TextbookPayment {
  return {
    id,
    textbookSaleId: saleId,
    studentId: 's1',
    studentName: '학생',
    textbookTitle: '교재',
    paymentDate: '2026-09-22',
    amount: 5000,
    paymentMethod: 'card',
    createdAt: '2026-09-22T00:00:00.000Z',
  };
}

async function run() {
  // DB 판매 없음 → 결제 실패
  await assert.rejects(
    () =>
      recordPaymentOnDb({
        orgId: 'org',
        saleId: 'sale-missing',
        payment: basePayment('tp1', 'sale-missing'),
        updatedSale: { ...baseSale('sale-missing'), paidAmount: 5000, unpaidAmount: 5000, status: 'partial' },
        deps: {
          getSale: async () => null,
          insertPayment: async () => {
            throw new Error('should not insert');
          },
          updateSale: async () => {
            throw new Error('should not update');
          },
          deletePayment: async () => undefined,
        },
      }),
    /교재 판매가 DB에 없습니다/
  );

  // DB 결제 INSERT 실패 → update/delete 미호출
  {
    let updated = false;
    await assert.rejects(
      () =>
        recordPaymentOnDb({
          orgId: 'org',
          saleId: 'sale-1',
          payment: basePayment('tp1', 'sale-1'),
          updatedSale: { ...baseSale('sale-1'), paidAmount: 5000, unpaidAmount: 5000, status: 'partial' },
          deps: {
            getSale: async () => baseSale('sale-1'),
            insertPayment: async () => {
              throw new Error('payment insert failed');
            },
            updateSale: async (_o, _id, s) => {
              updated = true;
              return s;
            },
            deletePayment: async () => undefined,
          },
        }),
      /payment insert failed/
    );
    assert.equal(updated, false);
  }

  // DB 판매 UPDATE 실패 → 수납 롤백 후 throw
  {
    let deletedPaymentId: string | null = null;
    await assert.rejects(
      () =>
        recordPaymentOnDb({
          orgId: 'org',
          saleId: 'sale-1',
          payment: basePayment('tp-local', 'sale-1'),
          updatedSale: { ...baseSale('sale-1'), paidAmount: 5000, unpaidAmount: 5000, status: 'partial' },
          deps: {
            getSale: async () => baseSale('sale-1'),
            insertPayment: async (_o, p) => ({ ...p, id: 'tp-db' }),
            updateSale: async () => {
              throw new Error('sale update failed');
            },
            deletePayment: async (_o, id) => {
              deletedPaymentId = id;
            },
          },
        }),
      /sale update failed/
    );
    assert.equal(deletedPaymentId, 'tp-db');
  }

  // DB 결제 삭제 실패 → reverse 실패(throw)
  await assert.rejects(
    () =>
      reversePaymentOnDb({
        orgId: 'org',
        paymentId: 'tp1',
        updatedSale: { ...baseSale('sale-1'), paidAmount: 0, unpaidAmount: 10000, status: 'unpaid' },
        deps: {
          deletePayment: async () => {
            throw new Error('payment delete failed');
          },
          updateSale: async () => {
            throw new Error('should not update sale');
          },
        },
      }),
    /payment delete failed/
  );

  // DB 판매 삭제 실패 → cancel 실패 + 수납 복구 시도
  {
    const restored: string[] = [];
    await assert.rejects(
      () =>
        cancelSaleOnDb({
          orgId: 'org',
          saleId: 'sale-1',
          deps: {
            getSale: async () => baseSale('sale-1'),
            deletePaymentsForSale: async () => [basePayment('tp1', 'sale-1')],
            deleteSale: async () => {
              throw new Error('sale delete failed');
            },
            insertPayment: async (_o, p) => {
              restored.push(p.id);
              return p;
            },
          },
        }),
      /sale delete failed/
    );
    assert.deepEqual(restored, ['tp1']);
  }

  // DB 작업 모두 성공
  {
    const saved = await recordPaymentOnDb({
      orgId: 'org',
      saleId: 'sale-1',
      payment: basePayment('tp-local', 'sale-1'),
      updatedSale: { ...baseSale('sale-1'), paidAmount: 5000, unpaidAmount: 5000, status: 'partial' },
      deps: {
        getSale: async () => baseSale('sale-1'),
        insertPayment: async (_o, p) => ({ ...p, id: 'tp-ok' }),
        updateSale: async (_o, _id, s) => s,
        deletePayment: async () => {
          throw new Error('should not delete on success');
        },
      },
    });
    assert.equal(saved.id, 'tp-ok');

    await reversePaymentOnDb({
      orgId: 'org',
      paymentId: 'tp-ok',
      updatedSale: baseSale('sale-1'),
      deps: {
        deletePayment: async () => undefined,
        updateSale: async (_o, _id, s) => s,
      },
    });

    const cancel = await cancelSaleOnDb({
      orgId: 'org',
      saleId: 'sale-1',
      deps: {
        getSale: async () => baseSale('sale-1'),
        deletePaymentsForSale: async () => [],
        deleteSale: async () => undefined,
        insertPayment: async () => {
          throw new Error('should not restore on success');
        },
      },
    });
    assert.equal(cancel.legacyOnly, false);

    const legacyCancel = await cancelSaleOnDb({
      orgId: 'org',
      saleId: 'legacy-1',
      deps: {
        getSale: async () => null,
        deletePaymentsForSale: async () => {
          throw new Error('should not delete payments for legacy');
        },
        deleteSale: async () => {
          throw new Error('should not delete sale for legacy');
        },
        insertPayment: async () => {
          throw new Error('should not insert for legacy');
        },
      },
    });
    assert.equal(legacyCancel.legacyOnly, true);
  }

  // legacy merge 조회는 계속 동작
  {
    const db = [baseSale('db-1')];
    const local = [baseSale('db-1'), baseSale('legacy-1')];
    const merged = mergeTextbookSalesWithLegacy(db, local);
    assert.equal(merged.length, 2);
    assert.deepEqual(
      pickLegacyTextbookSales(local, db).map((s) => s.id),
      ['legacy-1']
    );
    const payMerged = mergeTextbookPaymentsWithLegacy(
      [basePayment('p-db', 'db-1')],
      [basePayment('p-db', 'db-1'), basePayment('p-legacy', 'legacy-1')]
    );
    assert.equal(payMerged.length, 2);
  }

  console.log('textbookSaleDbWrite.test.ts: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
