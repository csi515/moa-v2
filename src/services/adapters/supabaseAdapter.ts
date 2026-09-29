import { clearBusinessCachesOnSignOut as wipeSignedOutBusinessCaches } from './clearBusinessCaches';
import { readLocal, removeLocal, writeLocal } from './localStorageEngine';
import { getOrganizationId, setIndustryType, setOrganizationId } from './storageContext';
import {
  persistRegisteredCapabilities,
  resolveIndustryHydrateCapabilities,
} from './industrySyncRegistry';
import {
  CORE_SYNC_KEYS,
  STORAGE_KEYS,
  SUPABASE_SYNC_KEYS,
  storageKeyLocalWriteConfirms,
  storageKeyPolicy,
  type StorageKey,
} from './storageKeys';
import { hydrateCoreEntities, persistCoreEntity, type SyncCache } from './sync/coreEntitySync';
import {
  clearSyncOutboxKeys,
  enqueueSyncOutbox,
  peekSyncOutbox,
} from './syncOutbox';
import {
  confirmServerCommit,
  hasUncommittedMutationsOnDevice,
  isUncommittedMutation,
  markPendingFromSnapshot,
  maxPendingRevision,
  peekPendingMutations,
  prepareBusinessSignOut,
  setMutationPersistState,
} from './pendingMutations';
import { enqueueSyncOutboxMutation } from './syncOutbox';
import {
  canPersistRemote,
  isPersistEpochCurrent,
  nextPersistEpoch,
} from './persistPolicy';
import type { IStorageAdapter, StorageChangeKey, StorageListener } from './types';

const LOCAL_MISS = Symbol('local-miss');

/**
 * Supabase 하이브리드 어댑터.
 *
 * - 원본(SoT): Supabase (도메인별 direct CRUD 포함)
 * - 메모리 cache: 런타임 읽기
 * - localStorage(writeLocal): remote mirror / offline snapshot — 독립 SoT 아님
 * - syncOutbox: remote persist 재시도 상태 (업무 데이터 아님)
 * - LOCAL_ONLY_KEYS: device-only UI·스키마 없는 데이터 (setItem → writeLocal만)
 *
 * setItem 성공(로컬 미러 기록) ≠ 원격 persist 성공.
 * local write는 pending/outbox에만 남기고, server commit 후에만 확정한다.
 */
export class SupabaseAdapter implements IStorageAdapter {
  readonly backend = 'supabase' as const;

  private listeners = new Set<StorageListener>();
  private cache = new Map<string, unknown>();
  private hydrated = false;
  private hydrating = false;
  /** 네트워크 hydrate 실패 후 localStorage offline snapshot으로 기동 */
  private offlineHydrated = false;
  /** hydrate / clear 시 증가 — in-flight hydrate·persist 무효화 */
  private hydrateGeneration = 0;
  private persistGeneration = 0;
  /** 키별 persist 스냅샷 세대 — writeLocalMirror 시 증가해 in-flight stale persist 중단 */
  private persistEpochs = new Map<string, number>();
  private persistTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private onlineListenerAttached = false;

  getItem<T>(key: StorageKey, defaultValue: T): T {
    if (SUPABASE_SYNC_KEYS.has(key)) {
      if (this.cache.has(key)) {
        return this.cache.get(key) as T;
      }
      // hydrate 완료 전: org 스코프 offline snapshot만 허용 (원격 대체 SoT 아님)
      if (getOrganizationId() && !this.hydrated) {
        if (this.offlineHydrated) {
          return readLocal(key, defaultValue);
        }
        return defaultValue;
      }
    }
    return readLocal(key, defaultValue);
  }

