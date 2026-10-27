import assert from 'node:assert/strict';
import {
  createAuditDiff,
  filterLogsByEntity,
  filterLogsByOperator,
} from './fieldAuditEngine';

function run() {
  const beforeObj = {
    price: 1000000,
    discountRate: 0,
    customerName: '홍길동',
  };

  const afterObj = {
    price: 800000, // 변경됨
    discountRate: 20, // 변경됨
    customerName: '홍길동', // 변경 안 됨
  };

  // 1. createAuditDiff
  const diffs = createAuditDiff(
    'passes',
    'pass_123',
    'user_staff_01',
    '김실장',
    '원장 특별 구두 승인 할인',
    beforeObj,
    afterObj,
    '2026-10-18T10:00:00Z'
  );

  assert.equal(diffs.length, 2);

  const priceDiff = diffs.find((d) => d.fieldName === 'price');
  assert.ok(priceDiff);
  assert.equal(priceDiff.oldValue, '1000000');
  assert.equal(priceDiff.newValue, '800000');
  assert.equal(priceDiff.operatorName, '김실장');

  // 2. filterLogsByEntity & filterLogsByOperator
  const filteredEntity = filterLogsByEntity(diffs, 'passes');
  assert.equal(filteredEntity.length, 2);

  const filteredOp = filterLogsByOperator(diffs, '김실장');
  assert.equal(filteredOp.length, 2);

  const emptyOp = filterLogsByOperator(diffs, '이원장');
  assert.equal(emptyOp.length, 0);

  console.log('fieldAuditEngine tests passed!');
}

run();
