import assert from 'node:assert/strict';
import {
  evaluateIdentityChallenge,
  type StoredCustomerRecord,
  type RemoteChallengeSubmission,
} from './identityVerifier';

const baseStored: StoredCustomerRecord = {
  id: 'cust-1234',
  name: '김영희',
  phoneE164: '+821012345678',
  birthDate: '1985-05-12',
  childrenNames: ['이지우', '이하늘'],
  recentServiceKeywords: ['피아노 초급반', '체르니 100'],
  hasExistingAuth: false,
  authUserId: null,
};

// 1. No stored customer found
{
  const sub: RemoteChallengeSubmission = {
    candidatePhoneE164: '+821099998888',
    candidateName: '신규고객',
  };
  const decision = evaluateIdentityChallenge(null, sub);
  assert.equal(decision.status, 'NO_MATCH_NEW_CUSTOMER');
}

// 2. Hijack defense: Account already bound to an auth user
{
  const boundCustomer: StoredCustomerRecord = {
    ...baseStored,
    hasExistingAuth: true,
    authUserId: 'user-already-linked',
  };
  const sub: RemoteChallengeSubmission = {
    candidatePhoneE164: '+821012345678',
    candidateName: '김영희',
    candidateChildName: '이지우',
  };
  const decision = evaluateIdentityChallenge(boundCustomer, sub);
  assert.equal(decision.status, 'BLOCKED_ALREADY_CLAIMED');
}

// 3. Name + Child Name match -> PASS_LINK
{
  const sub: RemoteChallengeSubmission = {
    candidatePhoneE164: '+821012345678',
    candidateName: '김영희',
    candidateChildName: '이지우',
  };
  const decision = evaluateIdentityChallenge(baseStored, sub);
  assert.equal(decision.status, 'MATCH_AUTO_LINK');
  if (decision.status === 'MATCH_AUTO_LINK') {
    assert.equal(decision.matchCount, 2);
    assert.deepEqual(decision.matchedFields.sort(), ['child_name', 'name']);
  }
}

// 4. Name + Recent Service keyword match -> PASS_LINK
{
  const sub: RemoteChallengeSubmission = {
    candidatePhoneE164: '+821012345678',
    candidateName: '김 영 희 ', // whitespace insensitive
    candidateRecentService: '피아노',
  };
  const decision = evaluateIdentityChallenge(baseStored, sub);
  assert.equal(decision.status, 'MATCH_AUTO_LINK');
}

// 5. Name only match without secondary proof -> PARTIAL_REQUIRE_STAFF
{
  const sub: RemoteChallengeSubmission = {
    candidatePhoneE164: '+821012345678',
    candidateName: '김영희',
    candidateChildName: '남의아이',
  };
  const decision = evaluateIdentityChallenge(baseStored, sub);
  assert.equal(decision.status, 'PARTIAL_REQUIRE_STAFF');
  if (decision.status === 'PARTIAL_REQUIRE_STAFF') {
    assert.equal(decision.matchCount, 1);
    assert.deepEqual(decision.matchedFields, ['name']);
  }
}

// 6. Recycled number case: New phone owner enters different name -> PARTIAL_REQUIRE_STAFF
{
  const sub: RemoteChallengeSubmission = {
    candidatePhoneE164: '+821012345678',
    candidateName: '박새롬', // new owner of recycled number
  };
  const decision = evaluateIdentityChallenge(baseStored, sub);
  assert.equal(decision.status, 'PARTIAL_REQUIRE_STAFF');
  if (decision.status === 'PARTIAL_REQUIRE_STAFF') {
    assert.equal(decision.matchCount, 0);
  }
}

console.log('PASS: identityVerifier.test.ts');
