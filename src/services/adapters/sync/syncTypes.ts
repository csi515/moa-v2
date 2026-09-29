import type { StorageKey } from '../storageKeys';

/** hydrate/persist가 공유하는 인메모리 캐시 어댑터 */
export interface SyncCache {
  get<T>(key: StorageKey): T | undefined;
  set<T>(key: StorageKey, value: T): void;
  delete(key: StorageKey): void;
  /** 키 존재 여부 — missing vs empty [] 구분 (diff-delete 가드) */
  has(key: StorageKey): boolean;
}

/** in-flight persist 무효화 가드 */
export type PersistAbortGuard = () => boolean;
