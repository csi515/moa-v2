/**
 * Moa v2 2-Way Onboarding & Claim Domain Engine
 *
 * Pure business logic for enrollment payload normalization and claim token lifecycle verification.
 * Zero UI/DB dependency, fully testable via standalone tsx.
 */

export interface ChildEnrollmentInput {
  name: string;
  phone?: string;
  birthDate?: string;
  memo?: string;
}

export interface EnrollmentPayloadInput {
  isSelf: boolean;
  name: string;
  phone: string;
  email?: string;
  authUserId?: string;
  children?: ChildEnrollmentInput[];
}

export interface NormalizedChild {
  name: string;
  phone?: string;
  birth_date?: string;
  memo?: string;
}

export interface NormalizedEnrollmentPayload {
  is_self: boolean;
  name: string;
  phone: string;
  email?: string;
  auth_user_id?: string;
  children: NormalizedChild[];
}

export interface TokenRecordLike {
  claim_token: string;
  expires_at: string | Date | number;
  is_used: boolean;
}

export type ClaimTokenStatus =
  | { status: 'VALID'; remainingMs: number }
  | { status: 'ALREADY_USED' }
  | { status: 'EXPIRED'; expiredMsAgo: number };

/**
 * Normalizes user input into a standardized enrollment payload JSON tree.
 * Handles self-enrollment (adult) vs parent/guardian enrollment with one or more children.
 */
export function buildEnrollmentPayload(params: EnrollmentPayloadInput): NormalizedEnrollmentPayload {
  const trimmedName = params.name.trim();
  if (!trimmedName) {
    throw new Error('Name is required');
  }

  const cleanedPhone = params.phone.trim().replace(/[^0-9]/g, '');
  if (!cleanedPhone) {
    throw new Error('Valid phone number is required');
  }

  const email = params.email?.trim() || undefined;
  const authUserId = params.authUserId?.trim() || undefined;

  if (params.isSelf) {
    return {
      is_self: true,
      name: trimmedName,
      phone: cleanedPhone,
      email,
      auth_user_id: authUserId,
      children: [],
    };
  }

  // Parent/guardian registering children
  const inputChildren = params.children || [];
  const normalizedChildren: NormalizedChild[] = inputChildren
    .map((c) => ({
      name: c.name.trim(),
      phone: c.phone ? c.phone.trim().replace(/[^0-9]/g, '') : undefined,
      birth_date: c.birthDate?.trim() || undefined,
      memo: c.memo?.trim() || undefined,
    }))
    .filter((c) => c.name.length > 0);

  if (normalizedChildren.length === 0) {
    throw new Error('At least one child is required when enrolling as a guardian');
  }

  return {
    is_self: false,
    name: trimmedName,
    phone: cleanedPhone,
    email,
    auth_user_id: authUserId,
    children: normalizedChildren,
  };
}

/**
 * Pure function evaluating claim token validity, TTL remaining, and used state.
 */
export function validateClaimTokenStatus(
  tokenRecord: TokenRecordLike,
  currentTimestamp: Date | number = Date.now()
): ClaimTokenStatus {
  if (tokenRecord.is_used) {
    return { status: 'ALREADY_USED' };
  }

  const now = typeof currentTimestamp === 'number' ? currentTimestamp : currentTimestamp.getTime();
  const expiresAt =
    typeof tokenRecord.expires_at === 'number'
      ? tokenRecord.expires_at
      : new Date(tokenRecord.expires_at).getTime();

  if (now > expiresAt) {
    return {
      status: 'EXPIRED',
      expiredMsAgo: now - expiresAt,
    };
  }

  return {
    status: 'VALID',
    remainingMs: expiresAt - now,
  };
}
