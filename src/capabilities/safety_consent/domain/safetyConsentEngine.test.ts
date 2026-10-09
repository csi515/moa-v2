import assert from 'node:assert/strict';
import {
  selectActiveConsentTemplate,
  validateSignatureMetadata,
  generateConsentAuditRecord,
  type ConsentTemplate,
} from './safetyConsentEngine';

function run() {
  const templates: ConsentTemplate[] = [
    {
      id: 'tpl-1',
      type: 'CLIMBING_WAIVER',
      version: 1,
      title: '클라이밍 안전 수칙 및 면책 서약서 v1',
      bodyText: '구 버전 약관 본문',
      mandatoryClauses: [{ id: 'clause-1', text: '부상 위험 고지 확인' }],
      effectiveFrom: '2025-01-01',
      isActive: true,
    },
    {
      id: 'tpl-2',
      type: 'CLIMBING_WAIVER',
      version: 2,
      title: '클라이밍 안전 수칙 및 면책 서약서 v2',
      bodyText: '신 버전 개정 약관 본문',
      mandatoryClauses: [
        { id: 'clause-1', text: '부상 위험 고지 확인' },
        { id: 'clause-2', text: '안전 장비 착용 의무' },
      ],
      effectiveFrom: '2026-01-01',
      isActive: true,
    },
  ];

  // 1. 최신 활성 서약서 버전 선택 (2026년 기준 v2 선택)
  const activeTpl = selectActiveConsentTemplate(templates, 'CLIMBING_WAIVER', '2026-06-01');
  assert.ok(activeTpl);
  assert.equal(activeTpl.version, 2);
  assert.equal(activeTpl.id, 'tpl-2');

  // 2. 캔버스 서명 메타데이터 검증
  // 2-1. 점 하나 찍은 무효 서명 거부
  const invalidSingleDot = validateSignatureMetadata({
    strokeCount: 1,
    totalPointsCount: 3, // 너무 적은 점
    durationMs: 50, // 너무 짧음
    dataUrlLength: 150,
  });
  assert.equal(invalidSingleDot.isValid, false);
  assert.match(invalidSingleDot.error!, /서명 궤적이 너무 짧거나/);

  // 2-2. 정상 필기 서명 통과
  const validSignature = validateSignatureMetadata({
    strokeCount: 3,
    totalPointsCount: 85,
    durationMs: 1200,
    dataUrlLength: 2048,
  });
  assert.equal(validSignature.isValid, true);

  // 3. 필수 조항 누락 시 감사 로그 생성 거부
  const missingClauseAttempt = generateConsentAuditRecord({
    consentId: 'cs-001',
    template: activeTpl,
    signerName: '홍길동',
    signerPhone: '010-1234-5678',
    agreedClauseIds: ['clause-1'], // clause-2 누락!
    signatureDataUrl: 'data:image/png;base64,sample...',
    userAgent: 'Mozilla/5.0...',
  });
  assert.equal(missingClauseAttempt.success, false);
  assert.match(missingClauseAttempt.error!, /필수 동의 조항이 누락되었습니다/);

  // 4. 정상 감사 로그(Audit Record) 생성
  const auditSuccess = generateConsentAuditRecord({
    consentId: 'cs-002',
    template: activeTpl,
    signerName: '홍길동',
    signerPhone: '010-1234-5678',
    agreedClauseIds: ['clause-1', 'clause-2'],
    signatureDataUrl: 'data:image/png;base64,validSignatureData...',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    ipAddress: '203.0.113.195',
    timestamp: '2026-06-01T15:00:00Z',
  });
  assert.equal(auditSuccess.success, true);
  assert.equal(auditSuccess.auditRecord.signerName, '홍길동');
  assert.equal(auditSuccess.auditRecord.templateVersion, 2);
  assert.ok(auditSuccess.auditRecord.signatureProofHash.startsWith('PROOF-'));
  assert.equal(auditSuccess.auditRecord.clientEnvironment.ipAddress, '203.0.113.195');

  console.log('safetyConsentEngine.test.ts: ok');
}

run();
