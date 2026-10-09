import assert from 'node:assert/strict';
import {
  buildEnrollmentPayload,
  validateClaimTokenStatus,
  type EnrollmentPayloadInput,
} from './claimEngine';

console.log('[TEST] claimEngine pure business logic running...');

// 1. buildEnrollmentPayload - Self-enrollment
{
  const input: EnrollmentPayloadInput = {
    isSelf: true,
    name: '  홍길동  ',
    phone: '010-1234-5678',
    email: 'hong@example.com',
    authUserId: 'user-uuid-1234',
  };

  const payload = buildEnrollmentPayload(input);
  assert.equal(payload.is_self, true);
  assert.equal(payload.name, '홍길동');
  assert.equal(payload.phone, '01012345678');
  assert.equal(payload.email, 'hong@example.com');
  assert.equal(payload.auth_user_id, 'user-uuid-1234');
  assert.deepEqual(payload.children, []);
}

// 2. buildEnrollmentPayload - Guardian enrollment with multiple children
{
  const input: EnrollmentPayloadInput = {
    isSelf: false,
    name: '이부모',
    phone: '010-9876-5432',
    children: [
      { name: '이지우', birthDate: '2015-05-12', memo: '피아노 입문' },
      { name: '이하늘', phone: '010-1111-2222', birthDate: '2018-09-01' },
      { name: '   ' }, // invalid whitespace child name should be filtered
    ],
  };

  const payload = buildEnrollmentPayload(input);
  assert.equal(payload.is_self, false);
  assert.equal(payload.name, '이부모');
  assert.equal(payload.phone, '01098765432');
  assert.equal(payload.children.length, 2);
  assert.equal(payload.children[0].name, '이지우');
  assert.equal(payload.children[0].memo, '피아노 입문');
  assert.equal(payload.children[1].name, '이하늘');
  assert.equal(payload.children[1].phone, '01011112222');
}

// 3. buildEnrollmentPayload - Validation Errors
{
  assert.throws(() => {
    buildEnrollmentPayload({ isSelf: true, name: '', phone: '010-1234-5678' });
  }, /Name is required/);

  assert.throws(() => {
    buildEnrollmentPayload({ isSelf: true, name: '홍길동', phone: '' });
  }, /Valid phone number is required/);

  assert.throws(() => {
    buildEnrollmentPayload({ isSelf: false, name: '보호자', phone: '010-1234-5678', children: [] });
  }, /At least one child is required/);
}

// 4. validateClaimTokenStatus - Valid token within 5m TTL
{
  const baseTime = 1700000000000;
  const token = {
    claim_token: 'CLAIM_ABC123',
    expires_at: baseTime + 300000, // 5 min later
    is_used: false,
  };

  const status = validateClaimTokenStatus(token, baseTime);
  assert.equal(status.status, 'VALID');
  if (status.status === 'VALID') {
    assert.equal(status.remainingMs, 300000);
  }
}

// 5. validateClaimTokenStatus - Already used token
{
  const baseTime = 1700000000000;
  const token = {
    claim_token: 'CLAIM_USED_001',
    expires_at: baseTime + 100000,
    is_used: true,
  };

  const status = validateClaimTokenStatus(token, baseTime);
  assert.equal(status.status, 'ALREADY_USED');
}

// 6. validateClaimTokenStatus - Expired token
{
  const baseTime = 1700000000000;
  const token = {
    claim_token: 'CLAIM_EXP_002',
    expires_at: baseTime - 5000, // expired 5 seconds ago
    is_used: false,
  };

  const status = validateClaimTokenStatus(token, baseTime);
  assert.equal(status.status, 'EXPIRED');
  if (status.status === 'EXPIRED') {
    assert.equal(status.expiredMsAgo, 5000);
  }
}

console.log('[TEST] claimEngine tests ALL PASSED!');
