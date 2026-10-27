import assert from 'node:assert/strict';
import {
  maskSensitiveData,
  validateAuditReason,
  isEligibleForPurge,
} from './privacyAuditEngine';

function run() {
  // 1. 마스킹 함수 검증
  assert.equal(maskSensitiveData('900101-1234567', 'RRN'), '900101-1******');
  assert.equal(maskSensitiveData('010-1234-5678', 'PHONE'), '010-****-5678');
  assert.equal(maskSensitiveData('110-123-456789', 'ACCOUNT').slice(-4), '6789');

  // 2. 열람 사유 검증
  assert.equal(validateAuditReason(true, 'TAX_WITHHOLDING', '연말정산 세무서 제출').isValid, true);
  assert.equal(validateAuditReason(true, 'TAX_WITHHOLDING', '확인').isValid, false); // 5자 미만 실패

  // 3. 파기 적격 판정 (1년 보관 기준)
  assert.equal(isEligibleForPurge('2024-01-01T00:00:00Z', 1, new Date('2026-10-18T00:00:00Z')), true);
  assert.equal(isEligibleForPurge('2026-05-01T00:00:00Z', 1, new Date('2026-10-18T00:00:00Z')), false);

  console.log('privacyAuditEngine.test.ts: ok');
}

run();
