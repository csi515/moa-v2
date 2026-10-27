/**
 * 수강료 수납·월 청구 원자 경로 계약/동시성.
 * 실행: npm run test:tuition-payment-atomic
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyTuitionPaymentRpcResult,
  isTuitionPaymentApplied,
  tuitionPaymentRejectMessage,
} from './tuitionPaymentRpcResult';
import { modelSerializedTuitionPayments } from './tuitionPaymentPlan';

function run() {
  // 같은 청구서 동시 부분 수납
  {
    const r = modelSerializedTuitionPayments({ billed: 100000, paid: 0, requests: [40000, 40000] });
    assert.equal(r.paid, 80000);
    assert.deepEqual(r.applied, [40000, 40000]);
  }

  // 잔액보다 큰 금액 동시 요청 — billed 초과 없음
  {
    const r = modelSerializedTuitionPayments({ billed: 100000, paid: 0, requests: [80000, 80000] });
    assert.equal(r.paid, 100000);
    assert.deepEqual(r.applied, [80000, 20000]);
  }

  // 완납 직후 재수납
  {
    const r = modelSerializedTuitionPayments({ billed: 100000, paid: 100000, requests: [10000] });
    assert.equal(r.paid, 100000);
    assert.deepEqual(r.applied, [0]);
  }

  // 동일 요청 재시도 — 두 번째 apply 0 (이미 반영된 잔액)
  {
    const first = modelSerializedTuitionPayments({ billed: 50000, paid: 0, requests: [50000] });
    const retry = modelSerializedTuitionPayments({
      billed: 50000,
      paid: first.paid,
      requests: [50000],
    });
    assert.equal(first.applied[0], 50000);
    assert.equal(retry.applied[0], 0);
  }

  // 다른 학생은 독립
  {
    const a = modelSerializedTuitionPayments({ billed: 30000, paid: 0, requests: [10000] });
    const b = modelSerializedTuitionPayments({ billed: 40000, paid: 0, requests: [10000] });
    assert.equal(a.paid, 10000);
    assert.equal(b.paid, 10000);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(
    join(here, '../../../../supabase/migrations/20260924130000_tuition_textbook_payment_atomic.sql'),
    'utf8'
  );
  assert.match(sql, /core\.record_tuition_payment/);
  assert.match(sql, /core\.ensure_monthly_tuition_invoice/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /idempotency_key/);
  assert.match(sql, /uq_core_payments_org_customer_year_month/);
  assert.match(sql, /uq_payment_tx_org_receipt/);
  assert.match(sql, /paid_amount <= billed_amount/);
  assert.match(sql, /is_org_staff_actor/);
  assert.match(sql, /Organization mismatch/);
  assert.match(sql, /Invoice already paid/);
  assert.match(sql, /unique_violation/);
  assert.match(sql, /REVOKE ALL[\s\S]*record_tuition_payment[\s\S]*anon/);

  const snapshotSql = readFileSync(
    join(here, '../../../../supabase/migrations/20260926100000_tuition_invoice_no_last_payment_snapshot.sql'),
    'utf8'
  );
  assert.match(snapshotSql, /CREATE OR REPLACE FUNCTION core\.record_tuition_payment\(/);
  assert.match(snapshotSql, /CREATE OR REPLACE FUNCTION core\.sync_payment_from_transaction\(/);
  assert.match(snapshotSql, /INSERT INTO core\.payment_transactions/);
  assert.match(snapshotSql, /paid_amount = v_new_paid/);
  assert.match(snapshotSql, /receipt_number = COALESCE/);
  assert.equal(snapshotSql.includes('payment_method = p_payment_method'), false);
  assert.equal(snapshotSql.includes('paid_at = COALESCE(p_paid_at'), false);
  assert.equal(snapshotSql.includes("paid_at = CASE WHEN v_new_status = 'paid'"), false);

  // Case 1: 서버 완납 오류는 성공이 아님. 로컬 미납 invoice를 성공으로 쓰지 않음
  const alreadyPaid = classifyTuitionPaymentRpcResult({
    errorMessage: 'Invoice already paid',
    invoice: { id: 'stale-unpaid' },
  });
  assert.equal(alreadyPaid.kind, 'already_paid');
  assert.equal(isTuitionPaymentApplied(alreadyPaid), false);
  assert.match(tuitionPaymentRejectMessage(alreadyPaid), /이미 완납된 청구서/);

  // Case 2: 정상 RPC 성공
  const applied = classifyTuitionPaymentRpcResult({
    invoice: { id: 'inv-1', status: 'paid' },
  });
  assert.equal(applied.kind, 'applied');
  assert.equal(isTuitionPaymentApplied(applied), true);

  // Case 3: idempotency replay — 서버가 invoice를 돌려주면 성공
  const replay = classifyTuitionPaymentRpcResult({
    invoice: { id: 'inv-1', action: 'idempotent' },
  });
  assert.equal(replay.kind, 'applied');
  assert.equal(isTuitionPaymentApplied(replay), true);

  // Case 4: invalid amount는 성공 처리하지 않음
  const invalidAmount = classifyTuitionPaymentRpcResult({
    errorMessage: 'Invalid payment amount',
  });
  assert.equal(invalidAmount.kind, 'invalid_amount');
  assert.equal(isTuitionPaymentApplied(invalidAmount), false);
  assert.match(tuitionPaymentRejectMessage(invalidAmount), /납부 금액이 올바르지 않습니다/);

  const client = readFileSync(join(here, 'tuitionPaymentAtomic.ts'), 'utf8');
  assert.match(client, /record_tuition_payment/);
  assert.match(client, /projectIfRemoteApplied/);
  assert.equal(client.includes('upsertThenDiffDelete'), false);
  assert.equal(client.includes('return existing || null'), false);
  assert.match(client, /classifyTuitionPaymentRpcResult/);
  assert.match(client, /tuitionPaymentRejectMessage/);
  assert.match(client, /refreshInvoiceMirrorFromServer/);

  const rejectHelper = readFileSync(join(here, 'tuitionPaymentRpcResult.ts'), 'utf8');
  assert.match(rejectHelper, /이미 완납된 청구서입니다/);
  assert.match(rejectHelper, /납부 금액이 올바르지 않습니다/);

  const tuitionService = readFileSync(join(here, 'services/tuitionService.ts'), 'utf8');
  assert.match(tuitionService, /recordTuitionPaymentAtomic/);
  assert.match(tuitionService, /ensureMonthlyTuitionInvoiceAtomic/);

  console.log('tuitionPaymentAtomic.test.ts: ok');
}

run();
