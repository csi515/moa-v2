/**
 * 통합 수납 선택·금액·submit 계약.
 * 실행: npm run test:combined-payment-selection
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CombinedPaymentRequest } from '@/types';
import {
  CombinedPaymentCommandError,
  type CombinedPaymentAtomicResult,
} from '@/capabilities/billing/finance/combinedPaymentCommand';
import {
  buildCombinedPaymentRequest,
  clampPayableAmount,
  selectedPayableLines,
  sumSelectedPayable,
  unpaidCombinedBillingLines,
} from './combinedPaymentSelection';
import {
  COMBINED_PAYMENT_EMPTY_SELECTION_MESSAGE,
  COMBINED_PAYMENT_INCOMPLETE_MESSAGE,
  combinedPaymentSuccessMessage,
  interpretCombinedPaymentResult,
  mapCombinedPaymentError,
  runCombinedPaymentSubmit,
} from './combinedPaymentSubmit';
import {
  TUITION_PAYMENT_AMOUNT_REQUIRED_MESSAGE,
  TUITION_PAYMENT_EXCEEDS_UNPAID_MESSAGE,
  runTuitionInvoicePayment,
  tuitionInvoicePaymentSuccessMessage,
  validateTuitionInvoiceAmount,
} from './submitTuitionInvoicePayment';

function request(): CombinedPaymentRequest {
  return {
    studentId: 'stu-1',
    yearMonth: '2026-09',
    tuitionPayments: [{ invoiceId: 'inv-1', amount: 40000 }],
    textbookPayments: [{ saleId: 'sale-1', amount: 8000 }],
    paymentMethod: 'cash',
    paymentDate: '2026-09-26',
  };
}

function run() {
  const invoices = [
    { id: 'inv-1', unpaidAmount: 100000 },
    { id: 'inv-2', unpaidAmount: 50000 },
  ];
  const sales = [{ id: 'sale-1', unpaidAmount: 20000 }];

  assert.equal(clampPayableAmount(40000, 100000), 40000);
  assert.equal(clampPayableAmount(150000, 100000), 100000);
  assert.equal(clampPayableAmount(-10, 100000), 0);
  assert.equal(clampPayableAmount(Number.NaN, 100000), 0);

  assert.equal(sumSelectedPayable(invoices, ['inv-1'], { 'inv-1': 40000 }), 40000);
  assert.equal(sumSelectedPayable(invoices, ['inv-1', 'inv-2'], { 'inv-1': 40000, 'inv-2': 999999 }), 90000);
  assert.equal(sumSelectedPayable(invoices, [], { 'inv-1': 40000 }), 0);

  const lines = selectedPayableLines(invoices, ['inv-1'], { 'inv-1': 150000 });
  assert.deepEqual(lines, [{ id: 'inv-1', amount: 100000 }]);

  const unpaid = unpaidCombinedBillingLines({
    invoices: [
      { id: 'inv-paid', unpaidAmount: 0 },
      { id: 'inv-1', unpaidAmount: 100000 },
    ],
    textbookSales: [
      { id: 'sale-paid', unpaidAmount: 0 },
      { id: 'sale-1', unpaidAmount: 20000 },
    ],
  });
  assert.deepEqual(
    unpaid.invoices.map((row) => row.id),
    ['inv-1']
  );
  assert.deepEqual(
    unpaid.sales.map((row) => row.id),
    ['sale-1']
  );

  const built = buildCombinedPaymentRequest({
    studentId: 'stu-1',
    yearMonth: '2026-09',
    invoices,
    sales,
    selectedInvoiceIds: ['inv-1'],
    selectedSaleIds: ['sale-1'],
    invoiceAmounts: { 'inv-1': 40000 },
    saleAmounts: { 'sale-1': 8000 },
    paymentMethod: 'cash',
    paymentDate: '2026-09-26',
    memo: '  메모  ',
  });
  assert.deepEqual(built?.tuitionPayments, [{ invoiceId: 'inv-1', amount: 40000 }]);
  assert.deepEqual(built?.textbookPayments, [{ saleId: 'sale-1', amount: 8000 }]);
  assert.equal(built?.memo, '메모');
  assert.equal(
    buildCombinedPaymentRequest({
      studentId: 'stu-1',
      invoices,
      sales,
      selectedInvoiceIds: [],
      selectedSaleIds: [],
      invoiceAmounts: {},
      saleAmounts: {},
      paymentMethod: 'cash',
      paymentDate: '2026-09-26',
    }),
    null
  );

  const applied: CombinedPaymentAtomicResult = {
    status: 'applied',
    textbookPayments: [],
    totalPaidAmount: 48000,
    appliedTuitionInvoiceIds: ['inv-1'],
    appliedTextbookSaleIds: ['sale-1'],
  };
  assert.deepEqual(interpretCombinedPaymentResult(applied), { ok: true, totalPaidAmount: 48000 });

  const replayed: CombinedPaymentAtomicResult = {
    status: 'replay',
    textbookPayments: [],
    totalPaidAmount: 0,
    appliedTuitionInvoiceIds: [],
    appliedTextbookSaleIds: [],
  };
  assert.deepEqual(interpretCombinedPaymentResult(replayed), { ok: true, totalPaidAmount: 0 });
  assert.equal(
    mapCombinedPaymentError(new CombinedPaymentCommandError({ message: 'x' })),
    COMBINED_PAYMENT_INCOMPLETE_MESSAGE
  );

  {
    const toasts: Array<{ message: string; type: string }> = [];
    let refreshCount = 0;
    let successCount = 0;
    const busy = { current: false };
    void runCombinedPaymentSubmit({
      busy,
      request: null,
      execute: async () => {
        throw new Error('execute should not run');
      },
      showToast: (message, type) => toasts.push({ message, type }),
      triggerRefresh: () => {
        refreshCount += 1;
      },
      onSuccess: () => {
        successCount += 1;
      },
      studentName: '홍길동',
      customerLabel: '원생',
    });
    assert.deepEqual(toasts, [{ message: COMBINED_PAYMENT_EMPTY_SELECTION_MESSAGE, type: 'warning' }]);
    assert.equal(refreshCount, 0);
    assert.equal(successCount, 0);
    assert.equal(busy.current, false);
  }

  {
    const toasts: Array<{ message: string; type: string }> = [];
    let refreshCount = 0;
    let executeCount = 0;
    const busy = { current: false };
    const pending = runCombinedPaymentSubmit({
      busy,
      request: request(),
      execute: async () => {
        executeCount += 1;
        return {
          status: 'applied',
          textbookPayments: [],
          totalPaidAmount: 48000,
          appliedTuitionInvoiceIds: ['inv-1'],
          appliedTextbookSaleIds: ['sale-1'],
        };
      },
      showToast: (message, type) => toasts.push({ message, type }),
      triggerRefresh: () => {
        refreshCount += 1;
      },
      onSuccess: () => undefined,
      studentName: '홍길동',
      customerLabel: '원생',
    });
    const skipped = runCombinedPaymentSubmit({
      busy,
      request: request(),
      execute: async () => {
        executeCount += 1;
        return {
          status: 'applied',
          textbookPayments: [],
          totalPaidAmount: 1,
          appliedTuitionInvoiceIds: [],
          appliedTextbookSaleIds: [],
        };
      },
      showToast: () => undefined,
      triggerRefresh: () => undefined,
      onSuccess: () => undefined,
      studentName: '홍길동',
      customerLabel: '원생',
    });
    return Promise.all([pending, skipped]).then(() => {
      assert.equal(executeCount, 1);
      assert.equal(refreshCount, 1);
      assert.equal(
        toasts[0]?.message,
        combinedPaymentSuccessMessage({
          studentName: '홍길동',
          customerLabel: '원생',
          totalPaidAmount: 48000,
        })
      );
      assert.equal(toasts[0]?.type, 'success');
      assert.equal(busy.current, false);
    });
  }
}

async function runAsyncCases(): Promise<void> {
  const toasts: Array<{ message: string; type: string }> = [];
  const busy = { current: false };
  await runCombinedPaymentSubmit({
    busy,
    request: request(),
    execute: async () => {
      throw new CombinedPaymentCommandError({ message: 'fail' });
    },
    showToast: (message, type) => toasts.push({ message, type }),
    triggerRefresh: () => {
      throw new Error('refresh should not run');
    },
    onSuccess: () => {
      throw new Error('success should not run');
    },
    studentName: '홍길동',
    customerLabel: '원생',
  });
  assert.equal(toasts[0]?.type, 'error');
  assert.equal(toasts[0]?.message, COMBINED_PAYMENT_INCOMPLETE_MESSAGE);
  assert.equal(busy.current, false);

  assert.equal(validateTuitionInvoiceAmount(0, 10000), TUITION_PAYMENT_AMOUNT_REQUIRED_MESSAGE);
  assert.equal(validateTuitionInvoiceAmount(20000, 10000), TUITION_PAYMENT_EXCEEDS_UNPAID_MESSAGE);
  assert.equal(validateTuitionInvoiceAmount(5000, 10000), null);

  const invoice = {
    id: 'inv-1',
    studentId: 'stu-1',
    studentName: '홍길동',
    yearMonth: '2026-09',
    totalAmount: 10000,
    paidAmount: 0,
    unpaidAmount: 10000,
    dueDate: '2026-09-30',
    status: 'unpaid' as const,
  };
  const ok = await runTuitionInvoicePayment({
    busy: { current: false },
    invoice,
    amount: 5000,
    method: 'cash',
    customerLabel: '원생',
    recordPayment: async () => invoice,
  });
  assert.deepEqual(ok, {
    ok: true,
    message: tuitionInvoicePaymentSuccessMessage({
      studentName: '홍길동',
      customerLabel: '원생',
      amount: 5000,
    }),
  });

  const failed = await runTuitionInvoicePayment({
    busy: { current: false },
    invoice,
    amount: 5000,
    method: 'cash',
    customerLabel: '원생',
    recordPayment: async () => {
      throw new Error('RPC failed');
    },
  });
  assert.deepEqual(failed, { ok: false, message: 'RPC failed', toast: 'error' });

  const skipped = await runTuitionInvoicePayment({
    busy: { current: true },
    invoice,
    amount: 5000,
    method: 'cash',
    customerLabel: '원생',
    recordPayment: async () => {
      throw new Error('should not run');
    },
  });
  assert.deepEqual(skipped, { ok: false, skipped: true });

  const here = dirname(fileURLToPath(import.meta.url));
  const modal = readFileSync(
    join(here, '../../../../core/academy/components/tuition/CombinedPaymentModal.tsx'),
    'utf8'
  );
  assert.match(modal, /useCombinedPaymentSubmit/);
  assert.match(modal, /buildCombinedPaymentRequest/);
  assert.equal(modal.includes('recordCombinedPayment('), false);
  assert.equal(modal.includes('triggerRefresh'), false);
  assert.equal(modal.includes('showToast'), false);

  const view = readFileSync(
    join(here, '../../../../core/academy/components/tuition/TuitionManagementView.tsx'),
    'utf8'
  );
  assert.match(view, /useTuitionInvoicePayment/);
  assert.equal(view.includes('TuitionService.recordPayment'), false);
  assert.equal(view.includes('납부 금액은 0원보다 커야 합니다'), false);

  console.log('combinedPaymentSelection.test.ts: ok');
}

void Promise.resolve(run())
  .then((maybePromise) => maybePromise)
  .then(() => runAsyncCases())
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