  setItem<T>(key: StorageKey, value: T): void {
    const policy = storageKeyPolicy(key);
    if (policy === 'local-only' || storageKeyLocalWriteConfirms(key) || !SUPABASE_SYNC_KEYS.has(key)) {
      writeLocal(key, value);
      this.notify(key);
      return;
    }
    if (SUPABASE_SYNC_KEYS.has(key)) {
      const previous = this.cache.has(key) ? this.cache.get(key) : undefined;
      this.cache.set(key, value);
      // offline·재시작 대비 즉시 local mirror (원본은 이후 persist / 도메인 CRUD)
      writeLocal(key, value);
      this.persistEpochs.set(key, nextPersistEpoch(this.persistEpochs.get(key)));
      markPendingFromSnapshot(key, previous, value);
      this.enqueueUncommitted(key);
      if (canPersistRemote({ hydrated: this.hydrated, offlineHydrated: this.offlineHydrated })) {
        this.schedulePersist(key);
      }
    }
    this.notify(key);
  }

  /**
   * RPC가 이미 server commit한 뒤 cache/local만 맞춤.
   * schedulePersist / flushPersist / upsertThenDiffDelete 를 타지 않는다.
   */
  writeLocalMirror<T>(key: StorageKey, value: T): void {
    if (SUPABASE_SYNC_KEYS.has(key)) {
      this.cache.set(key, value);
      writeLocal(key, value);
      this.persistEpochs.set(key, nextPersistEpoch(this.persistEpochs.get(key)));
    } else {
      writeLocal(key, value);
    }
    this.notify(key);
  }

  removeItem(key: StorageKey): void {
    if (SUPABASE_SYNC_KEYS.has(key)) {
      const previous = this.cache.has(key) ? this.cache.get(key) : undefined;
      this.cache.delete(key);
      markPendingFromSnapshot(key, previous, []);
      this.enqueueUncommitted(key);
      this.schedulePersist(key);
    } else {
      removeLocal(key);
    }
    this.notify(key);
  }

  hasUncommittedWrites(): boolean {
    return hasUncommittedMutationsOnDevice();
  }

  async prepareSignOut(options?: { discardUnsynced?: boolean }): Promise<'ready' | 'blocked'> {
    return prepareBusinessSignOut({
      discardUnsynced: options?.discardUnsynced,
      flush: () => this.flushSyncOutbox(),
    });
  }

