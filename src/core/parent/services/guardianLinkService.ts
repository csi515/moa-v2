import { getCoreClient } from '@/lib/supabase';
import type { Json } from '@/lib/supabase/database.types';
import {
  DEFAULT_SHARED_CHILD_FIELDS,
  type SharedChildField,
} from '@/core/parent/services/parentChildService';
import {
  getSessionItem,
  removeSessionItem,
  setSessionItem,
} from '@/core/parent/services/sessionStorageSafe';
import {
  normalizeGuardianLinkCode,
  parseGuardianLinkCode,
} from '@/core/platform/deepLinkParser';

export interface GuardianLinkTokenResult {
  id: string;
  token: string;
  expiresAt: string;
  studentName: string;
  organizationId: string;
}

export interface GuardianLinkTokenItem {
  id: string;
  tokenType: string;
  expiresAt: string | null;
  maxUses: number;
  usedCount: number;
  createdAt: string;
  studentName: string | null;
  metadata?: Record<string, unknown>;
}

/** 서버 상태 코드 (20260928150000_guardian_link_hardening) */
export type GuardianLinkStatus =
  | 'valid'
  | 'linked'
  | 'linked_enrollment_pending'
  | 'invalid_or_expired'
  | 'rate_limited'
  | 'guardian_limit_reached'
  | 'parent_already_linked'
  | 'unknown';

export interface RedeemLinkResult {
  success: boolean;
  status: GuardianLinkStatus;
  /** 실패 시 사용자에게 보여줄 한국어 메시지 */
  errorMessage?: string;
  studentName: string;
  organizationName: string;
  organizationId: string;
  studentId?: string;
  mergedDuplicates?: number;
  enrollmentRequestId?: string;
}

function toStatus(raw: unknown, fallback: GuardianLinkStatus): GuardianLinkStatus {
  const s = typeof raw === 'string' ? raw : '';
  const known: GuardianLinkStatus[] = [
    'valid',
    'linked',
    'linked_enrollment_pending',
    'invalid_or_expired',
    'rate_limited',
    'guardian_limit_reached',
    'parent_already_linked',
  ];
  return (known as string[]).includes(s) ? (s as GuardianLinkStatus) : fallback;
}

/** 실패 상태 → 한국어 안내 */
export function guardianLinkErrorMessage(
  status: GuardianLinkStatus,
  retryAfterSeconds?: number
): string {
  switch (status) {
    case 'rate_limited': {
      const minutes = retryAfterSeconds ? Math.max(1, Math.ceil(retryAfterSeconds / 60)) : 15;
      return `시도가 너무 많습니다. 약 ${minutes}분 후 다시 시도해 주세요.`;
    }
    case 'guardian_limit_reached':
      return '이 학생에게 연결할 수 있는 보호자 계정 수를 초과했습니다. 사업장에 문의해 주세요.';
    case 'parent_already_linked':
      return '이 초대 코드의 학부모 정보는 이미 다른 계정에 연결되어 있습니다. 사업장에 문의해 주세요.';
    case 'invalid_or_expired':
    default:
      return '연결 코드가 유효하지 않거나 만료되었습니다. 사업장에 새 코드를 요청해 주세요.';
  }
}

export async function createGuardianLinkToken(
  organizationId: string,
  customerId: string,
  expiresDays = 7,
  maxUses = 1
): Promise<GuardianLinkTokenResult> {
  const { data, error } = await getCoreClient().rpc('create_guardian_link_token', {
    p_org_id: organizationId,
    p_customer_id: customerId,
    p_expires_days: expiresDays,
    p_max_uses: maxUses,
  });
  if (error) throw error;

  const raw = data as Record<string, unknown>;
  return {
    id: String(raw.id),
    token: String(raw.token),
    expiresAt: String(raw.expires_at),
    studentName: String(raw.student_name ?? ''),
    organizationId: String(raw.organization_id),
  };
}

export async function listGuardianLinkTokens(
  organizationId: string
): Promise<GuardianLinkTokenItem[]> {
  const { data, error } = await getCoreClient().rpc('list_guardian_link_tokens', {
    p_org_id: organizationId,
  });
  if (error) throw error;

  const rows = (data as Record<string, unknown>[] | null) ?? [];
  return rows.map((r) => ({
    id: String(r.id),
    tokenType: String(r.token_type ?? 'invite_code'),
    expiresAt: r.expires_at ? String(r.expires_at) : null,
    maxUses: Number(r.max_uses ?? 1),
    usedCount: Number(r.used_count ?? 0),
    createdAt: String(r.created_at ?? ''),
    studentName: r.student_name ? String(r.student_name) : null,
    metadata: r.metadata as Record<string, unknown> | undefined,
  }));
}

