import assert from 'node:assert/strict';
import {
  calculatePurchaseInvoiceTotals,
  trackItemPriceFluctuation,
  recordInvoicePayment,
  generateHometaxPurchaseTaxSummary,
  calculateApAgingReport,
  type PurchaseInvoice,
  type PurchaseItemInput,
} from './vendorApInvoiceEngine';

console.log('--- Testing vendorApInvoiceEngine ---');

// Test 1: 매입 전표 공급가액, 10% 부가세, 면세 품목 계산
{
  const items: PurchaseItemInput[] = [
    { sku: 'BEANS-001', name: '에스프레소 원두 1kg', quantity: 10, unitPrice: 25000 }, // 250,000 + 25,000 = 275,000
    { sku: 'MILK-001', name: '신선 우유 1L (면세)', quantity: 30, unitPrice: 2500, isTaxExempt: true }, // 75,000 + 0 = 75,000
  ];

  const result = calculatePurchaseInvoiceTotals(items);
  assert.equal(result.totalSupplyAmount, 325000, '총 공급가액은 325,000원이어야 합니다.');
  assert.equal(result.totalTaxAmount, 25000, '우유는 면세이므로 부가세는 원두 25,000원만 발생해야 합니다.');
  assert.equal(result.totalAmount, 350000, '총 합계금액은 350,000원이어야 합니다.');
  assert.equal(result.items[0].taxAmount, 25000);
  assert.equal(result.items[1].taxAmount, 0);
  console.log('✅ Test 1 passed: Purchase invoice calculation with tax-exempt support');
}

// Test 2: 단가 변동률 추적 및 10% 급등 경고 감지
{
  // 5% 인상 (경고 없음)
  const normalRise = trackItemPriceFluctuation(20000, 21000, 10);
  assert.equal(normalRise.priceDifference, 1000);
  assert.equal(normalRise.changeRatePercent, 5.0);
  assert.equal(normalRise.isPriceSurge, false);
  assert.equal(normalRise.alertMessage, undefined);

  // 15% 급등 (10% 임계치 초과 경고 발생)
  const surgeRise = trackItemPriceFluctuation(20000, 23000, 10);
  assert.equal(surgeRise.changeRatePercent, 15.0);
  assert.equal(surgeRise.isPriceSurge, true);
  assert.ok(surgeRise.alertMessage?.includes('단가가 직전(20,000원) 대비 15% 상승'));

  console.log('✅ Test 2 passed: Item price fluctuation and surge detection');
}

// Test 3: 외상 매입금 부분 결제 및 완납 상태 전이
{
  const mockInvoice: PurchaseInvoice = {
    id: 'INV-001',
    vendorId: 'VEND-01',
    vendorName: '대한식자재',
    invoiceDate: '2026-10-01',
    dueDate: '2026-10-31',
    items: [],
    totalSupplyAmount: 500000,
    totalTaxAmount: 50000,
    totalAmount: 550000,
    taxInvoiceType: 'tax_invoice',
    taxInvoiceStatus: 'issued',
    paymentStatus: 'unpaid',
    paidAmount: 0,
    remainingAmount: 550000,
  };

  // 1차 부분 지급 300,000원
  const step1 = recordInvoicePayment(mockInvoice, 300000);
  assert.equal(step1.appliedPayment, 300000);
  assert.equal(step1.updatedInvoice.paidAmount, 300000);
  assert.equal(step1.updatedInvoice.remainingAmount, 250000);
  assert.equal(step1.updatedInvoice.paymentStatus, 'partially_paid');
  assert.equal(step1.isFullyPaid, false);

  // 2차 잔여액 250,000원 전액 지급
  const step2 = recordInvoicePayment(step1.updatedInvoice, 250000);
  assert.equal(step2.appliedPayment, 250000);
  assert.equal(step2.updatedInvoice.paidAmount, 550000);
  assert.equal(step2.updatedInvoice.remainingAmount, 0);
  assert.equal(step2.updatedInvoice.paymentStatus, 'paid');
  assert.equal(step2.isFullyPaid, true);

  console.log('✅ Test 3 passed: AP payment transitions from unpaid -> partially_paid -> paid');
}

