/** org 스코프 pending mutation. local write ≠ server commit. offline-command 큐. */
import { OFFLINE_COMMAND_STORE_POLICIES } from '@/core/storage/persistencePolicy';
import type { StorageKey } from './storageKeys';

export const PENDING_MUTATIONS_POLICY = OFFLINE_COMMAND_STORE_POLICIES.pendingMutations;
import { getOrganizationId } from './storageContext';
import { readLocal, readLocalRaw, writeLocalRaw } from './localStorageEngine';
import {
  createMutationId,
  decideHydrateRow,
  diffEntityListSnapshots,
  isSameMutationTarget,
  MUTATION_PERSIST_STATES,
  normalizePersistState,
  type MutationPersistState,
  type PendingMutationKind,
  type PendingMutationRecord,
} from './mutationRecord';

export type { MutationPersistState, PendingMutationKind, PendingMutationRecord };

/** server commit 전 persistState. committed 기록은 저장소에서 삭제된다. */
export function isUncommittedMutation(row: PendingMutationRecord): boolean {
  return MUTATION_PERSIST_STATES.includes(row.persistState);
}

type PendingStore = {
  v: 2;
  nextRevision: number;
  mutations: PendingMutationRecord[];
};

const PREFIX = 'moa:pending-mutations:';

function storeKey(orgId: string): string {
  return `${PREFIX}${orgId}`;
}

function emptyStore(): PendingStore {
  return { v: 2, nextRevision: 0, mutations: [] };
}

function migrateStore(raw: unknown): PendingStore {
  if (!raw || typeof raw !== 'object') return emptyStore();
  const parsed = raw as { v?: number; nextRevision?: number; mutations?: unknown };
  if (!Array.isArray(parsed.mutations)) return emptyStore();

  let nextRevision = typeof parsed.nextRevision === 'number' ? parsed.nextRevision : 0;
  const mutations: PendingMutationRecord[] = [];
  for (const item of parsed.mutations) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<PendingMutationRecord>;
    if (typeof row.key !== 'string') continue;
    const kind: PendingMutationKind = row.kind === 'delete' ? 'delete' : 'upsert';
    let revision = typeof row.revision === 'number' ? row.revision : 0;
    if (revision <= 0) {
      nextRevision += 1;
      revision = nextRevision;
    } else if (revision > nextRevision) {
      nextRevision = revision;
    }
    mutations.push({
      id: typeof row.id === 'string' && row.id ? row.id : createMutationId(),
      key: row.key as StorageKey,
      kind,
      entityId: typeof row.entityId === 'string' ? row.entityId : undefined,
      revision,
      updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date().toISOString(),
      conflict: row.conflict === true,
      persistState: normalizePersistState(row.persistState),
    });
  }
  return { v: 2, nextRevision, mutations };
}

function readStore(orgId: string): PendingStore {
  try {
    const raw = readLocalRaw(storeKey(orgId));
    if (!raw) return emptyStore();
    return migrateStore(JSON.parse(raw));
  } catch {
    return emptyStore();
  }
}

function writeStore(orgId: string, store: PendingStore): void {
  writeLocalRaw(storeKey(orgId), JSON.stringify(store));
}

function appendMutation(
  store: PendingStore,
  input: { key: StorageKey; kind: PendingMutationKind; entityId?: string; conflict?: boolean }
): PendingMutationRecord {
  store.mutations = store.mutations.filter((row) => !isSameMutationTarget(row, input));
  store.nextRevision += 1;
  const record: PendingMutationRecord = {
    id: createMutationId(),
    key: input.key,
    kind: input.kind,
    entityId: input.entityId,
    revision: store.nextRevision,
    updatedAt: new Date().toISOString(),
    conflict: input.conflict,
    persistState: 'local',
  };
  store.mutations.push(record);
  return record;
}

export function markPendingUpsert(key: StorageKey, entityId?: string): PendingMutationRecord | null {
  const orgId = getOrganizationId();
  if (!orgId) return null;
  const store = readStore(orgId);
  const record = appendMutation(store, { key, kind: 'upsert', entityId });
  writeStore(orgId, store);
  return record;
}

