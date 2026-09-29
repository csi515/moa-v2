/**
 * Sync outbox — remote persist 재시도 대기열. offline-command 큐.
 *
 * v1: StorageKey[] (스냅샷 재시도)
 * v2: keys + mutation identity/revision
 *
 * 스냅샷 flush는 유지한다. 같은 entity의 낮은 revision은 적용하지 않는다.
 */
import { OFFLINE_COMMAND_STORE_POLICIES } from '@/core/storage/persistencePolicy';
import type { StorageKey } from './storageKeys';

export const SYNC_OUTBOX_POLICY = OFFLINE_COMMAND_STORE_POLICIES.syncOutbox;
import { getOrganizationId } from './storageContext';
import { readLocalRaw, writeLocalRaw } from './localStorageEngine';
import {
  isSameMutationTarget,
  isStaleMutation,
  latestMutationForTarget,
  type PendingMutationKind,
} from './mutationRecord';
import { peekPendingMutations } from './pendingMutations';

export type SyncOutboxMutation = {
  id: string;
  key: StorageKey;
  kind: PendingMutationKind;
  entityId?: string;
  revision: number;
  enqueuedAt: string;
};

type OutboxStoreV2 = {
  v: 2;
  keys: StorageKey[];
  mutations: SyncOutboxMutation[];
};

const OUTBOX_PREFIX = 'moa:sync-outbox:';

function outboxKey(orgId: string): string {
  return `${OUTBOX_PREFIX}${orgId}`;
}

function emptyStore(): OutboxStoreV2 {
  return { v: 2, keys: [], mutations: [] };
}

function migrateOutbox(raw: unknown): OutboxStoreV2 {
  if (Array.isArray(raw)) {
    return {
      v: 2,
      keys: raw.filter((item): item is StorageKey => typeof item === 'string'),
      mutations: [],
    };
  }
  if (!raw || typeof raw !== 'object') return emptyStore();
  const parsed = raw as Partial<OutboxStoreV2>;
  const keys = Array.isArray(parsed.keys)
    ? parsed.keys.filter((item): item is StorageKey => typeof item === 'string')
    : [];
  const mutations = Array.isArray(parsed.mutations)
    ? parsed.mutations.filter((item): item is SyncOutboxMutation => {
        return !!item && typeof item === 'object' && typeof item.id === 'string' && typeof item.key === 'string';
      })
    : [];
  return { v: 2, keys, mutations };
}

function readStore(orgId: string): OutboxStoreV2 {
  try {
    const raw = readLocalRaw(outboxKey(orgId));
    if (!raw) return emptyStore();
    return migrateOutbox(JSON.parse(raw));
  } catch {
    return emptyStore();
  }
}

function writeStore(orgId: string, store: OutboxStoreV2): void {
  writeLocalRaw(outboxKey(orgId), JSON.stringify(store));
}

/** remote persist 실패 키를 org 스코프 outbox에 적재 (업무 데이터 저장 아님) */
export function enqueueSyncOutbox(key: StorageKey): void {
  const orgId = getOrganizationId();
  if (!orgId) return;
  const store = readStore(orgId);
  if (!store.keys.includes(key)) store.keys.push(key);
  writeStore(orgId, store);
}

export function enqueueSyncOutboxMutation(record: SyncOutboxMutation): void {
  const orgId = getOrganizationId();
  if (!orgId) return;
  const store = readStore(orgId);
  if (!store.keys.includes(record.key)) store.keys.push(record.key);
  const existing = latestMutationForTarget(store.mutations, record);
  if (existing && isStaleMutation(record, existing)) {
    writeStore(orgId, store);
    return;
  }
  store.mutations = store.mutations.filter((row) => !isSameMutationTarget(row, record));
  store.mutations.push(record);
  writeStore(orgId, store);
}

export function peekSyncOutbox(): StorageKey[] {
  const orgId = getOrganizationId();
  if (!orgId) return [];
  const store = readStore(orgId);
  const keys = [...store.keys];
  for (const row of store.mutations) {
    if (!keys.includes(row.key)) keys.push(row.key);
  }
  return keys;
}

export function peekSyncOutboxMutations(): SyncOutboxMutation[] {
  const orgId = getOrganizationId();
  if (!orgId) return [];
  return readStore(orgId).mutations;
}

export function clearSyncOutboxKeys(keys: StorageKey[], upToRevision?: number): void {
  const orgId = getOrganizationId();
  if (!orgId) return;
  const store = readStore(orgId);
  store.keys = store.keys.filter((key) => !keys.includes(key));
  if (upToRevision != null) {
    store.mutations = store.mutations.filter(
      (row) => !keys.includes(row.key) || row.revision > upToRevision
    );
  }
  writeStore(orgId, store);
}

export function hasPendingSyncOutbox(): boolean {
  return peekSyncOutbox().length > 0;
}

/**
 * outbox key만 있고 pending이 없으면 이미 확정된 leftover.
 * 로그아웃 차단은 pending persistState를 기준으로 한다.
 */
export function hasActionableSyncOutbox(orgId?: string | null): boolean {
  const id = orgId ?? getOrganizationId();
  if (!id) return false;
  const pending = peekPendingMutations(id);
  if (pending.length === 0) return false;
  const pendingKeys = new Set(pending.map((row) => row.key));
  const store = readStore(id);
  if (store.keys.some((key) => pendingKeys.has(key))) return true;
  return store.mutations.some((row) =>
    pending.some(
      (item) =>
        item.key === row.key &&
        (item.entityId ?? '') === (row.entityId ?? '') &&
        item.revision >= row.revision
    )
  );
}