  subscribe(listener: StorageListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async hydrate(organizationId: string, industryType?: string | null): Promise<void> {
    const generation = ++this.hydrateGeneration;
    this.persistGeneration++;
    this.persistEpochs.clear();

    setOrganizationId(organizationId);
    setIndustryType(industryType ?? null);
    this.cache.clear();
    this.persistTimers.forEach((timer) => clearTimeout(timer));
    this.persistTimers.clear();
    this.hydrated = false;
    this.offlineHydrated = false;
    this.hydrating = true;

    const cacheAdapter = this.createLiveCacheAdapter();
    const isStale = () => generation !== this.hydrateGeneration;

    try {
      await hydrateCoreEntities(organizationId, cacheAdapter, industryType);
      if (isStale()) return;

      for (const capability of resolveIndustryHydrateCapabilities(industryType)) {
        await capability.hydrate(organizationId, cacheAdapter);
        if (isStale()) return;
      }

      this.hydrated = true;
      this.offlineHydrated = false;
      this.ensureOnlineFlushListener();
      this.notify('*');
      void this.flushSyncOutbox();
    } catch (error) {
      if (!isStale()) {
        const loaded = this.loadLocalSnapshotIntoCache();
        if (loaded) {
          this.hydrated = true;
          this.offlineHydrated = true;
          this.ensureOnlineFlushListener();
          this.notify('*');
          console.warn(
            '[storage] hydrate failed — using localStorage offline snapshot (not a durable SoT)',
            error
          );
          return;
        }
        this.hydrated = false;
        this.offlineHydrated = false;
        this.cache.clear();
      }
      throw error;
    } finally {
      if (!isStale()) {
        this.hydrating = false;
      }
    }
  }

  clearOrganization(): void {
    // in-flight hydrate/persist 무효화
    this.hydrateGeneration++;
    this.persistGeneration++;
    this.persistEpochs.clear();
    this.cache.clear();
    this.hydrated = false;
    this.offlineHydrated = false;
    this.hydrating = false;
    this.persistTimers.forEach((timer) => clearTimeout(timer));
    this.persistTimers.clear();
    setOrganizationId(null);
    setIndustryType(null);
  }

  clearBusinessCachesOnSignOut(): void {
    wipeSignedOutBusinessCaches();
  }

  isHydrated(): boolean {
    return this.hydrated;
  }

  isOfflineHydrated(): boolean {
    return this.offlineHydrated;
  }

  isHydrating(): boolean {
    return this.hydrating;
  }

  async flushPersist(keys: StorageKey[]): Promise<boolean> {
    let ok = true;
    for (const key of keys) {
      const existing = this.persistTimers.get(key);
      if (existing) {
        clearTimeout(existing);
        this.persistTimers.delete(key);
      }
      const keyOk = await this.persistKey(key);
      if (!keyOk) ok = false;
    }
    return ok;
  }

  /** hydrate용 — live in-memory cache */
  private createLiveCacheAdapter(): SyncCache {
    return {
      get: <T>(key: StorageKey) => this.cache.get(key) as T | undefined,
      set: <T>(key: StorageKey, value: T) => {
        this.cache.set(key, value);
      },
      delete: (key: StorageKey) => {
        this.cache.delete(key);
      },
      has: (key: StorageKey) => this.cache.has(key),
    };
  }

  /**
   * persist용 — schedule 시점 스냅샷.
   * clear/hydrate 후 live cache가 비어도 빈 목록으로 원격 DELETE하지 않도록 함.
   * 다만 generation/org 가드가 1차 방어.
   */
  private createSnapshotCacheAdapter(snapshot: Map<string, unknown>): SyncCache {
    return {
      get: <T>(key: StorageKey) => snapshot.get(key) as T | undefined,
      set: () => {
        /* persist 경로에서 cache 갱신 금지 */
      },
      delete: () => {
        /* no-op */
      },
      has: (key: StorageKey) => snapshot.has(key),
    };
  }

  private schedulePersist(key: StorageKey): void {
    if (!canPersistRemote({ hydrated: this.hydrated, offlineHydrated: this.offlineHydrated })) {
      return;
    }

    const existing = this.persistTimers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.persistTimers.delete(key);
      void this.persistKey(key);
    }, 300);

