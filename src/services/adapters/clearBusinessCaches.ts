/**
 * 로그아웃 시 조직 업무 local cache / offline queue 삭제.
 * DB·membership·device-only 상태(PWA/온보딩/기기 UI)는 건드리지 않는다.
 */
import { isBusinessCacheKey } from './storageKeys';

function listLocalStorageKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
  } catch {
    return keys;
  }
  return keys;
}

/** 모든 조직의 업무 스냅샷 + pending mutation + sync outbox */
export function clearBusinessCachesOnSignOut(): void {
  for (const key of listLocalStorageKeys()) {
    if (!isBusinessCacheKey(key)) continue;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove business cache ${key}:`, error);
    }
  }
}
