/**
 * offline sync mutation 기록 — identity / revision / conflict 규칙.
 * StorageKey 스냅샷 persist는 유지한다. 이 모듈은 적용 순서를 고정한다.
 */
import type { StorageKey } from './storageKeys';

export type PendingMutationKind = 'upsert' | 'delete';

/** local cache 반영과 server commit은 다른 상태다. committed는 기록 삭제. */
export const MUTATION_PERSIST_STATES = ['local', 'pending', 'syncing', 'failed'] as const;
export type MutationPersistState = (typeof MUTATION_PERSIST_STATES)[number];

export type PendingMutationRecord = {
  /** mutation 자체 id. entity id가 아니다. */
  id: string;
  key: StorageKey;
  kind: PendingMutationKind;
  entityId?: string;
  /** org 단조성. 클수록 최신. 레거시 기록은 hydrate 시 부여 */
  revision: number;
  updatedAt: string;
  conflict?: boolean;
  /** local write 성공. server commit이 아니다. */
  persistState: MutationPersistState;
};

export function normalizePersistState(value: unknown): MutationPersistState {
  return MUTATION_PERSIST_STATES.includes(value as MutationPersistState)
    ? (value as MutationPersistState)
    : 'pending';
}

export function createMutationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mut_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function mutationTargetKey(row: { key: string; entityId?: string }): string {
  return `${row.key}::${row.entityId ?? '*'}`;
}

export function isSameMutationTarget(
  a: { key: string; entityId?: string },
  b: { key: string; entityId?: string }
): boolean {
  return a.key === b.key && (a.entityId ?? '') === (b.entityId ?? '');
}

/** revision 우선, 없으면 updatedAt. a가 더 오래면 음수. */
export function compareMutationOrder(
  a: { revision?: number; updatedAt?: string },
  b: { revision?: number; updatedAt?: string }
): number {
  const ar = a.revision ?? 0;
  const br = b.revision ?? 0;
  if (ar !== br) return ar - br;
  return (a.updatedAt ?? '').localeCompare(b.updatedAt ?? '');
}

export function isStaleMutation(
  candidate: { revision?: number; updatedAt?: string },
  latest: { revision?: number; updatedAt?: string }
): boolean {
  return compareMutationOrder(candidate, latest) < 0;
}

export function rowUpdatedAt(row: unknown): string | undefined {
  if (!row || typeof row !== 'object') return undefined;
  const record = row as Record<string, unknown>;
  if (typeof record.updatedAt === 'string' && record.updatedAt) return record.updatedAt;
  if (typeof record.updated_at === 'string' && record.updated_at) return record.updated_at;
  return undefined;
}

/**
 * hydrate 한 행의 적용 규칙.
 * - pending 없음 → remote
 * - payload 동일 → remote
 * - pending이 remote updatedAt보다 오래됨 → remote (역전 금지)
 * - 그 외 양쪽 변경 → local 유지 + conflict
 */
export type HydrateRowDecision = 'keep_local' | 'keep_remote' | 'conflict';

export function decideHydrateRow(params: {
  local: unknown;
  remote: unknown;
  pending?: Pick<PendingMutationRecord, 'kind' | 'revision' | 'updatedAt'> | null;
}): HydrateRowDecision {
  if (!params.pending) return 'keep_remote';
  if (params.pending.kind === 'delete') return 'keep_remote';
  if (JSON.stringify(params.local) === JSON.stringify(params.remote)) return 'keep_remote';

  const remoteAt = rowUpdatedAt(params.remote);
  // revision은 로컬 큐 순서. remote와는 updatedAt만 비교한다.
  if (remoteAt && (params.pending.updatedAt ?? '') < remoteAt) {
    return 'keep_remote';
  }
  return 'conflict';
}

export type EntityListDiff = {
  upsertIds: string[];
  deleteIds: string[];
};

function asIdList(value: unknown): { id: string; raw: unknown }[] | null {
  if (!Array.isArray(value)) return null;
  const rows: { id: string; raw: unknown }[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const id = (item as { id?: unknown }).id;
    if (typeof id !== 'string' || !id) return null;
    rows.push({ id, raw: item });
  }
  return rows;
}

/** 목록 스냅샷 차이. 배열이 아니면 null → key-level mutation. */
export function diffEntityListSnapshots(previous: unknown, next: unknown): EntityListDiff | null {
  const prevRows = asIdList(previous);
  const nextRows = asIdList(next);
  if (!nextRows) return null;
  const prevById = new Map((prevRows ?? []).map((row) => [row.id, row.raw]));
  const upsertIds: string[] = [];
  const nextIds = new Set<string>();

  for (const row of nextRows) {
    nextIds.add(row.id);
    const before = prevById.get(row.id);
    if (before === undefined || JSON.stringify(before) !== JSON.stringify(row.raw)) {
      upsertIds.push(row.id);
    }
  }

  const deleteIds = [...prevById.keys()].filter((id) => !nextIds.has(id));
  return { upsertIds, deleteIds };
}

export function latestMutationForTarget<
  T extends { key: string; entityId?: string; revision?: number; updatedAt?: string },
>(
  rows: readonly T[],
  target: { key: string; entityId?: string }
): T | undefined {
  let latest: T | undefined;
  for (const row of rows) {
    if (!isSameMutationTarget(row, target)) continue;
    if (!latest || compareMutationOrder(row, latest) >= 0) latest = row;
  }
  return latest;
}
