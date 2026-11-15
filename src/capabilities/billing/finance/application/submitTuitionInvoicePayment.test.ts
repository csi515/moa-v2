import assert from 'node:assert/strict';
import {
  runTuitionInvoicePayment,
  TUITION_PAYMENT_OFFLINE_MESSAGE,
  TUITION_PAYMENT_AMOUNT_REQUIRED_MESSAGE,
  TUITION_PAYMENT_EXCEEDS_UNPAID_MESSAGE,
} from './submitTuitionInvoicePayment';
import { isOnline } from '@/shared/utils/networkGuard';
import type { TuitionInvoice } from '@/types';

const mockInvoice: TuitionInvoice = {
  id: 'inv-1',
  organizationId: 'org-1',
  studentId: 'std-1',
  billingMonth: '2026-11',
  totalAmount: 150000,
  paidAmount: 50000,
  unpaidAmount: 100000,
  status: 'pending',
  createdAt: '2026-11-01',
  updatedAt: '2026-11-01',
};

async function testPaymentRun() {
  const busy = { current: false };
  const outcome = await runTuitionInvoicePayment({
    busy,
    invoice: mockInvoice,
    amount: 50000,
    method: 'card',
    customerLabel: '원생',
    recordPayment: async () => mockInvoice,
  });

  if (isOnline()) {
    assert.equal(outcome.ok, true);
    if (outcome.ok) {
      assert.match(outcome.message, /수납 완료/);
    }
  } else {
    assert.equal(outcome.ok, false);
    if (!outcome.ok && 'message' in outcome) {
      assert.equal(outcome.message, TUITION_PAYMENT_OFFLINE_MESSAGE);
    }
  }
}

async function testValidation() {
  const busy = { current: false };
  const zeroOutcome = await runTuitionInvoicePayment({
    busy,
    invoice: mockInvoice,
    amount: 0,
    method: 'card',
    customerLabel: '원생',
    recordPayment: async () => mockInvoice,
  });
  assert.equal(zeroOutcome.ok, false);
  if (!zeroOutcome.ok && 'message' in zeroOutcome) {
    assert.equal(zeroOutcome.message, TUITION_PAYMENT_AMOUNT_REQUIRED_MESSAGE);
  }

  const exceedsOutcome = await runTuitionInvoicePayment({
    busy,
    invoice: mockInvoice,
    amount: 200000,
    method: 'card',
    customerLabel: '원생',
    recordPayment: async () => mockInvoice,
  });
  assert.equal(exceedsOutcome.ok, false);
  if (!exceedsOutcome.ok && 'message' in exceedsOutcome) {
    assert.equal(exceedsOutcome.message, TUITION_PAYMENT_EXCEEDS_UNPAID_MESSAGE);
  }
}

Promise.all([testPaymentRun(), testValidation()]).then(() => {
  console.log('submitTuitionInvoicePayment.test.ts: all pass');
});
