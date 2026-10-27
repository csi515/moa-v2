import assert from 'node:assert/strict';
import {
  calculateOnboardingProgress,
  evaluateProbationPass,
  validateOnboardingInput,
  type OnboardingTask,
} from './onboardingEngine';

function run() {
  const tasks: OnboardingTask[] = [
    { id: 't1', title: '사규 및 근로계약서 확인', category: 'ORIENTATION', is_completed: true },
    { id: 't2', title: '출결 시스템 사용법 숙지', category: 'SYSTEM_TRAINING', is_completed: true },
    { id: 't3', title: '시강/모의 수업 평가', category: 'DEMO_TEACHING', is_completed: false },
    { id: 't4', title: '수습 평가 면담', category: 'PROBATION_REVIEW', is_completed: false },
  ];

  // 1. 진행률 계산 (4개 중 2개 완료 -> 50%)
  const prog = calculateOnboardingProgress(tasks);
  assert.equal(prog.total, 4);
  assert.equal(prog.completed, 2);
  assert.equal(prog.percent, 50);

  // 2. 수습 평가 판정
  // 과제 미완료 시 무조건 진행 중
  assert.equal(evaluateProbationPass(90, 50), 'IN_PROGRESS');
  // 100% 완료 + 85점 -> 합격
  assert.equal(evaluateProbationPass(85, 100), 'PASSED');
  // 100% 완료 + 70점 -> 수습 연장
  assert.equal(evaluateProbationPass(70, 100), 'EXTENDED');
  // 100% 완료 + 50점 -> 불합격
  assert.equal(evaluateProbationPass(50, 100), 'FAILED');

  // 3. 유효성 검증
  assert.equal(validateOnboardingInput('이신입', '피아노 전임강사', '김원장').isValid, true);
  assert.equal(validateOnboardingInput('', '피아노 전임강사', '김원장').isValid, false);

  console.log('onboardingEngine.test.ts: ok');
}

run();
