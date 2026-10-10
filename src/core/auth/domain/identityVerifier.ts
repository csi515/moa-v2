/**
 * Remote Customer Identity Challenge Evaluator
 *
 * Cost 0 KRW Principle: Defends against account hijacking and recycled phone number takeovers
 * without relying on paid telco SMS/PASS verification.
 * Pure business logic with zero database/UI dependencies, verified by node:assert.
 */

export interface StoredCustomerRecord {
  id: string;
  name: string;
  phoneE164: string;
  birthDate?: string | null;
  childrenNames?: string[];
  recentServiceKeywords?: string[];
  hasExistingAuth: boolean;
  authUserId?: string | null;
}

export interface RemoteChallengeSubmission {
  candidatePhoneE164: string;
  candidateName: string;
  candidateChildName?: string;
  candidateBirthDate?: string;
  candidateRecentService?: string;
}

export type ChallengeDecision =
  | {
      status: 'MATCH_AUTO_LINK';
      matchCount: number;
      matchedFields: string[];
    }
  | {
      status: 'BLOCKED_ALREADY_CLAIMED';
      reason: string;
    }
  | {
      status: 'PARTIAL_REQUIRE_STAFF';
      matchCount: number;
      matchedFields: string[];
      reason: string;
    }
  | {
      status: 'NO_MATCH_NEW_CUSTOMER';
      reason: string;
    };

function cleanString(str?: string | null): string {
  return (str || '').trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Pure evaluator for remote account claiming challenge.
 */
export function evaluateIdentityChallenge(
  stored: StoredCustomerRecord | null,
  submission: RemoteChallengeSubmission
): ChallengeDecision {
  if (!stored) {
    return {
      status: 'NO_MATCH_NEW_CUSTOMER',
      reason: 'No existing customer record found with this phone number.',
    };
  }

  // Account hijacking defense:
  // If customer is already bound to an auth account, block remote self-linking!
  if (stored.hasExistingAuth || Boolean(stored.authUserId)) {
    return {
      status: 'BLOCKED_ALREADY_CLAIMED',
      reason: 'Account already bound to an authenticated user. Please verify in-store via 1-time QR or contact staff.',
    };
  }

  const matchedFields: string[] = [];
  const candidateName = cleanString(submission.candidateName);
  const storedName = cleanString(stored.name);

  // 1. Primary Name Match
  if (candidateName && storedName && candidateName === storedName) {
    matchedFields.push('name');
  }

  // 2. Child Name Match
  const candidateChild = cleanString(submission.candidateChildName);
  if (candidateChild && stored.childrenNames && stored.childrenNames.length > 0) {
    const isChildMatched = stored.childrenNames.some(
      (c) => cleanString(c) === candidateChild
    );
    if (isChildMatched) {
      matchedFields.push('child_name');
    }
  }

  // 3. Birth Date Match
  const candidateBirth = cleanString(submission.candidateBirthDate);
  const storedBirth = cleanString(stored.birthDate);
  if (candidateBirth && storedBirth && candidateBirth === storedBirth) {
    matchedFields.push('birth_date');
  }

  // 4. Recent Service / Class Keyword Match
  const candidateService = cleanString(submission.candidateRecentService);
  if (candidateService && stored.recentServiceKeywords && stored.recentServiceKeywords.length > 0) {
    const isServiceMatched = stored.recentServiceKeywords.some((s) => {
      const cleanS = cleanString(s);
      return cleanS.includes(candidateService) || candidateService.includes(cleanS);
    });
    if (isServiceMatched) {
      matchedFields.push('recent_service');
    }
  }

  const matchCount = matchedFields.length;

  // Auto-link requirement: Name + at least one secondary proof (>= 2 matches)
  if (matchedFields.includes('name') && matchCount >= 2) {
    return {
      status: 'MATCH_AUTO_LINK',
      matchCount,
      matchedFields,
    };
  }

  // Any partial match or single match requires manual staff approval to prevent hijacking
  return {
    status: 'PARTIAL_REQUIRE_STAFF',
    matchCount,
    matchedFields,
    reason: matchCount > 0
      ? 'Insufficient verification details. Queued for staff confirmation.'
      : 'Customer record found with same phone, but identity details did not match. Queued for staff confirmation.',
  };
}
