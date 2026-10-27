import assert from 'node:assert/strict';
import {
  normalizeTreatmentEntry,
  predictNextVisitDate,
  type RawTreatmentInput,
} from './treatmentChartEngine';

function run() {
  const raw: RawTreatmentInput = {
    customerId: 'cust-10',
    practitionerId: 'stylist-1',
    category: '애쉬 브라운 염색',
    formulaNotes: '로레알 7-11(60g) + 6% 산화제(60g) 30분 방치',
    colorCodes: [' 7-11 ', '#7D6A58 '],
    beforePhotoUrls: ['https://example.com/b1.jpg', ' '],
    afterPhotoUrls: ['https://example.com/a1.jpg'],
    price: 120000,
    performedAt: '2026-06-01T14:30:00Z',
  };

  // 1. 시술 메타데이터 정규화
  const entry = normalizeTreatmentEntry('chart-1', raw);
  assert.equal(entry.id, 'chart-1');
  assert.equal(entry.customerId, 'cust-10');
  assert.equal(entry.performedDate, '2026-06-01');
  assert.deepEqual(entry.colorCodes, ['7-11', '#7D6A58']);
  assert.deepEqual(entry.photoUrls.before, ['https://example.com/b1.jpg']);
  assert.deepEqual(entry.photoUrls.after, ['https://example.com/a1.jpg']);
  assert.equal(entry.price, 120000);

  // 2. 재방문 예정일 판정 (4주 = 28일 주기)
  // 2026-06-01 + 28일 = 2026-06-29
  // 2-1. 예정일 2주 전 (D-14) -> 미도래
  const predictionEarly = predictNextVisitDate({
    lastPerformedDate: '2026-06-01',
    cycleWeeks: 4,
    currentDate: '2026-06-15',
  });
  assert.equal(predictionEarly.targetVisitDate, '2026-06-29');
  assert.equal(predictionEarly.daysRemaining, 14);
  assert.equal(predictionEarly.isDue, false);
  assert.equal(predictionEarly.isOverdue, false);

  // 2-2. 예정일 2일 전 (D-2) -> 방문 도래(isDue: true)
  const predictionDue = predictNextVisitDate({
    lastPerformedDate: '2026-06-01',
    cycleWeeks: 4,
    currentDate: '2026-06-27',
  });
  assert.equal(predictionDue.daysRemaining, 2);
  assert.equal(predictionDue.isDue, true);
  assert.equal(predictionDue.isOverdue, false);

  // 2-3. 예정일 초과 (D+3) -> 지연(isOverdue: true)
  const predictionLate = predictNextVisitDate({
    lastPerformedDate: '2026-06-01',
    cycleWeeks: 4,
    currentDate: '2026-07-02',
  });
  assert.equal(predictionLate.daysRemaining, -3);
  assert.equal(predictionLate.isDue, true);
  assert.equal(predictionLate.isOverdue, true);

  console.log('treatmentChartEngine.test.ts: ok');
}

run();
