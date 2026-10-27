import assert from 'node:assert/strict';
import {
  calculateCompositeScore,
  determineVendorTier,
  filterProbationVendors,
  type VendorEvaluationRecord,
} from './vendorScorecardEngine';

function run() {
  // 1. calculateCompositeScore & determineVendorTier - 최우수(A) 공급업체
  // 납기준수 100% (35점) + 불량률 0% (35점) + 단가 5점 (15점) + CS 5점 (15점) = 100점
  const perfectScore = calculateCompositeScore(100, 0, 5, 5);
  assert.equal(perfectScore, 100);
  assert.equal(determineVendorTier(perfectScore), 'A_EXCELLENT');

  // 2. 우수(B) 공급업체
  // 납기준수 90% (31.5) + 불량 5% -> 95 (33.25) + 단가 4점 (12) + CS 4점 (12) = 88.75 -> 88.8점
  const goodScore = calculateCompositeScore(90, 5, 4, 4);
  assert.equal(goodScore, 88.8);
  assert.equal(determineVendorTier(goodScore), 'B_GOOD');

  // 3. 재검토(D) 공급업체
  // 납기준수 60% (21) + 불량 20% -> 80 (28) + 단가 2점 (6) + CS 2점 (6) = 61.0점
  const badScore = calculateCompositeScore(60, 20, 2, 2);
  assert.equal(badScore, 61.0);
  assert.equal(determineVendorTier(badScore), 'D_PROBATION');

  // 4. filterProbationVendors
  const records: VendorEvaluationRecord[] = [
    {
      id: '1',
      vendorCode: 'VND-01',
      vendorName: '한국화훼협동조합',
      category: '화훼',
      deliveryPunctualityRate: 98,
      defectRate: 1,
      priceCompetitivenessScore: 5,
      csResponsivenessScore: 4,
      evaluationPeriod: '2026-Q3',
    },
    {
      id: '2',
      vendorCode: 'VND-02',
      vendorName: '불량납품화원',
      category: '화훼',
      deliveryPunctualityRate: 50,
      defectRate: 25,
      priceCompetitivenessScore: 2,
      csResponsivenessScore: 1,
      evaluationPeriod: '2026-Q3',
    },
  ];

  const probationList = filterProbationVendors(records);
  assert.equal(probationList.length, 1);
  assert.equal(probationList[0].vendorCode, 'VND-02');

  console.log('vendorScorecardEngine tests passed!');
}

run();
