import assert from 'node:assert/strict';
import {
  evaluateAssessment,
  generateCertificateNumber,
  generateCertificateSvg,
  type RubricItem,
} from './levelAssessmentEngine';

console.log('[test:level-assessment] starting test suite...');

// 1. 루브릭 가중치 채점 및 합격 판정
{
  const rubrics: RubricItem[] = [
    { id: 'r1', name: '기본 동작 정확성', maxScore: 50, weight: 40 }, // 40%
    { id: 'r2', name: '표현력 및 템포', maxScore: 30, weight: 30 },  // 30%
    { id: 'r3', name: '예의 및 수련 태도', maxScore: 20, weight: 30 }, // 30%
  ];

  // 만점 시나리오 (50, 30, 20) -> 100점 합격
  const fullScore = evaluateAssessment({
    rubrics,
    scores: { r1: 50, r2: 30, r3: 20 },
    passingScore: 70,
  });
  assert.equal(fullScore.totalScore, 100);
  assert.equal(fullScore.isPassed, true);

  // 커트라인 통과 시나리오 (r1: 35/50 -> 28, r2: 20/30 -> 20, r3: 16/20 -> 24) => 72점
  const passScore = evaluateAssessment({
    rubrics,
    scores: { r1: 35, r2: 20, r3: 16 },
    passingScore: 70,
  });
  assert.equal(passScore.totalScore, 72);
  assert.equal(passScore.isPassed, true);

  // 불합격 시나리오 (총점 56점 < 커트라인 70)
  const failScore = evaluateAssessment({
    rubrics,
    scores: { r1: 25, r2: 15, r3: 14 },
    passingScore: 70,
  });
  assert.equal(failScore.totalScore, 56);
  assert.equal(failScore.isPassed, false);
}
console.log('✓ 1. 루브릭 가중치 점수 환산 및 합격 판정 통과');

// 2. 모바일 합격증 일련번호 생성 검증
{
  const certNum1 = generateCertificateNumber(2026, 1);
  assert.equal(certNum1, 'MOA-CERT-2026-00001');

  const certNum42 = generateCertificateNumber(2026, 42);
  assert.equal(certNum42, 'MOA-CERT-2026-00042');
}
console.log('✓ 2. 전자 합격증 일련번호 생성 통과');

// 3. W3C SVG 전자 합격증 생성 검증
{
  const svg = generateCertificateSvg({
    studentName: '김민지',
    targetLevel: '태권도 1품(검은띠)',
    certificateNumber: 'MOA-CERT-2026-00042',
    issueDate: '2026-10-16',
    organizationName: '모아 태권도장',
  });
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('김민지'));
  assert.ok(svg.includes('태권도 1품(검은띠)'));
  assert.ok(svg.includes('MOA-CERT-2026-00042'));
  assert.ok(svg.includes('모아 태권도장'));
}
console.log('✓ 3. W3C SVG 0원 전자 합격증 렌더링 통과');

console.log('[test:level-assessment] ALL TESTS PASSED! (100%)');
