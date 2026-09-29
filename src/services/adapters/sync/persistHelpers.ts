import type { StorageKey } from '../storageKeys';
import type { PersistAbortGuard, SyncCache } from './syncTypes';
import { canDiffDeleteSnapshot } from '../persistPolicy';
import { assertHydrateNoErrors, safeDiffIds } from './utils';

export function logHydrateErrors(errors: Record<string, unknown>): void {
  for (const [key, err] of Object.entries(errors)) {
    if (err) console.error(`Failed to load ${key}:`, err);
  }
}

/** hydrate fetch 오류 로그 후 불완전 캐시 기록 금지 */
export function checkHydrateErrors(
  errors: Record<string, unknown>,
  context: string
): void {
  logHydrateErrors(errors);
  assertHydrateNoErrors(errors, context);
}

/** 캐시 키 누락 시 null — diff-delete 금지용 */
export function requireCacheList<T>(
  cache: SyncCache,
  key: StorageKey,
  context: string
): T[] | null {
  if (!cache.has(key)) {
    console.error(`[sync] Refusing ${context} persist: cache key missing`);
    return null;
  }
  return cache.get<T[]>(key) || [];
}

/**
 * row 단위 upsert 루프.
 * 실패해도 나머지 row는 계속 시도하되, 하나라도 실패하면 false.
 * (성공분 롤백 없음 — outbox 재시도로 보완)
 */
export async function runRowUpserts<T>(
  items: T[],
  isAborted: PersistAbortGuard | undefined,
  upsertOne: (item: T) => PromiseLike<{ error: unknown }>,
  logFailure: (error: unknown, item: T) => void
): Promise<boolean> {
  let ok = true;
  for (const item of items) {
    if (isAborted?.()) return false;
    const { error } = await upsertOne(item);
    if (error) {
      ok = false;
      logFailure(error, item);
    }
  }
  return ok;
}

/**
 * upsert 후 ID diff-delete.
 * 캐시 불완전·abort·upsert 부분 실패 시 false (삭제 생략 → outbox 유지).
 */
export async function upsertThenDiffDelete(params: {
  context: string;
  cachePresent: boolean;
  /** false면 stale/부분 목록 — 원격 diff-delete 금지. 생략 시 기존 hydrate persist와 동일 */
  snapshotComplete?: boolean;
  currentIds: string[];
  isAborted?: PersistAbortGuard;
  /** false면 부분/전체 upsert 실패 — 호출부까지 전파 */
  upsertAll: () => Promise<boolean>;
  fetchRemoteIds: () => Promise<{ ids: string[]; error: unknown }>;
  deleteIds: (ids: string[]) => Promise<{ error: unknown }>;
}): Promise<boolean> {
  if (params.isAborted?.()) return false;

  const upsertOk = await params.upsertAll();
  if (!upsertOk) return false;
  if (params.isAborted?.()) return false;

  if (
    !canDiffDeleteSnapshot({
      cachePresent: params.cachePresent,
      snapshotComplete: params.snapshotComplete !== false,
    })
  ) {
    return true;
  }

  const { ids, error } = await params.fetchRemoteIds();
  if (error) {
    console.error(`Failed to fetch ${params.context} for sync:`, error);
    return false;
  }
  if (params.isAborted?.()) return false;

  const toDelete = safeDiffIds(ids, params.currentIds, {
    cachePresent: params.cachePresent,
    context: params.context,
    snapshotComplete: params.snapshotComplete,
  });
  if (toDelete.length === 0) return true;

  const { error: deleteError } = await params.deleteIds(toDelete);
  if (deleteError) {
    console.error(`Failed to delete from ${params.context}:`, deleteError);
    return false;
  }
  return true;
}

/**
 * composite-key upsert 후 keyed delete (wipe-all 금지).
 * key 형식은 호출측 정의 (예: parentId:studentId).
 */
export async function upsertThenDiffDeleteByKeys(params: {
  context: string;
  cachePresent: boolean;
  snapshotComplete?: boolean;
  currentKeys: string[];
  isAborted?: PersistAbortGuard;
  upsertAll: () => Promise<boolean>;
  fetchRemoteKeys: () => Promise<{ keys: string[]; error: unknown }>;
  deleteKey: (key: string) => Promise<{ error: unknown }>;
}): Promise<boolean> {
  if (params.isAborted?.()) return false;

  const upsertOk = await params.upsertAll();
  if (!upsertOk) return false;
  if (params.isAborted?.()) return false;

  if (
    !canDiffDeleteSnapshot({
      cachePresent: params.cachePresent,
      snapshotComplete: params.snapshotComplete !== false,
    })
  ) {
    return true;
  }

  const { keys, error } = await params.fetchRemoteKeys();
  if (error) {
    console.error(`Failed to fetch ${params.context} for sync:`, error);
    return false;
  }
  if (params.isAborted?.()) return false;

  const toDelete = safeDiffIds(keys, params.currentKeys, {
    cachePresent: params.cachePresent,
    context: params.context,
    snapshotComplete: params.snapshotComplete,
  });

  let ok = true;
  for (const key of toDelete) {
    if (params.isAborted?.()) return false;
    const { error: deleteError } = await params.deleteKey(key);
    if (deleteError) {
      ok = false;
      console.error(`Failed to delete ${params.context} key ${key}:`, deleteError);
    }
  }
  return ok;
}
