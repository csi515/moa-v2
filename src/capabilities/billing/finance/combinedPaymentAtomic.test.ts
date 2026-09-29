/**
 * 통합 수납 command 계약.
 * 실행: npm run test:combined-payment-atomic
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCombinedPaymentCommand,
  excludeLinkedTextbookPayments,
  isCombinedPaymentFullyApplied,
  modelCombinedPaymentTransaction,
} from './combinedPaymentCommand';

function run() {
  const lines = [
    { id: 'inv-1', billed: 100000, paid: 0, kind: 'tuition' as const },
    { id: 'sale-1', billed: 20000, paid: 0, kind: 'textbook' as const },
    { id: 'sale-linked', billed: 15000, paid: 0, kind: 'textbook' as const, linked: true },
  ];

  // 정상: 수강료 + 교재비 모두 성공
  {
    const r = modelCombinedPaymentTransaction({
      lines,
      attempt: {
        commandKey: 'cmd-ok',
        tuition: [{ id: 'inv-1', amount: 100000 }],
        textbooks: [{ id: 'sale-1', amount: 20000 }],
      },
    });
    assert.equal(r.action, 'applied');
    assert.equal(r.lines.find((row) => row.id === 'inv-1')?.paid, 100000);
    assert.equal(r.lines.find((row) => row.id === 'sale-1')?.paid, 20000);
    assert.deepEqual(r.appliedTuition, [100000]);
    assert.deepEqual(r.appliedTextbook, [20000]);
    assert.equal(isCombinedPaymentFullyApplied(r.action), true);
  }

  // 중간 실패: 수강료 성공 → 교재비 실패 → 전부 롤백
  {
    const r = modelCombinedPaymentTransaction({
      lines,
      attempt: {
        commandKey: 'cmd-tb-fail',
        tuition: [{ id: 'inv-1', amount: 100000 }],
        textbooks: [{ id: 'sale-1', amount: 20000, fail: true }],
      },
    });
    assert.equal(r.action, 'rolled_back');
    assert.equal(r.textbooksProcessed, true);
    assert.equal(r.lines.find((row) => row.id === 'inv-1')?.paid, 0);
    assert.equal(r.lines.find((row) => row.id === 'sale-1')?.paid, 0);
    assert.equal(isCombinedPaymentFullyApplied(r.action), false);
  }

  // 역순 실패: 수강료 실패 → 교재비 미처리
  {
    const r = modelCombinedPaymentTransaction({
      lines,
      attempt: {
        commandKey: 'cmd-tu-fail',
        tuition: [{ id: 'inv-1', amount: 100000, fail: true }],
        textbooks: [{ id: 'sale-1', amount: 20000 }],
      },
    });
    assert.equal(r.action, 'rolled_back');
    assert.equal(r.textbooksProcessed, false);
    assert.equal(r.appliedTextbook.length, 0);
    assert.equal(r.lines.find((row) => row.id === 'sale-1')?.paid, 0);
  }

  // 재시도: 동일 command → 중복 결제 없음
  {
    const first = modelCombinedPaymentTransaction({
      lines,
      attempt: {
        commandKey: 'cmd-retry',
        tuition: [{ id: 'inv-1', amount: 100000 }],
        textbooks: [{ id: 'sale-1', amount: 20000 }],
      },
    });
    const retry = modelCombinedPaymentTransaction({
      lines: first.lines,
      attempt: {
        commandKey: 'cmd-retry',
        tuition: [{ id: 'inv-1', amount: 100000 }],
        textbooks: [{ id: 'sale-1', amount: 20000 }],
      },
      succeededCommandKeys: new Set(['cmd-retry']),
    });
    assert.equal(retry.action, 'replay');
    assert.deepEqual(retry.appliedTuition, [0]);
    assert.deepEqual(retry.appliedTextbook, [0]);
    assert.equal(retry.lines.find((row) => row.id === 'inv-1')?.paid, 100000);
    assert.equal(retry.lines.find((row) => row.id === 'sale-1')?.paid, 20000);
  }

  // 부분 납부: 수강료·교재비 각각 일부만
  {
    const r = modelCombinedPaymentTransaction({
      lines,
      attempt: {
        commandKey: 'cmd-partial',
        tuition: [{ id: 'inv-1', amount: 40000 }],
        textbooks: [{ id: 'sale-1', amount: 8000 }],
      },
    });
    assert.equal(r.action, 'applied');
    assert.equal(r.lines.find((row) => row.id === 'inv-1')?.paid, 40000);
    assert.equal(r.lines.find((row) => row.id === 'sale-1')?.paid, 8000);
    assert.equal(r.lines.find((row) => row.id === 'sale-linked')?.paid, 0);
  }

  // linked textbook: 월청구 합산 교재는 단독 수납하지 않고 완납 시 정산
  {
    const excluded = excludeLinkedTextbookPayments([
      { saleId: 'sale-1', amount: 20000 },
      { saleId: 'sale-linked', amount: 15000, billingInvoiceId: 'inv-1' },
    ]);
    assert.deepEqual(
      excluded.map((item) => item.saleId),
      ['sale-1']
    );

    const r = modelCombinedPaymentTransaction({
      lines,
      attempt: {
        commandKey: 'cmd-linked',
        tuition: [{ id: 'inv-1', amount: 100000 }],
        textbooks: [{ id: 'sale-linked', amount: 15000 }],
      },
    });
    assert.equal(r.action, 'applied');
    assert.deepEqual(r.appliedTextbook, [0]);
    assert.deepEqual(r.settledLinkedIds, ['sale-linked']);
    assert.equal(r.lines.find((row) => row.id === 'sale-linked')?.paid, 15000);
  }

  const command = buildCombinedPaymentCommand({
    organizationId: 'org-1',
    request: {
      studentId: 'stu-1',
      yearMonth: '2026-09',
      tuitionPayments: [{ invoiceId: 'inv-1', amount: 40000 }],
      textbookPayments: [
        { saleId: 'sale-1', amount: 8000 },
        { saleId: 'sale-linked', amount: 15000 },
      ],
      paymentMethod: 'cash',
      paymentDate: '2026-09-25',
    },
    textbookMeta: {
      'sale-1': { studentName: '홍길동', textbookTitle: '교재A' },
      'sale-linked': { billingInvoiceId: 'inv-1', textbookTitle: '합산교재' },
    },
  });
  assert.equal(command.textbookItems.length, 1);
  assert.equal(command.textbookItems[0].saleId, 'sale-1');
  assert.equal(command.tuitionItems[0].idempotencyKey, `${command.commandKey}:t:inv-1`);
  assert.equal(command.textbookItems[0].idempotencyKey, `${command.commandKey}:b:sale-1`);

  const retryCommand = buildCombinedPaymentCommand({
    organizationId: 'org-1',
    request: {
      studentId: 'stu-1',
      yearMonth: '2026-09',
      tuitionPayments: [{ invoiceId: 'inv-1', amount: 40000 }],
      textbookPayments: [{ saleId: 'sale-1', amount: 8000 }],
      paymentMethod: 'cash',
      paymentDate: '2026-09-25',
    },
  });
  assert.equal(retryCommand.commandKey, command.commandKey);

  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(
    join(here, '../../../../supabase/migrations/20260925140000_record_combined_payment.sql'),
    'utf8'
  );
  assert.match(sql, /core\.record_combined_payment/);
  assert.match(sql, /core\.record_tuition_payment\(/);
  assert.match(sql, /core\.record_textbook_payment\(/);
  assert.match(sql, /begin_idempotency/);
  assert.match(sql, /complete_idempotency/);
  assert.match(sql, /skipped_linked/);
  assert.match(sql, /billingInvoiceId/);
  assert.match(sql, /REVOKE ALL[\s\S]*record_combined_payment[\s\S]*anon/);
  assert.equal(sql.includes('v_apply'), false);
  assert.equal(sql.includes('billed_amount -'), false);

  const atomic = readFileSync(join(here, 'combinedPaymentAtomic.ts'), 'utf8');
  assert.match(atomic, /record_combined_payment/);
  assert.match(atomic, /projectIfRemoteApplied/);
  assert.match(atomic, /upsertLinkedIncome/);
  assert.match(atomic, /settleLinkedTextbookSalesOnTuitionPaid/);
  assert.match(atomic, /CombinedPaymentCommandError/);
  assert.equal(atomic.includes('as any'), false);

  const appCommand = readFileSync(join(here, 'application/recordCombinedPayment.ts'), 'utf8');
  assert.match(appCommand, /recordCombinedPaymentAtomic/);

  const service = readFileSync(join(here, 'services/tuitionService.ts'), 'utf8');
  assert.match(service, /application\/recordCombinedPayment/);
  assert.equal(service.includes('recordCombinedPaymentAtomic'), false);

  const saleService = readFileSync(
    join(here, '../../../industries/piano/services/textbookSaleService.ts'),
    'utf8'
  );
  assert.equal(saleService.includes('recordCombinedPayment'), false);
  assert.equal(saleService.includes('recordTuitionPaymentAtomic'), false);
  assert.equal(saleService.includes('for (const item of tuitionItems)'), false);

  const modal = readFileSync(
    join(here, '../../../core/academy/components/tuition/CombinedPaymentModal.tsx'),
    'utf8'
  );
  assert.match(modal, /useCombinedPaymentSubmit/);
  assert.match(modal, /buildCombinedPaymentRequest/);

  console.log('combinedPaymentAtomic.test.ts: ok');
}

run();
