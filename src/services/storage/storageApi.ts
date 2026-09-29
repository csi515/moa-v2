import { getStorageAdapter } from '../adapters';
import { setIndustryType } from '../adapters/storageContext';
import type { StorageListener } from '../adapters/types';
import type { StorageApi } from './helpers';

/**
 * Hydrate / org / subscribe 인프라.
 * 도메인 facade와 StorageService가 같은 객체를 공유해야
 * factory의 `api.getX()` 교차 호출이 동작한다.
 */
export const storageCore = {
  async hydrate(organizationId: string, industryType?: string | null): Promise<void> {
    setIndustryType(industryType ?? null);
    await getStorageAdapter().hydrate(organizationId, industryType);
  },

  clearOrganization(): void {
    getStorageAdapter().clearOrganization();
  },

  clearBusinessCachesOnSignOut(): void {
    getStorageAdapter().clearBusinessCachesOnSignOut?.();
  },

  isHydrated(): boolean {
    return getStorageAdapter().isHydrated();
  },

  isOfflineHydrated(): boolean {
    return getStorageAdapter().isOfflineHydrated?.() ?? false;
  },

  isHydrating(): boolean {
    return getStorageAdapter().isHydrating();
  },

  async flushSyncOutbox(): Promise<void> {
    await getStorageAdapter().flushSyncOutbox?.();
  },

  hasUnsyncedBusinessChanges(): boolean {
    return getStorageAdapter().hasUncommittedWrites?.() ?? false;
  },

  async prepareSignOut(options?: { discardUnsynced?: boolean }): Promise<'ready' | 'blocked'> {
    const adapter = getStorageAdapter();
    if (adapter.prepareSignOut) return adapter.prepareSignOut(options);
    if (options?.discardUnsynced) return 'ready';
    if (!adapter.hasUncommittedWrites?.()) return 'ready';
    await adapter.flushSyncOutbox?.();
    return adapter.hasUncommittedWrites?.() ? 'blocked' : 'ready';
  },

  subscribe(listener: StorageListener): () => void {
    return getStorageAdapter().subscribe(listener);
  },
};

export const storageApi = storageCore as StorageApi;
