/**
 * 교재 판매/수납 legacy merge unit test
 * 실행: npm run test:textbook-sale-legacy
 */
import assert from 'node:assert/strict';
import {
  listLegacyTextbookSalesForManualBackfill,
  mergeTextbookPaymentsWithLegacy,
  mergeTextbookSalesWithLegacy,
  pickLegacyTextbookSales,
} from './textbookSaleLegacy';
import type { TextbookPayment, TextbookSale } from '@/types';

function sale(id: string, amount = 10000): TextbookSale {
  return {
    id,
    studentId: 's1',
    studentName: '학생',
    parentName: '학부모',
    parentPhone: '',
    textbookId: 'tb1',
    textbookTitle: '교재',
    saleDate: '2026-09-01',
    quantity: 1,
    unitPrice: amount,
    discount: 0,
    totalAmount: amount,
    paidAmount: 0,
    unpaidAmount: amount,
    status: 'unpaid',
  };
}

function payment(id: string, saleId: string): TextbookPayment {
  return {
    id,
    textbookSaleId: saleId,
    paymentDate: '2026-09-01',
    amount: 5000,
    paymentMethod: 'card',
  };
}

{
  const db = [sale('db-1')];
  const local = [sale('db-1', 999), sale('legacy-1')];
  const merged = mergeTextbookSalesWithLegacy(db, local);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'db-1');
  assert.equal(merged[0].totalAmount, 10000, 'DB row wins on id collision');
  assert.equal(merged[1].id, 'legacy-1');
  assert.deepEqual(
    pickLegacyTextbookSales(local, db).map((s) => s.id),
    ['legacy-1']
  );
  assert.deepEqual(
    listLegacyTextbookSalesForManualBackfill(local, db).map((s) => s.id),
    ['legacy-1']
  );
}

{
  const db = [payment('p-db', 'db-1')];
  const local = [payment('p-db', 'db-1'), payment('p-legacy', 'legacy-1')];
  const merged = mergeTextbookPaymentsWithLegacy(db, local);
  assert.equal(merged.length, 2);
  assert.equal(merged[1].id, 'p-legacy');
}

console.log('textbookSaleLegacy.test.ts: ok');
