import assert from 'node:assert/strict';
import {
  evaluateAccessAttempt,
  validateBlacklistInput,
  type BlacklistRecord,
} from './blacklistGuardEngine';

function run() {
  const records: BlacklistRecord[] = [
    {
      id: 'bl-1',
      tenant_id: 't-1',
      target_name: '악성고객',
      target_phone: '010-1234-5678',
      severity: 'PERMANENT_EXPULSION',
      reason: 'VIOLENCE_VERBAL',
      incident_summary: '기물 파손 및 직원 폭언',
      is_active: true,
      registered_by: '관리자',
      created_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'bl-2',
      tenant_id: 't-1',
      target_name: '정지고객',
      target_phone: '010-9999-8888',
      severity: 'TEMPORARY_SUSPENSION',
      reason: 'NON_PAYMENT',
      incident_summary: '3개월 미납',
      restricted_until: '2026-10-31T23:59:59Z',
      is_active: true,
      registered_by: '관리자',
      created_at: '2026-10-01T00:00:00Z',
    },
  ];

  // 1. 영구 제명 차단
  const res1 = evaluateAccessAttempt(records, '010-1234-5678');
  assert.equal(res1.isBlocked, true);
  assert.equal(res1.severity, 'PERMANENT_EXPULSION');

  // 2. 기한부 정지 유효 기간 내 차단
  const res2 = evaluateAccessAttempt(records, '010-9999-8888', new Date('2026-10-15T00:00:00Z'));
  assert.equal(res2.isBlocked, true);

  // 3. 기한부 정지 기간 만료 후 통과
  const res3 = evaluateAccessAttempt(records, '010-9999-8888', new Date('2026-11-05T00:00:00Z'));
  assert.equal(res3.isBlocked, false);

  // 4. 일반 회원 통과
  const res4 = evaluateAccessAttempt(records, '010-5555-4444');
  assert.equal(res4.isBlocked, false);

  // 5. 유효성 검증
  assert.equal(validateBlacklistInput('홍길동', '010-1111-2222', '시설 무단 침입').isValid, true);
  assert.equal(validateBlacklistInput('', '010-1111-2222', '시설 무단 침입').isValid, false);

  console.log('blacklistGuardEngine.test.ts: ok');
}

run();
