import assert from 'node:assert/strict';
import {
  formatCertificateNumber,
  generateVerificationHash,
  verifyCertificateIntegrity,
  getCertificateTypeLabel,
} from './certificateEngine';

function run() {
  // 1. 채번 포맷
  const certNum = formatCertificateNumber('ACAD', 2026, 7);
  assert.equal(certNum, 'ACAD-2026-0007');

  // 2. 검증 해시 및 무결성 검사
  const hash = generateVerificationHash(certNum, '홍길동', '2026-10-18');
  assert.equal(hash.length, 6);
  assert.equal(verifyCertificateIntegrity(certNum, '홍길동', '2026-10-18', hash), true);
  assert.equal(verifyCertificateIntegrity(certNum, '임꺽정', '2026-10-18', hash), false); // 위조 시도 차단

  // 3. 라벨 확인
  assert.equal(getCertificateTypeLabel('COURSE_COMPLETION'), '교육 수료증');

  console.log('certificateEngine.test.ts: ok');
}

run();