export function markPendingDelete(key: StorageKey, entityId: string): PendingMutationRecord | null {
  const orgId = getOrganizationId();
  if (!orgId) return null;
  const store = readStore(orgId);
  const record = appendMutation(store, { key, kind: 'delete', entityId });
  writeStore(orgId, store);
  return record;
}

export function markPendingFromSnapshot(key: StorageKey, previous: unknown, next: unknown): void {
  const diff = diffEntityListSnapshots(previous, next);
  if (!diff) {
    markPendingUpsert(key);
    return;
  }
  for (const id of diff.upsertIds) markPendingUpsert(key, id);
  for (const id of diff.deleteIds) markPendingDelete(key, id);
}

export function peekPendingMutations(orgId?: string | null): PendingMutationRecord[] {
  const id = orgId ?? getOrganizationId();
  if (!id) return [];
  return readStore(id).mutations;
}

export function hasPendingForKey(key: StorageKey, orgId?: string | null): boolean {
  return peekPendingMutations(orgId).some((row) => row.key === key);
}

export function pendingDeleteIds(key: StorageKey, orgId?: string | null): string[] {
  return peekPendingMutations(orgId)
    .filter((row) => row.key === key && row.kind === 'delete' && row.entityId)
    .map((row) => row.entityId as string);
}

export function maxPendingRevision(key: StorageKey, orgId?: string | null): number {
  let max = 0;
  for (const row of peekPendingMutations(orgId)) {
    if (row.key === key && row.revision > max) max = row.revision;
  }
  return max;
}

export function clearPendingForKey(key: StorageKey): void {
  const orgId = getOrganizationId();
  if (!orgId) return;
  const store = readStore(orgId);
  store.mutations = store.mutations.filter((row) => row.key !== key);
  writeStore(orgId, store);
}

export function clearPendingForKeyUpTo(key: StorageKey, revision: number): void {
  const orgId = getOrganizationId();
  if (!orgId) return;
  const store = readStore(orgId);
  store.mutations = store.mutations.filter((row) => row.key !== key || row.revision > revision);
  writeStore(orgId, store);
}

/** server persist 성공 시에만 최종 확정. local write 경로에서 호출하지 않는다. */
export function confirmServerCommit(key: StorageKey, revision: number): void {
  clearPendingForKeyUpTo(key, revision);
}

export function setMutationPersistState(
  key: StorageKey,
  persistState: MutationPersistState,
  upToRevision?: number
): void {
  const orgId = getOrganizationId();
  if (!orgId) return;
  const store = readStore(orgId);
  store.mutations = store.mutations.map((row) => {
    if (row.key !== key) return row;
    if (upToRevision != null && row.revision > upToRevision) return row;
    return { ...row, persistState };
  });
  writeStore(orgId, store);
}

export function hasUncommittedMutations(orgId?: string | null): boolean {
  return peekPendingMutations(orgId).some(isUncommittedMutation);
}

function listPendingStoreOrgIds(): string[] {
  const ids = new Set<string>();
  const current = getOrganizationId();
  if (current) ids.add(current);
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) ids.add(key.slice(PREFIX.length));
    }
  } catch {
    /* ignore */
  }
  return [...ids];
}

/** 모든 조직의 미확정 mutation. 빈 store·stale outbox key는 포함하지 않는다. */
export function hasUncommittedMutationsOnDevice(): boolean {
  return listPendingStoreOrgIds().some((orgId) => hasUncommittedMutations(orgId));
}

export type SignOutPrepareStatus = 'ready' | 'blocked';

/** 로그아웃 전 flush. 실패해도 pending을 지우지 않는다. */
export async function prepareBusinessSignOut(options: {
  discardUnsynced?: boolean;
  flush: () => Promise<void>;
}): Promise<SignOutPrepareStatus> {
  if (options.discardUnsynced) return 'ready';
  if (!hasUncommittedMutationsOnDevice()) return 'ready';
  try {
    await options.flush();
  } catch (error) {
    console.error('[storage] sign-out flush failed', error);
  }
  return hasUncommittedMutationsOnDevice() ? 'blocked' : 'ready';
}

