import assert from 'node:assert/strict';
import {
  evaluateInspectionSamples,
  createCapaFromInspectionFailure,
  type InspectionStandard,
} from './qualityInspectionEngine';

function run() {
  const standard: InspectionStandard = {
    id: 'std-1',
    itemName: '정밀 볼트 M8',
    processStage: 'final',
    inspectionItem: '외경 치수',
    unit: 'mm',
    targetValue: 8.0,
    minThreshold: 7.9,
    maxThreshold: 8.1,
    sampleSize: 5,
  };

  // 1. 전수 합격 샘플 (모두 7.9 ~ 8.1 범위 이내)
  const passSamples = [8.01, 7.98, 8.02, 8.00, 7.99];
  const passRes = evaluateInspectionSamples(passSamples, standard);

  assert.equal(passRes.judgment, 'pass');
  assert.equal(passRes.defectCount, 0);
  assert.equal(passRes.defectRatePercent, 0);
  assert.equal(passRes.count, 5);
  assert.ok(passRes.cpk !== undefined && passRes.cpk > 1.0); // 우수한 공정능력

  // 2. 불합격 샘플 (상한 또는 하한 이탈)
  const failSamples = [8.01, 7.88, 8.12, 8.00, 7.95]; // 7.88(하한 이탈), 8.12(상한 이탈)
  const failRes = evaluateInspectionSamples(failSamples, standard);

  assert.equal(failRes.judgment, 'fail');
  assert.equal(failRes.defectCount, 2);
  assert.equal(failRes.defectRatePercent, 40.0);
  assert.equal(failRes.min, 7.88);
  assert.equal(failRes.max, 8.12);

  // 4. 불합격 시 ISO 10.2 CAPA 시정조치 티켓 자동 생성 연계 검증
  const capaDraft = createCapaFromInspectionFailure('insp-202610-01', standard, failRes);
  assert.ok(capaDraft !== null);
  assert.equal(capaDraft.sourceType, 'quality_defect');
  assert.equal(capaDraft.sourceId, 'insp-202610-01');
  assert.equal(capaDraft.initialStage, 'reported');
  assert.equal(capaDraft.summary.defectCount, 2);
  assert.equal(capaDraft.summary.defectRatePercent, 40.0);

  // 합격 시에는 CAPA 생성 안 됨 (null 반환)
  const passCapa = createCapaFromInspectionFailure('insp-202610-02', standard, passRes);
  assert.equal(passCapa, null);

  console.log('qualityInspectionEngine.test.ts: ok');
}

run();
