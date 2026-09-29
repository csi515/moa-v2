import type { StorageKey } from '@/services/adapters/storageKeys';
import type { StorageChangeKey } from '@/services/adapters/types';

/** 순수 매칭 — 테스트·훅 공용 */
export function shouldRefreshForStorageChange(
  changedKey: StorageChangeKey,
  watchKeys: readonly StorageKey[] | undefined
): boolean {
  if (!watchKeys || watchKeys.length === 0) return true;
  if (changedKey === '*') return true;
  return watchKeys.includes(changedKey);
}
