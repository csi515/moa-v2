import assert from 'node:assert/strict';
import {
  validateThreeWayMatch,
  calculateTotalApprovedAmount,
  filterDiscrepancies,
  type ProcurementMatchRecord,
} from './procurement3WayEngine';

function run() {
  // 1. validateThreeWayMatch - 일치 케이스
  const matchOK = validateThreeWayMatch(10, 10, 50000, 50000);
  assert.equal(matchOK.isMatched, true);
  assert.equal(matchOK.qtyDiscrepancy, 0);
  assert.equal(matchOK.priceDiscrepancy, 0);

  // 2. validateThreeWayMatch - 수량 불일치 (10개 발주, 8개 입고)
  const qtyMismatch = validateThreeWayMatch(10, 8, 50000, 50000);
  assert.equal(qtyMismatch.isMatched, false);
  assert.equal(qtyMismatch.qtyDiscrepancy, -2);

  // 3. validateThreeWayMatch - 단가 불일치 (50,000원 발주, 55,000원 청구)
  const priceMismatch = validateThreeWayMatch(10, 10, 50000, 55000);
  assert.equal(priceMismatch.isMatched, false);
  assert.equal(priceMismatch.priceDiscrepancy, 5000);

  // 4. calculateTotalApprovedAmount & filterDiscrepancies
  const records: ProcurementMatchRecord[] = [
    {
      id: '1',
      requisitionNumber: 'PR-001',
      itemName: '피부 재생 앰플',
      requestedQty: 10,
      approvedQty: 10,
      approvedUnitPrice: 30000,
      receivedQty: 10,
      invoicedUnitPrice: 30000,
      status: 'MATCHED',
    },
    {
      id: '2',
      requisitionNumber: 'PR-002',
      itemName: '고급 도자기 화분',
      requestedQty: 5,
      approvedQty: 5,
      approvedUnitPrice: 20000,
      receivedQty: 4,
      invoicedUnitPrice: 20000,
      status: 'DISCREPANCY',
    },
  ];

  // (10 * 30000) + (5 * 20000) = 300,000 + 100,000 = 400,000
  assert.equal(calculateTotalApprovedAmount(records), 400000);

  const discrepancies = filterDiscrepancies(records);
  assert.equal(discrepancies.length, 1);
  assert.equal(discrepancies[0].id, '2');

  console.log('procurement3WayEngine tests passed!');
}

run();