export async function revokeGuardianLinkToken(
  organizationId: string,
  tokenId: string
): Promise<void> {
  const { error } = await getCoreClient().rpc('revoke_guardian_link_token', {
    p_org_id: organizationId,
    p_token_id: tokenId,
  });
  if (error) throw error;
}

export interface GuardianLinkPreview {
  organizationName: string;
  studentName: string;
  expiresAt?: string;
}

/** 토큰을 소비하지 않고 학원·자녀 이름만 확인. 무효·제한 시 한국어 메시지로 throw */
export async function previewGuardianLinkToken(token: string): Promise<GuardianLinkPreview> {
  const { data, error } = await getCoreClient().rpc('preview_guardian_link_token', {
    p_token: normalizeGuardianLinkCode(token),
  });
  if (error) {
    if (error.message.includes('Invalid or expired')) {
      throw new Error(guardianLinkErrorMessage('invalid_or_expired'));
    }
    throw error;
  }

  const raw = (data ?? {}) as Record<string, unknown>;
  // 구버전 서버(상태 키 없음)는 성공 시에만 값을 반환
  if (raw.valid === false) {
    throw new Error(
      guardianLinkErrorMessage(
        toStatus(raw.status, 'invalid_or_expired'),
        Number(raw.retry_after_seconds ?? 0) || undefined
      )
    );
  }
  return {
    organizationName: String(raw.organization_name ?? ''),
    studentName: String(raw.student_name ?? ''),
    expiresAt: raw.expires_at ? String(raw.expires_at) : undefined,
  };
}

export async function redeemGuardianLinkToken(
  token: string,
  sharedFields: SharedChildField[] = [...DEFAULT_SHARED_CHILD_FIELDS]
): Promise<RedeemLinkResult> {
  const { data, error } = await getCoreClient().rpc('redeem_guardian_link_token', {
    p_token: normalizeGuardianLinkCode(token),
    p_shared_fields: sharedFields as unknown as Json,
  });
  if (error) {
    if (error.message.includes('Invalid or expired')) {
      throw new Error(guardianLinkErrorMessage('invalid_or_expired'));
    }
    throw error;
  }

  const raw = (data ?? {}) as Record<string, unknown>;
  const success = Boolean(raw.success);
  const status = toStatus(raw.status, success ? 'linked' : 'invalid_or_expired');
  return {
    success,
    status,
    errorMessage: success
      ? undefined
      : guardianLinkErrorMessage(status, Number(raw.retry_after_seconds ?? 0) || undefined),
    enrollmentRequestId: raw.enrollment_request_id ? String(raw.enrollment_request_id) : undefined,
    studentName: String(raw.student_name ?? ''),
    organizationName: String(raw.organization_name ?? ''),
    organizationId: String(raw.organization_id ?? ''),
    studentId: raw.student_id ? String(raw.student_id) : undefined,
    mergedDuplicates: Number(raw.merged_duplicates ?? 0),
  };
}

/** URL ?link=CODE 또는 sessionStorage pending token (가입/OAuth 후에도 유지) */
const PENDING_LINK_KEY = 'moa_pending_guardian_link';

export function storePendingGuardianLink(token: string): void {
  const normalized = normalizeGuardianLinkCode(token);
  if (!normalized) return;
  setSessionItem(PENDING_LINK_KEY, normalized);
}

export function peekPendingGuardianLink(): string | null {
  return getSessionItem(PENDING_LINK_KEY);
}

export function clearPendingGuardianLink(): void {
  removeSessionItem(PENDING_LINK_KEY);
}

/** 소비 후 제거. redeem 실패 시에는 peek로 유지할 것 */
export function consumePendingGuardianLink(): string | null {
  const token = peekPendingGuardianLink();
  if (token) clearPendingGuardianLink();
  return token;
}

export function parseGuardianLinkFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('link');
  if (raw !== null) {
    const url = new URL(window.location.href);
    url.searchParams.delete('link');
    window.history.replaceState({}, '', url.pathname + url.search);
  }
  // 형식이 맞지 않는 값은 저장하지 않음 (기존 8자리 / 신규 20자리만)
  return parseGuardianLinkCode(raw);
}
