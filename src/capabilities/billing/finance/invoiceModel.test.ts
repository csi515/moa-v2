/**
 * Invoice 책임 분류 helper.
 * 실행: npm run test:invoice-model
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TuitionInvoice } from '@/types';
import {
  listInvoiceChargeLines,
  resolveInvoiceBaseFee,
  resolveInvoiceDiscount,
} from './invoiceModel';
import {
  packInvoicePaymentMetadata,
  unpackInvoicePaymentMetadata,
} from '@/services/adapters/sync/mappers/invoiceMetadata';
import { invoiceToPaymentRow, paymentRowToInvoice } from '@/services/adapters/sync/mappers/invoiceMappers';

function sampleInvoice(): TuitionInvoice {
  return {
    id: 'inv-1',
    studentId: 'stu-1',
    studentName: '홍길동',
    yearMonth: '2026-09',
    title: '2026-09 수강료',
    baseFee: 180000,
    discount: 10000,
    textbookFee: 20000,
    extraFee: 15000,
    extraFeeLabel: '연주회',
    additionalAmount: 0,
    totalAmount: 205000,
    paidAmount: 0,
    unpaidAmount: 205000,
    dueDate: '2026-09-10',
    status: 'unpaid',
    notes: '정기 수강료',
    includeExtras: true,
    linkedTextbookSaleIds: ['sale-1'],
    linkedExtraItems: [{ id: 'ev-1', label: '연주회', amount: 15000, sourceType: 'recital' }],
    invoiceSent: false,
    sentAt: null,
    cashReceiptRequested: true,
  };
}

function run() {
  assert.equal(resolveInvoiceBaseFee({ baseTuition: 100000, baseFee: 180000 }), 100000);
  assert.equal(resolveInvoiceBaseFee({ baseFee: 180000 }), 180000);
  assert.equal(resolveInvoiceDiscount({ discount: 5000, discountAmount: 9000 }), 5000);
  assert.equal(resolveInvoiceDiscount({ discountAmount: 9000 }), 9000);

  const lines = listInvoiceChargeLines(sampleInvoice());
  assert.deepEqual(
    lines.map((line) => [line.kind, line.amount]),
    [
      ['tuition', 180000],
      ['discount', -10000],
      ['textbook', 20000],
      ['extra', 15000],
    ]
  );

  const packed = packInvoicePaymentMetadata(sampleInvoice());
  assert.equal(packed.yearMonth, '2026-09');
  assert.equal(packed.baseTuition, 180000);
  assert.deepEqual(packed.linkedTextbookSaleIds, ['sale-1']);
  const unpacked = unpackInvoicePaymentMetadata(packed);
  assert.equal(unpacked.studentName, '홍길동');
  assert.equal(unpacked.cashReceiptRequested, true);

  const row = invoiceToPaymentRow(sampleInvoice(), 'org-1');
  assert.equal(row.billed_amount, 205000);
  assert.equal(row.sent_at, null);
  assert.equal(Object.prototype.hasOwnProperty.call(row, 'payment_method'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(row, 'paid_at'), false);

  const staleRow = invoiceToPaymentRow(
    {
      ...sampleInvoice(),
      paymentMethod: 'cash',
      paidAt: '2026-09-01',
      paidDate: '2026-09-01',
    },
    'org-1'
  );
  assert.equal(Object.prototype.hasOwnProperty.call(staleRow, 'payment_method'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(staleRow, 'paid_at'), false);

  const restored = paymentRowToInvoice({
    ...row,
    payment_method: 'transfer',
    paid_at: '2026-09-08T00:00:00.000Z',
    metadata: packed,
  });
  assert.equal(restored.studentId, 'stu-1');
  assert.equal(restored.unpaidAmount, 205000);
  assert.equal(restored.invoiceSent, false);
  assert.deepEqual(restored.linkedTextbookSaleIds, ['sale-1']);
  assert.equal(restored.paymentMethod, 'transfer');
  assert.equal(restored.paidDate, '2026-09-08');

  const here = dirname(fileURLToPath(import.meta.url));
  const mapper = readFileSync(
    join(here, '../../../services/adapters/sync/mappers/invoiceMappers.ts'),
    'utf8'
  );
  assert.match(mapper, /packInvoicePaymentMetadata/);
  assert.match(mapper, /unpackInvoicePaymentMetadata/);
  assert.match(mapper, /legacy compatibility snapshot/);
  assert.equal(mapper.includes('interface PaymentMetadata'), false);
  assert.equal(mapper.includes('payment_method: inv.paymentMethod'), false);
  assert.equal(mapper.includes('paid_at: inv.paidAt'), false);

  console.log('invoiceModel.test.ts: ok');
}

run();