export function markPendingConflict(key: StorageKey, entityId?: string): void {
  const orgId = getOrganizationId();
  if (!orgId) return;
  const store = readStore(orgId);
  let touched = false;
  store.mutations = store.mutations.map((row) => {
    if (row.key !== key) return row;
    if (entityId && row.entityId !== entityId) return row;
    touched = true;
    return { ...row, conflict: true };
  });
  if (!touched) {
    appendMutation(store, { key, kind: 'upsert', entityId, conflict: true });
  }
  writeStore(orgId, store);
}

export function hasPendingConflicts(orgId?: string | null): boolean {
  return peekPendingMutations(orgId).some((row) => row.conflict);
}

function dropStalePending(key: StorageKey, entityId: string): void {
  const orgId = getOrganizationId();
  if (!orgId) return;
  const store = readStore(orgId);
  store.mutations = store.mutations.filter(
    (row) => !(row.key === key && row.entityId === entityId)
  );
  writeStore(orgId, store);
}

export function mergeEntityListsById<T extends { id: string }>(params: {
  remote: T[];
  local: T[];
  pendingDeleteIds?: string[];
  /** 지정 시 해당 entity만 local 비교. 생략 시 레거시(교집합 전부 비교) */
  dirtyEntityIds?: string[];
  keyLevelDirty?: boolean;
  pendingByEntityId?: Map<string, PendingMutationRecord>;
}): { merged: T[]; conflictIds: string[]; staleDroppedIds: string[] } {
  const deleted = new Set(params.pendingDeleteIds ?? []);
  const localById = new Map(params.local.map((row) => [row.id, row]));
  const remoteById = new Map(params.remote.map((row) => [row.id, row]));
  const conflictIds: string[] = [];
  const staleDroppedIds: string[] = [];
  const merged: T[] = [];
  const scoped = params.dirtyEntityIds !== undefined || params.keyLevelDirty === true;
  const dirty = new Set(params.dirtyEntityIds ?? []);
  const isDirty = (id: string) => !scoped || params.keyLevelDirty === true || dirty.has(id);

  for (const [id, remoteRow] of remoteById) {
    if (deleted.has(id)) continue;
    const localRow = localById.get(id);
    if (!localRow) {
      merged.push(remoteRow);
      continue;
    }
    if (!isDirty(id)) {
      merged.push(remoteRow);
      localById.delete(id);
      continue;
    }
    const pending = params.pendingByEntityId?.get(id);
    const decision = decideHydrateRow({
      local: localRow,
      remote: remoteRow,
      pending: pending ?? { kind: 'upsert', revision: 1, updatedAt: '' },
    });
    if (decision === 'keep_remote') {
      merged.push(remoteRow);
      if (pending) staleDroppedIds.push(id);
    } else {
      if (decision === 'conflict') conflictIds.push(id);
      merged.push(localRow);
    }
    localById.delete(id);
  }

  for (const [id, localRow] of localById) {
    if (deleted.has(id)) continue;
    if (scoped && !isDirty(id)) continue;
    merged.push(localRow);
  }

  return { merged, conflictIds, staleDroppedIds };
}

/** hydrate 직후 dirty entity merge */
export function applyDirtyListMerge<T extends { id: string }>(
  key: StorageKey,
  remote: T[]
): T[] {
  const pending = peekPendingMutations().filter((row) => row.key === key);
  if (pending.length === 0) return remote;
  const local = readLocal<T[]>(key, []);
  const keyLevelDirty = pending.some((row) => !row.entityId);
  const pendingByEntityId = new Map<string, PendingMutationRecord>();
  for (const row of pending) {
    if (row.entityId) pendingByEntityId.set(row.entityId, row);
  }
  const { merged, conflictIds, staleDroppedIds } = mergeEntityListsById({
    remote,
    local,
    pendingDeleteIds: pendingDeleteIds(key),
    dirtyEntityIds: [...pendingByEntityId.keys()],
    keyLevelDirty,
    pendingByEntityId,
  });
  for (const id of conflictIds) markPendingConflict(key, id);
  for (const id of staleDroppedIds) dropStalePending(key, id);
  return merged;
}
