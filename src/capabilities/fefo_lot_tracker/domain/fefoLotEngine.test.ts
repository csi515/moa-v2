import assert from 'node:assert/strict';
import {
  getDaysUntilExpiry,
  determineLotStatus,
  getFefoRecommendedLot,
  filterExpiringLots,
  type LotItemRecord,
} from './fefoLotEngine';

function run() {
  const baseDate = '2026-10-18';

  // 1. getDaysUntilExpiry
  assert.equal(getDaysUntilExpiry('2026-10-28', baseDate), 10);
  assert.equal(getDaysUntilExpiry('2026-10-18', baseDate), 0);
  assert.equal(getDaysUntilExpiry('2026-10-15', baseDate), -3);

  // 2. determineLotStatus
  assert.equal(determineLotStatus('2026-11-30', 10, baseDate, 30), 'available');
  assert.equal(determineLotStatus('2026-10-25', 10, baseDate, 30), 'expiring_soon');
  assert.equal(determineLotStatus('2026-10-10', 10, baseDate, 30), 'expired');
  assert.equal(determineLotStatus('2026-12-31', 0, baseDate, 30), 'depleted');

  // 3. getFefoRecommendedLot (동일 품목 중 유통기한이 가장 먼저 도래하는 로트 선출)
  const lots: LotItemRecord[] = [
    {
      id: '1',
      itemCode: 'AMP-01',
      itemName: '히알루론 앰플',
      lotNumber: 'LOT-A',
      expiryDate: '2026-12-01',
      currentStockQty: 5,
      locationRack: 'A-1',
      status: 'available',
    },
    {
      id: '2',
      itemCode: 'AMP-01',
      itemName: '히알루론 앰플',
      lotNumber: 'LOT-B',
      expiryDate: '2026-11-01', // 더 빠름
      currentStockQty: 3,
      locationRack: 'A-2',
      status: 'expiring_soon',
    },
    {
      id: '3',
      itemCode: 'AMP-01',
      itemName: '히알루론 앰플',
      lotNumber: 'LOT-C',
      expiryDate: '2026-10-01', // 이미 만료됨
      currentStockQty: 2,
      locationRack: '폐기함',
      status: 'expired',
    },
  ];

  const recommended = getFefoRecommendedLot(lots, 'AMP-01', baseDate);
  assert.ok(recommended);
  assert.equal(recommended.lotNumber, 'LOT-B'); // 만료되지 않은 것 중 가장 이른 것

  // 4. filterExpiringLots (30일 이내)
  const expiring = filterExpiringLots(lots, baseDate, 30);
  assert.equal(expiring.length, 1);
  assert.equal(expiring[0].lotNumber, 'LOT-B');

  console.log('fefoLotEngine tests passed!');
}

run();
