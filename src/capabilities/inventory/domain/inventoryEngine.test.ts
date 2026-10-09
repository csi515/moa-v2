import assert from 'node:assert/strict';
import {
  applyStockMovement,
  checkSafetyStockWarning,
  type InventoryItem,
} from './inventoryEngine';

function run() {
  const item: InventoryItem = {
    id: 'inv-1',
    name: '골프공 세트',
    sku: 'GOLF-BALL-01',
    currentStock: 20,
    safetyStock: 5,
    unitPrice: 15000,
  };

  // 1. 입고
  const inMovement = applyStockMovement(item, {
    itemId: 'inv-1',
    type: 'IN',
    quantity: 10,
    timestamp: '2026-06-01T10:00:00Z',
  });
  assert.equal(inMovement.success, true);
  assert.equal(inMovement.updatedItem.currentStock, 30);

  // 2. 출고
  const outMovement = applyStockMovement(inMovement.updatedItem, {
    itemId: 'inv-1',
    type: 'OUT',
    quantity: 26,
    timestamp: '2026-06-01T11:00:00Z',
  });
  assert.equal(outMovement.success, true);
  assert.equal(outMovement.updatedItem.currentStock, 4);

  // 3. 재고 부족 시 출고 차단
  const overOut = applyStockMovement(outMovement.updatedItem, {
    itemId: 'inv-1',
    type: 'OUT',
    quantity: 10,
    timestamp: '2026-06-01T12:00:00Z',
  });
  assert.equal(overOut.success, false);

  // 4. 안전재고 경고 판정 (현재고 4 <= 안전재고 5)
  const warn = checkSafetyStockWarning(outMovement.updatedItem);
  assert.equal(warn.isLowStock, true);
  assert.equal(warn.shortageQuantity, 1);

  // 5. 실사 조정
  const adjust = applyStockMovement(outMovement.updatedItem, {
    itemId: 'inv-1',
    type: 'ADJUST',
    quantity: 15,
    timestamp: '2026-06-01T13:00:00Z',
  });
  assert.equal(adjust.success, true);
  assert.equal(adjust.updatedItem.currentStock, 15);
  assert.equal(checkSafetyStockWarning(adjust.updatedItem).isLowStock, false);

  console.log('inventoryEngine.test.ts: ok');
}

run();
