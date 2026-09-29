import { SupabaseAdapter } from './supabaseAdapter';
import type { IStorageAdapter } from './types';

export { STORAGE_KEYS, SUPABASE_SYNC_KEYS } from './storageKeys';
export type { StorageKey } from './storageKeys';
export {
  getOrganizationId,
  setOrganizationId,
  resolveStorageKey,
} from './storageContext';
export type { IStorageAdapter, StorageListener, StorageChangeKey } from './types';

let adapterInstance: IStorageAdapter | null = null;

/** Supabase 저장소 어댑터 싱글톤 */
export function getStorageAdapter(): IStorageAdapter {
  if (!adapterInstance) {
    adapterInstance = new SupabaseAdapter();
  }
  return adapterInstance;
}

/** 테스트/재초기화용 */
export function resetStorageAdapter(): void {
  adapterInstance = null;
}
