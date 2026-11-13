import assert from 'node:assert/strict';
import { generateReceiptPdfBytes } from './PdfReceiptGenerator';

async function run() {
  const bytes = await generateReceiptPdfBytes({
    organizationName: '모아 피아노 스튜디오',
    receiptNumber: 'RCP-2026-0001',
    transactionDate: '2026-11-13T10:00:00Z',
    customerName: '김민수',
    subtotal: 180000,
    totalPaid: 180000,
    paymentMethod: '신용카드',
  });

  assert.ok(bytes.length > 500, 'PDF binary bytes must be created');
  // PDF 매직 넘버: %PDF-
  const header = String.fromCharCode(...bytes.slice(0, 5));
  assert.equal(header, '%PDF-');

  console.log('PdfReceiptGenerator.test.ts: ok');
}

run().catch((err) => {
  console.error('PdfReceiptGenerator.test.ts failed:', err);
  process.exit(1);
});
