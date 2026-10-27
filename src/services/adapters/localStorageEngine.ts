/**
 * org-scoped localStorage 읽기/쓰기 엔진.
 *
 * 역할 (독립 SoT 아님):
 * - SUPABASE_SYNC_KEYS: remote 데이터의 local mirror / offline snapshot
 * - LOCAL_ONLY_KEYS: device-only UI·온보딩·remote 테이블 없는 데이터
 * - syncOutbox 등 메타 키: writeLocalRaw로 별도 저장
 *
 * 비즈니스 원본은 Supabase(또는 도메인 direct CRUD)이며,
 * 이 모듈은 브라우저 측 캐시·스냅샷 I/O만 담당한다.
 */
import { resolveStorageKey } from './storageContext';
import type { StorageKey } from './storageKeys';

export function readLocal<T>(key: StorageKey, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(resolveStorageKey(key));
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Failed to parse storage item ${key}:`, e);
    return defaultValue;
  }
}

export function writeLocal<T>(key: StorageKey, value: T): void {
  try {
    localStorage.setItem(resolveStorageKey(key), JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to set storage item ${key}:`, e);
  }
}

export function removeLocal(key: StorageKey): void {
  try {
    localStorage.removeItem(resolveStorageKey(key));
  } catch (e) {
    console.error(`Failed to remove storage item ${key}:`, e);
  }
}

export function readLocalRaw(resolvedKey: string): string | null {
  try {
    return localStorage.getItem(resolvedKey);
  } catch {
    return null;
  }
}

export function writeLocalRaw(resolvedKey: string, value: string): void {
  try {
    localStorage.setItem(resolvedKey, value);
  } catch (e) {
    console.error(`Failed to set raw storage item ${resolvedKey}:`, e);
  }
}
