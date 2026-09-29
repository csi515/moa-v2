/**
 * DB begin/complete/fail 와 같은 상태기.
 * 동시 요청은 호출측에서 직렬화했다고 가정한다(advisory xact lock).
 */
import type {
  BeginIdempotencyInput,
  BeginIdempotencyResult,
  IdempotencyRecord,
  IdempotencyStatus,
} from './types';

export type IdempotencyStore = Map<string, IdempotencyRecord>;

export function idempotencyStoreKey(organizationId: string, key: string): string {
  return `${organizationId}::${key}`;
}

function isExpired(row: IdempotencyRecord, now: number): boolean {
  return Date.parse(row.expiresAt) <= now;
}

export function beginIdempotency(
  store: IdempotencyStore,
  input: BeginIdempotencyInput
): { result: BeginIdempotencyResult; store: IdempotencyStore } {
  const now = input.now ?? Date.parse('2026-09-24T09:00:00.000Z');
  const id = idempotencyStoreKey(input.organizationId, input.key);
  const next = new Map(store);
  const existing = next.get(id);

  if (!existing) {
    next.set(id, {
      organizationId: input.organizationId,
      key: input.key,
      operation: input.operation,
      requestHash: input.requestHash,
      status: 'processing',
      responsePayload: null,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    });
    return { result: { outcome: 'execute' }, store: next };
  }

  if (existing.operation !== input.operation || existing.requestHash !== input.requestHash) {
    return { result: { outcome: 'mismatch' }, store };
  }

  if (existing.status === 'succeeded') {
    return { result: { outcome: 'replay', response: existing.responsePayload }, store };
  }

  if (existing.status === 'failed' || isExpired(existing, now)) {
    next.set(id, { ...existing, status: 'processing', responsePayload: null });
    return { result: { outcome: 'execute' }, store: next };
  }

  return { result: { outcome: 'in_progress' }, store };
}

export function completeIdempotency(
  store: IdempotencyStore,
  organizationId: string,
  key: string,
  response: unknown
): IdempotencyStore {
  const next = new Map(store);
  const id = idempotencyStoreKey(organizationId, key);
  const row = next.get(id);
  if (!row) return next;
  next.set(id, { ...row, status: 'succeeded' as IdempotencyStatus, responsePayload: response });
  return next;
}

export function failIdempotency(
  store: IdempotencyStore,
  organizationId: string,
  key: string
): IdempotencyStore {
  const next = new Map(store);
  const id = idempotencyStoreKey(organizationId, key);
  const row = next.get(id);
  if (!row) return next;
  next.set(id, { ...row, status: 'failed', responsePayload: null });
  return next;
}

/** advisory lock 직렬화 가정. 같은 key는 한 번만 effect. */
export function runSerializedIdempotentCommands<T>(
  commands: Array<{
    organizationId: string;
    key: string;
    operation: string;
    requestHash: string;
    effect: () => T;
  }>
): Array<{ ok: true; value: T } | { ok: false; reason: 'mismatch' | 'in_progress' }> {
  let store: IdempotencyStore = new Map();
  return commands.map((command) => {
    const begun = beginIdempotency(store, command);
    store = begun.store;
    if (begun.result.outcome === 'replay') {
      return { ok: true, value: begun.result.response as T };
    }
    if (begun.result.outcome === 'mismatch') {
      return { ok: false, reason: 'mismatch' };
    }
    if (begun.result.outcome === 'in_progress') {
      return { ok: false, reason: 'in_progress' };
    }
    const value = command.effect();
    store = completeIdempotency(store, command.organizationId, command.key, value);
    return { ok: true, value };
  });
}
