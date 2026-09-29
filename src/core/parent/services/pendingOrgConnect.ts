/** 공개 사업장 코드(/c/:code) → 학부모 학원 연결 요청용 pending */

import {
  getSessionItem,
  removeSessionItem,
  setSessionItem,
} from '@/core/parent/services/sessionStorageSafe';

const PENDING_ORG_CODE_KEY = 'moa_pending_org_public_code';

export function storePendingOrgPublicCode(code: string): void {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;
  setSessionItem(PENDING_ORG_CODE_KEY, normalized);
}

export function peekPendingOrgPublicCode(): string | null {
  return getSessionItem(PENDING_ORG_CODE_KEY);
}

export function consumePendingOrgPublicCode(): string | null {
  const code = peekPendingOrgPublicCode();
  removeSessionItem(PENDING_ORG_CODE_KEY);
  return code;
}
