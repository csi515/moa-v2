import { allowlistForEntity, AUDIT_SENSITIVE_KEYS } from './registry';

const SENSITIVE_SET = new Set<string>(AUDIT_SENSITIVE_KEYS);

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_SET.has(lower)) return true;
  return AUDIT_SENSITIVE_KEYS.some((part) => lower.includes(part));
}

/** 허용 필드만 남긴다. 미등록 entity는 빈 객체(전체 덤프 금지). */
export function sanitizeAuditPayload(
  entityType: string,
  data: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (data == null) return null;
  const allow = allowlistForEntity(entityType);
  if (allow.length === 0) return {};
  const next: Record<string, unknown> = {};
  for (const key of allow) {
    if (isSensitiveKey(key)) continue;
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    const value = data[key];
    if (value === undefined) continue;
    next[key] = value;
  }
  return next;
}

export function sanitizeAuditPair(
  entityType: string,
  beforeData?: Record<string, unknown> | null,
  afterData?: Record<string, unknown> | null
): {
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
} {
  return {
    beforeData: sanitizeAuditPayload(entityType, beforeData),
    afterData: sanitizeAuditPayload(entityType, afterData),
  };
}
