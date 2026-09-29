/**
 * Piano 교재 Core movement 매핑·표시 잔량 역산 단위 테스트.
 * 실행: npx tsx src/industries/piano/services/textbookCoreStockMovement.test.ts
 */
import assert from 'node:assert/strict';
import {
  computeDisplayStocksFromCurrent,
  mapCoreMovementTypeToTextbookTx,
  mapMovementToTextbookTx,
} from './textbookCoreStockMovement';
import type { StockMovement } from '@/capabilities/commerce';
import type { Textbook } from '@/types';

assert.equal(mapCoreMovementTypeToTextbookTx('inbound'), 'inbound');
assert.equal(mapCoreMovementTypeToTextbookTx('sale'), 'sale');
assert.equal(mapCoreMovementTypeToTextbookTx('return'), 'return');
assert.equal(mapCoreMovementTypeToTextbookTx('adjustment'), 'adjust');

// Core 잔량 20, 최신순: return+2, sale-1, inbound+10, adjustment-1
// (시간 역순으로 쌓인 뒤 현재 20)
const stocks = computeDisplayStocksFromCurrent(20, [
  { quantity: 2 }, // return → after 20, prev 18
  { quantity: -1 }, // sale → after 18, prev 19
  { quantity: 10 }, // inbound → after 19, prev 9
  { quantity: -1 }, // adjustment → after 9, prev 10
]);
assert.deepEqual(stocks, [
  { previousStock: 18, currentStock: 20 },
  { previousStock: 19, currentStock: 18 },
  { previousStock: 9, currentStock: 19 },
  { previousStock: 10, currentStock: 9 },
]);

const textbook: Textbook = {
  id: 'tb-1',
  title: '바이엘',
  publisher: '세광',
  level: '초급',
  price: 12000,
  salePrice: 12000,
  costPrice: 8000,
  stock: 20,
  currentStock: 20,
  minStock: 2,
  isForSale: true,
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: '2026-09-20T00:00:00.000Z',
};

/** movement별 실제 예시 (textbook_sale 참조) */
const examples: StockMovement[] = [
  {
    id: 'mv-inbound-1',
    organizationId: 'org-1',
    productId: 'tb-1',
    variantId: null,
    movementType: 'inbound',
    quantity: 10,
    referenceType: null,
    referenceId: null,
    reason: '교재 입고',
    createdAt: '2026-09-20T10:00:00.000Z',
  },
  {
    id: 'mv-sale-1',
    organizationId: 'org-1',
    productId: 'tb-1',
    variantId: null,
    movementType: 'sale',
    quantity: -1,
    referenceType: 'textbook_sale',
    referenceId: 'ts-sale-001',
    reason: '교재 판매 출고',
    createdAt: '2026-09-20T11:00:00.000Z',
  },
  {
    id: 'mv-return-1',
    organizationId: 'org-1',
    productId: 'tb-1',
    variantId: null,
    movementType: 'return',
    quantity: 1,
    referenceType: 'textbook_sale',
    referenceId: 'ts-sale-001',
    reason: '교재 판매 취소',
    createdAt: '2026-09-20T12:00:00.000Z',
  },
  {
    id: 'mv-adjust-1',
    organizationId: 'org-1',
    productId: 'tb-1',
    variantId: null,
    movementType: 'adjustment',
    quantity: -1,
    referenceType: null,
    referenceId: null,
    reason: '파손',
    createdAt: '2026-09-20T13:00:00.000Z',
  },
];

const saleExample = examples[1];
assert.equal(saleExample.movementType, 'sale');
assert.ok(saleExample.quantity < 0);
assert.equal(saleExample.referenceType, 'textbook_sale');
assert.equal(saleExample.referenceId, 'ts-sale-001');

const returnExample = examples[2];
assert.equal(returnExample.movementType, 'return');
assert.ok(returnExample.quantity > 0);
assert.equal(returnExample.referenceType, 'textbook_sale');
assert.equal(returnExample.referenceId, 'ts-sale-001');

const inboundTx = mapMovementToTextbookTx(examples[0], textbook, {
  previousStock: 0,
  currentStock: 10,
});
assert.equal(inboundTx.transactionType, 'inbound');
assert.equal(inboundTx.quantity, 10);

const saleTx = mapMovementToTextbookTx(saleExample, textbook, {
  previousStock: 10,
  currentStock: 9,
});
assert.equal(saleTx.transactionType, 'sale');
assert.equal(saleTx.referenceId, 'ts-sale-001');

const returnTx = mapMovementToTextbookTx(returnExample, textbook, {
  previousStock: 9,
  currentStock: 10,
});
assert.equal(returnTx.transactionType, 'return');
assert.equal(returnTx.referenceId, 'ts-sale-001');

const adjustTx = mapMovementToTextbookTx(examples[3], textbook, {
  previousStock: 10,
  currentStock: 9,
});
assert.equal(adjustTx.transactionType, 'adjust');

// Core Inventory 잔량 역산 일관성
assert.equal(stocks[0].currentStock - stocks[0].previousStock, 2);
assert.equal(stocks[1].currentStock - stocks[1].previousStock, -1);

console.log('textbookCoreStockMovement.test.ts: ok');
console.log(
  JSON.stringify(
    {
      inbound: examples[0],
      sale: examples[1],
      return: examples[2],
      adjustment: examples[3],
    },
    null,
    2
  )
);
