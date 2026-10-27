/**
 * 교재비 수납 원자 경로 계약/동시성.
 * 실행: npm run test:textbook-payment-atomic
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { modelSerializedTextbookPayments } from './textbookPaymentPlan';

function run() {
  // 같은 판매 건 동시 부분 수납
  {
    const r = modelSerializedTextbookPayments({ total: 20000, paid: 0, requests: [8000, 7000] });
    assert.equal(r.paid, 15000);
    assert.deepEqual(r.applied, [8000, 7000]);
  }

  // 잔액보다 큰 동시 요청
  {
    const r = modelSerializedTextbookPayments({ total: 10000, paid: 0, requests: [9000, 9000] });
    assert.equal(r.paid, 10000);
    assert.deepEqual(r.applied, [9000, 1000]);
  }

  // 완납 직후 재수납
  {
    const r = modelSerializedTextbookPayments({ total: 10000, paid: 10000, requests: [3000] });
    assert.equal(r.paid, 10000);
    assert.deepEqual(r.applied, [0]);
  }

  // 동일 요청 재시도
  {
    const first = modelSerializedTextbookPayments({ total: 12000, paid: 0, requests: [12000] });
    const retry = modelSerializedTextbookPayments({
      total: 12000,
      paid: first.paid,
      requests: [12000],
    });
    assert.equal(retry.applied[0], 0);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(
    join(here, '../../../../supabase/migrations/20260924130000_tuition_textbook_payment_atomic.sql'),
    'utf8'
  );
  assert.match(sql, /core\.record_textbook_payment/);
  assert.match(sql, /piano\.textbook_sales/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /textbook_sales_amounts_valid/);
  assert.match(sql, /uq_piano_textbook_pay_org_receipt/);
  assert.match(sql, /uq_piano_textbook_pay_org_idempotency/);
  assert.match(sql, /Organization mismatch/);
  assert.match(sql, /Textbook sale already paid/);

  const client = readFileSync(join(here, 'textbookPaymentAtomic.ts'), 'utf8');
  assert.match(client, /record_textbook_payment/);
  assert.match(client, /projectIfRemoteApplied/);
  assert.equal(client.includes('updatedSale'), true);
  assert.equal(client.includes('recordPaymentOnDb'), false);

  const service = readFileSync(join(here, 'textbookSaleService.ts'), 'utf8');
  assert.match(service, /recordTextbookPaymentAtomic/);
  assert.equal(service.includes('recordCombinedPayment'), false);
  assert.equal(service.includes('recordPaymentOnDb'), false);

  const persist = readFileSync(join(here, 'textbookSalePersist.ts'), 'utf8');
  assert.match(persist, /recordPaymentOnDb/);

  console.log('textbookPaymentAtomic.test.ts: ok');
}

run();
