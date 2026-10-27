import assert from 'node:assert/strict';
import {
  analyzeIntakeSubmission,
  assembleIntakeSummaryCard,
  IntakeTemplate,
} from './intakeAssessmentEngine.js';

console.log('[test:intake-assessment] starting test suite...');

// 1. 템플릿 샘플 정의
const template: IntakeTemplate = {
  id: 'tmpl-1',
  organizationId: 'org-1',
  title: '필라테스/피트니스 사전 문진표',
  industryTarget: 'pilates',
  isActive: true,
  questionSections: [
    {
      id: 'sec-health',
      title: '건강 및 부상 이력',
      questions: [
        {
          id: 'q-disc',
          label: '허리/목 디스크 진단을 받은 적이 있습니까?',
          type: 'boolean',
          required: true,
          isRiskFlag: true,
          criticalValue: true,
        },
        {
          id: 'q-pregnant',
          label: '현재 임신 중이거나 출산 후 6개월 이내입니까?',
          type: 'boolean',
          required: false,
          isRiskFlag: true,
          criticalValue: true,
        },
      ],
    },
    {
      id: 'sec-goal',
      title: '운동 목적',
      questions: [
        {
          id: 'q-goal',
          label: '주요 운동 목적',
          type: 'choice',
          options: ['다이어트', '체형교정', '근력증가', '재활'],
          required: true,
        },
      ],
    },
  ],
};

// 2. 위험 플래그 감지 검증
const submissionWithRisk = analyzeIntakeSubmission({
  template,
  customerName: '이나경',
  customerPhone: '010-1234-5678',
  submissionId: 'sub-1',
  answers: {
    'q-disc': true,
    'q-pregnant': false,
    'q-goal': '체형교정',
  },
});

assert.equal(submissionWithRisk.customerName, '이나경');
assert.equal(submissionWithRisk.hasCriticalCondition, true);
assert.equal(submissionWithRisk.riskFlags.length, 1);
assert.match(submissionWithRisk.riskFlags[0], /허리\/목 디스크/);
console.log('✓ 1. 문진표 위험 플래그 및 심각도 감지 통과');

// 3. 정상 고객 검증 (위험 요소 없음)
const cleanSubmission = analyzeIntakeSubmission({
  template,
  customerName: '박건강',
  submissionId: 'sub-2',
  answers: {
    'q-disc': false,
    'q-pregnant': false,
    'q-goal': '근력증가',
  },
});

assert.equal(cleanSubmission.hasCriticalCondition, false);
assert.equal(cleanSubmission.riskFlags.length, 0);
console.log('✓ 2. 정상 고객 무위험 판정 통과');

// 4. 요약 카드 조립 검증
const summaryCard = assembleIntakeSummaryCard(submissionWithRisk);
assert.match(summaryCard, /📋 \[사전 문진 요약\] 이나경/);
assert.match(summaryCard, /🚨 집중 관리 대상/);
assert.match(summaryCard, /허리\/목 디스크/);
console.log('✓ 3. 사전 문진 요약 카드 텍스트 조립 통과');

console.log('[test:intake-assessment] ALL TESTS PASSED! (100%)');
