import assert from 'node:assert/strict';
import {
  evaluateChangeOrderReadiness,
  formatChangeNumber,
  assessChangeRiskLevel,
  type ChangeOrderEvaluation,
} from './changeManagementEngine';

function testEvaluateChangeOrderReadiness(): void {
  // 1. 품질 부서 검토 누락 테스트
  const ev1: ChangeOrderEvaluation[] = [
    {
      evaluator_role: 'production',
      evaluator_name: '김생산',
      impact_assessment: '작업 공수 영향 없음',
      is_approved: true,
    },
  ];

  const res1 = evaluateChangeOrderReadiness('draft', 'medium', ev1);
  assert.equal(res1.canApprove, false);
  assert.deepEqual(res1.missingRoles, ['quality']);

  // 2. 반려 의견 포함 테스트
  const ev2: ChangeOrderEvaluation[] = [
    {
      evaluator_role: 'quality',
      evaluator_name: '박품질',
      impact_assessment: '공차 규격 초과 위험 확인되어 부적합',
      is_approved: false,
    },
  ];

  const res2 = evaluateChangeOrderReadiness('reviewing', 'low', ev2);
  assert.equal(res2.canApprove, false);
  assert.equal(res2.rejectionReasons.length, 1);
  assert.match(res2.rejectionReasons[0]!, /박품질/);

  // 3. Critical 등급에서 품질 + 안전 합의 완료 시 정상 승인 가능
  const ev3: ChangeOrderEvaluation[] = [
    {
      evaluator_role: 'quality',
      evaluator_name: '박품질',
      impact_assessment: '대체 규격 시험 합격',
      is_approved: true,
    },
    {
      evaluator_role: 'safety',
      evaluator_name: '이안전',
      impact_assessment: 'MSDS 및 방호 조치 확인',
      is_approved: true,
    },
  ];

  const res3 = evaluateChangeOrderReadiness('reviewing', 'critical', ev3);
  assert.equal(res3.canApprove, true);
  assert.equal(res3.requiresExecutiveApproval, true);

  // 4. 적용(Apply) 가능 여부 테스트
  const resApproved = evaluateChangeOrderReadiness('approved', 'medium', ev3);
  assert.equal(resApproved.canApply, true);

  const resDraft = evaluateChangeOrderReadiness('draft', 'medium', ev3);
  assert.equal(resDraft.canApply, false);
}

function testFormatChangeNumber(): void {
  const date = new Date(2026, 9, 17); // 2026-10-17
  const formatted = formatChangeNumber('ecn', date, 42);
  assert.equal(formatted, 'ECN-202610-042');
}

function testAssessChangeRiskLevel(): void {
  assert.equal(
    assessChangeRiskLevel({ category: 'machine', affectsSafety: true, affectsCustomerSpec: false }),
    'critical'
  );
  assert.equal(
    assessChangeRiskLevel({ category: 'material', affectsSafety: false, affectsCustomerSpec: true }),
    'high'
  );
  assert.equal(
    assessChangeRiskLevel({ category: 'method', affectsSafety: false, affectsCustomerSpec: false }),
    'medium'
  );
  assert.equal(
    assessChangeRiskLevel({ category: 'man', affectsSafety: false, affectsCustomerSpec: false }),
    'low'
  );
}

function run(): void {
  testEvaluateChangeOrderReadiness();
  testFormatChangeNumber();
  testAssessChangeRiskLevel();
  console.log('changeManagementEngine.test.ts: ok');
}

run();
