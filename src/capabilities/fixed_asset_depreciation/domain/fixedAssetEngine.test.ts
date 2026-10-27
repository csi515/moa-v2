import assert from 'node:assert/strict';
import {
  calculateMonthlyDepreciation,
  calculateAccumulatedDepreciation,
  filterAssetsRequiringAudit,
  type FixedAssetItem,
} from './fixedAssetEngine';

function run() {
  // 1. calculateMonthlyDepreciation
  // 취득원가 6,000,000원, 잔존가치 0원, 내용연수 5년 (60개월) -> 월 100,000원
  const monthly = calculateMonthlyDepreciation(6000000, 0, 5);
  assert.equal(monthly, 100000);

  // 2. calculateAccumulatedDepreciation (2년 경과 = 24개월)
  // 취득: 2024-01-01, 기준: 2026-01-01 (24개월)
  // 누계상각: 2,400,000원, 장부가치: 3,600,000원
  const result = calculateAccumulatedDepreciation(
    6000000,
    0,
    5,
    '2024-01-01',
    '2026-01-01'
  );
  assert.equal(result.elapsedMonths, 24);
  assert.equal(result.accumulated, 2400000);
  assert.equal(result.bookValue, 3600000);
  assert.equal(result.isFullyDepreciated, false);

  // 3. 5년 초과 경과 (6년 경과 = 72개월)
  const fullResult = calculateAccumulatedDepreciation(
    6000000,
    1000, // 비망가액 1000원
    5,
    '2020-01-01',
    '2026-01-01'
  );
  assert.equal(fullResult.isFullyDepreciated, true);
  assert.equal(fullResult.bookValue, 1000);

  // 4. filterAssetsRequiringAudit
  const sampleAssets: FixedAssetItem[] = [
    {
      id: '1',
      assetCode: 'AST-001',
      assetName: '피아노 1호',
      category: 'instrument',
      acquisitionCost: 5000000,
      acquisitionDate: '2024-01-01',
      usefulLifeYears: 5,
      salvageValue: 1000,
      auditStatus: 'active_normal',
    },
    {
      id: '2',
      assetCode: 'AST-002',
      assetName: '고주파 리프팅기',
      category: 'medical_device',
      acquisitionCost: 15000000,
      acquisitionDate: '2025-01-01',
      usefulLifeYears: 5,
      salvageValue: 1000,
      auditStatus: 'needs_repair',
    },
  ];

  const needingAudit = filterAssetsRequiringAudit(sampleAssets);
  assert.equal(needingAudit.length, 1);
  assert.equal(needingAudit[0].assetCode, 'AST-002');

  console.log('fixedAssetEngine tests passed!');
}

run();