    this.persistTimers.set(key, timer);
  }

  private isPersistValid(generation: number, orgId: string): boolean {
    return (
      generation === this.persistGeneration &&
      canPersistRemote({ hydrated: this.hydrated, offlineHydrated: this.offlineHydrated }) &&
      getOrganizationId() === orgId
    );
  }

  private async persistKey(key: StorageKey): Promise<boolean> {
    if (!canPersistRemote({ hydrated: this.hydrated, offlineHydrated: this.offlineHydrated })) {
      return false;
    }

    const generation = this.persistGeneration;
    const startedEpoch = this.persistEpochs.get(key) ?? 0;
    const startedRevision = maxPendingRevision(key);
    const orgId = getOrganizationId();
    if (!orgId) return false;

    // 시작 시점 스냅샷 + 가드 (in-flight 중 clear/org 전환·RPC mirror·새 mutation 시 중단)
    const snapshot = new Map(this.cache);
    const cacheAdapter = this.createSnapshotCacheAdapter(snapshot);
    const isAborted = () =>
      !this.isPersistValid(generation, orgId) ||
      !isPersistEpochCurrent(startedEpoch, this.persistEpochs.get(key)) ||
      maxPendingRevision(key) > startedRevision;

    /** org 유지 + RPC mirror로만 abort된 경우 — 최신 cache로 재시도 */
    const enqueueIfStillCurrentOrg = () => {
      if (this.isPersistValid(generation, orgId)) {
        this.enqueueUncommitted(key);
      }
    };

    if (isAborted()) {
      enqueueIfStillCurrentOrg();
      return false;
    }

    setMutationPersistState(key, 'syncing', startedRevision);

    try {
      let ok = true;

      if (CORE_SYNC_KEYS.has(key)) {
        ok = (await persistCoreEntity(key, orgId, cacheAdapter, isAborted)) && ok;
        if (isAborted()) {
          enqueueIfStillCurrentOrg();
          return false;
        }
      }

      ok = (await persistRegisteredCapabilities(key, orgId, cacheAdapter, isAborted)) && ok;
      if (isAborted()) {
        enqueueIfStillCurrentOrg();
        return false;
      }

      // PIANO_TEXTBOOK_COMMERCE_HYDRATE_KEYS: adapter persist 대상 아님(DB direct CRUD)

      if (!ok) {
        this.rememberPersistFailure(key, startedRevision);
        return false;
      }

      confirmServerCommit(key, startedRevision);
      clearSyncOutboxKeys([key], startedRevision);
      return true;
    } catch (error) {
      console.error(`[storage] persist failed for ${key}`, error);
      this.rememberPersistFailure(key, startedRevision);
      return false;
    }
  }

  private enqueueUncommitted(key: StorageKey): void {
    this.enqueuePendingMutations(key);
    enqueueSyncOutbox(key);
    setMutationPersistState(key, 'pending');
  }

  private rememberPersistFailure(key: StorageKey, startedRevision: number): void {
    this.enqueuePendingMutations(key);
    enqueueSyncOutbox(key);
    setMutationPersistState(key, 'failed', startedRevision);
  }

  private enqueuePendingMutations(key: StorageKey): void {
    for (const row of peekPendingMutations()) {
      if (row.key !== key) continue;
      enqueueSyncOutboxMutation({
        id: row.id,
        key: row.key,
        kind: row.kind,
        entityId: row.entityId,
        revision: row.revision,
        enqueuedAt: row.updatedAt,
      });
    }
  }

  /** localStorage offline snapshot → 메모리 cache (원격 hydrate 실패 시 기동용) */
  private loadLocalSnapshotIntoCache(): boolean {
    let loaded = 0;
    for (const key of SUPABASE_SYNC_KEYS) {
      const value = readLocal<unknown | typeof LOCAL_MISS>(key, LOCAL_MISS);
      if (value !== LOCAL_MISS) {
        this.cache.set(key, value);
        loaded++;
      }
    }
    return (
      this.cache.has(STORAGE_KEYS.STUDENTS) ||
      this.cache.has(STORAGE_KEYS.SETTINGS) ||
      loaded >= 3
    );
  }

  private ensureOnlineFlushListener(): void {
    if (this.onlineListenerAttached || typeof window === 'undefined') return;
    this.onlineListenerAttached = true;
    const flush = () => {
      void this.flushSyncOutbox();
    };
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') flush();
    });
  }

  /** outbox + 미확정 pending key만 재 persist — 업무 엔티티 저장소가 아님 */
  async flushSyncOutbox(): Promise<void> {
    if (
      !canPersistRemote({ hydrated: this.hydrated, offlineHydrated: this.offlineHydrated }) ||
      (typeof navigator !== 'undefined' && navigator.onLine === false)
    ) {
      return;
    }
    const keys = new Set(peekSyncOutbox());
    for (const row of peekPendingMutations()) {
      if (isUncommittedMutation(row)) keys.add(row.key);
    }
    if (keys.size === 0) return;
    const list = [...keys];
    const ok = await this.flushPersist(list);
    if (ok) clearSyncOutboxKeys(list);
  }

  private notify(changedKey: StorageChangeKey): void {
    this.listeners.forEach((listener) => {
      try {
        listener(changedKey);
      } catch (e) {
        console.error('Storage listener error:', e);
      }
    });
  }
}
