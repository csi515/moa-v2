import assert from 'node:assert/strict';
import {
  calculateQscScoreAndGrade,
  validateAuditInput,
} from './franchiseSupervisionEngine';

function run() {
  // 1. 우수 등급 A (95점)
  const aRes = calculateQscScoreAndGrade(34, 33, 28);
  assert.equal(aRes.totalScore, 95);
  assert.equal(aRes.grade, 'GRADE_A');
  assert.equal(aRes.actionRequired, false);

  // 2. 보통 등급 B (82점)
  const bRes = calculateQscScoreAndGrade(30, 28, 24);
  assert.equal(bRes.totalScore, 82);
  assert.equal(bRes.grade, 'GRADE_B');
  assert.equal(bRes.actionRequired, false);

  // 3. 미흡 등급 F (65점 -> 시정명령 필수)
  const fRes = calculateQscScoreAndGrade(20, 25, 20);
  assert.equal(fRes.totalScore, 65);
  assert.equal(fRes.grade, 'GRADE_F');
  assert.equal(fRes.actionRequired, true);

  // 4. 유효성 검증
  assert.equal(validateAuditInput('강남 1호점', '김슈퍼바이저').isValid, true);
  assert.equal(validateAuditInput('', '김슈퍼바이저').isValid, false);

  console.log('franchiseSupervisionEngine.test.ts: ok');
}

run();
