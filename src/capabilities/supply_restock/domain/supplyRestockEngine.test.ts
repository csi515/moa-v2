import assert from 'node:assert/strict';
import './procurementPipelineEngine.test';
import {
  detectRestockNeeded,
  groupRestockItemsByVendor,
  assemblePurchaseOrder,
  type RestockItem,
} from './supplyRestockEngine';

console.log('[test:supply-restock] starting test suite...');

const mockItems: RestockItem[] = [
  {
    id: 'i1',
    itemName: 'A4 복사용지',
    category: 'stationery',
    currentQuantity: 2, // 안전재고 5 이하 -> 발주 필요!
    safetyThreshold: 5,
    optimalOrderQuantity: 10,
    unit: 'BOX',
    unitCost: 25000,
    vendorName: '대한오피스',
    vendorContact: '010-1234-5678',
  },
  {
    id: 'i2',
    itemName: '손소독제 500ml',
    category: 'sanitary',
    currentQuantity: 1, // 안전재고 3 이하 -> 발주 필요!
    safetyThreshold: 3,
    optimalOrderQuantity: 5,
    unit: 'EA',
    unitCost: 4000,
    vendorName: '대한오피스',
    vendorContact: '010-1234-5678',
  },
  {
    id: 'i3',
    itemName: '원두 1kg',
    category: 'beverage',
    currentQuantity: 8, // 안전재고 4보다 많음 -> 충분
    safetyThreshold: 4,
    optimalOrderQuantity: 5,
    unit: 'BAG',
    unitCost: 18000,
    vendorName: '커피팩토리',
  },
];

// 1. 안전재고 미달 품목 자동 감지
{
  const needed = detectRestockNeeded(mockItems);
  assert.equal(needed.length, 2);
  assert.equal(needed[0].itemName, 'A4 복사용지');
  assert.equal(needed[1].itemName, '손소독제 500ml');
}
console.log('✓ 1. 안전재고 미달 품목 감지 통과');

// 2. 공급처별 그룹화
{
  const needed = detectRestockNeeded(mockItems);
  const grouped = groupRestockItemsByVendor(needed);
  assert.equal(Object.keys(grouped).length, 1);
  assert.equal(grouped['대한오피스'].length, 2);
}
console.log('✓ 2. 공급처별 품목 묶음 통과');

// 3. 발주서 조립 및 공유 텍스트 생성
{
  const needed = detectRestockNeeded(mockItems);
  const po = assemblePurchaseOrder('대한오피스', needed, '모아 아카데미', 1);

  assert.equal(po.vendorName, '대한오피스');
  assert.equal(po.orderItems.length, 2);
  // A4 복사용지 10박스 * 25,000 = 250,000
  // 손소독제 5개 * 4,000 = 20,000
  // 총액 = 270,000원
  assert.equal(po.totalAmount, 270000);
  assert.ok(po.poNumber.startsWith('PO-'));
  assert.ok(po.orderSummaryText.includes('[발주서] 모아 아카데미 ➔ 대한오피스'));
  assert.ok(po.orderSummaryText.includes('270,000원'));
}
console.log('✓ 3. 발주서 자동 조립 및 메시지 텍스트 생성 통과');

// 4. 복수 견적 비교 및 최적 견적 선정 (단가 최저, 동일 시 리드타임 최단)
{
  const { evaluateOptimalVendorQuote } = await import('./supplyRestockEngine');
  const quotes = [
    { id: 'q1', prId: 'pr1', vendorName: '업체A', quotedAmount: 280000, leadTimeDays: 2, isSelected: false },
    { id: 'q2', prId: 'pr1', vendorName: '업체B', quotedAmount: 250000, leadTimeDays: 4, isSelected: false }, // 최저가
    { id: 'q3', prId: 'pr1', vendorName: '업체C', quotedAmount: 250000, leadTimeDays: 2, isSelected: false }, // 최저가 & 최단 리드타임
  ];

  const optimal = evaluateOptimalVendorQuote(quotes);
  assert.ok(optimal);
  assert.equal(optimal.id, 'q3');
  assert.equal(optimal.vendorName, '업체C');
  assert.equal(optimal.quotedAmount, 250000);
}
console.log('✓ 4. 복수 견적 비교 최적 견적 선정 통과');

console.log('[test:supply-restock] ALL TESTS PASSED! (100%)');