// Test 4: 홈택스 매입 세금계산서 합계표 집계
{
  const invoices: PurchaseInvoice[] = [
    {
      id: 'INV-1',
      vendorId: 'VEND-A',
      vendorName: '공급사A',
      invoiceDate: '2026-05-10',
      dueDate: '2026-05-31',
      items: [],
      totalSupplyAmount: 1000000,
      totalTaxAmount: 100000,
      totalAmount: 1100000,
      taxInvoiceType: 'tax_invoice',
      taxInvoiceStatus: 'issued',
      paymentStatus: 'paid',
      paidAmount: 1100000,
      remainingAmount: 0,
    },
    {
      id: 'INV-2',
      vendorId: 'VEND-A', // 동일 공급사 A의 2번째 전표
      vendorName: '공급사A',
      invoiceDate: '2026-05-20',
      dueDate: '2026-06-15',
      items: [],
      totalSupplyAmount: 2000000,
      totalTaxAmount: 200000,
      totalAmount: 2200000,
      taxInvoiceType: 'tax_invoice',
      taxInvoiceStatus: 'reverse_requested',
      paymentStatus: 'unpaid',
      paidAmount: 0,
      remainingAmount: 2200000,
    },
    {
      id: 'INV-3',
      vendorId: 'VEND-B',
      vendorName: '면세유통B',
      invoiceDate: '2026-05-25',
      dueDate: '2026-06-30',
      items: [],
      totalSupplyAmount: 500000,
      totalTaxAmount: 0,
      totalAmount: 500000,
      taxInvoiceType: 'tax_exempt', // 면세 계산서는 세금계산서 합계표에서 제외
      taxInvoiceStatus: 'issued',
      paymentStatus: 'paid',
      paidAmount: 500000,
      remainingAmount: 0,
    },
  ];

  const taxSummary = generateHometaxPurchaseTaxSummary(invoices, '2026년 제1기 확정');
  assert.equal(taxSummary.totalVendorCount, 1, '정규 세금계산서 발급처는 VEND-A 1곳이어야 합니다.');
  assert.equal(taxSummary.totalInvoiceCount, 2, '정규 세금계산서는 2건이어야 합니다.');
  assert.equal(taxSummary.totalSupplyAmount, 3000000);
  assert.equal(taxSummary.totalDeductibleTax, 300000);

  console.log('✅ Test 4 passed: Hometax purchase tax invoice summary');
}

// Test 5: 외상 매입금 연체 에이징 (AP Aging) 분석
{
  const today = '2026-10-15';
  const invoices: PurchaseInvoice[] = [
    // 정상 (만기 미도래: 10/31)
    {
      id: 'INV-A',
      vendorId: 'V1',
      vendorName: '공급처1',
      invoiceDate: '2026-10-01',
      dueDate: '2026-10-31',
      items: [],
      totalSupplyAmount: 100000,
      totalTaxAmount: 10000,
      totalAmount: 110000,
      taxInvoiceType: 'tax_invoice',
      taxInvoiceStatus: 'issued',
      paymentStatus: 'unpaid',
      paidAmount: 0,
      remainingAmount: 110000,
    },
    // 15일 연체 (만기: 2026-09-30) -> 1~30일 구간
    {
      id: 'INV-B',
      vendorId: 'V2',
      vendorName: '공급처2',
      invoiceDate: '2026-09-01',
      dueDate: '2026-09-30',
      items: [],
      totalSupplyAmount: 200000,
      totalTaxAmount: 20000,
      totalAmount: 220000,
      taxInvoiceType: 'tax_invoice',
      taxInvoiceStatus: 'issued',
      paymentStatus: 'unpaid',
      paidAmount: 0,
      remainingAmount: 220000,
    },
    // 45일 연체 (만기: 2026-08-31) -> 31~60일 구간
    {
      id: 'INV-C',
      vendorId: 'V3',
      vendorName: '공급처3',
      invoiceDate: '2026-08-01',
      dueDate: '2026-08-31',
      items: [],
      totalSupplyAmount: 300000,
      totalTaxAmount: 30000,
      totalAmount: 330000,
      taxInvoiceType: 'tax_invoice',
      taxInvoiceStatus: 'issued',
      paymentStatus: 'unpaid',
      paidAmount: 0,
      remainingAmount: 330000,
    },
  ];

  const aging = calculateApAgingReport(invoices, today);
  assert.equal(aging.currentNotDue, 110000);
  assert.equal(aging.overdue1To30Days, 220000);
  assert.equal(aging.overdue31To60Days, 330000);
  assert.equal(aging.overdue61To90Days, 0);
  assert.equal(aging.overdueOver90Days, 0);
  assert.equal(aging.totalOutstanding, 660000);

  console.log('✅ Test 5 passed: AP aging report calculation');
}

console.log('🎉 All vendorApInvoiceEngine tests passed successfully!');
