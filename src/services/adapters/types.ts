import type { AcademySettings, Teacher } from '../../types';
import type { StorageKey } from './storageKeys';

/**
 * 저장소 변경 리스너.
 * - StorageKey: 해당 키만 변경
 * - '*': hydrate / 전체 무효화 (모든 구독자 갱신)
 */
export type StorageChangeKey = StorageKey | '*';
export type StorageListener = (changedKey: StorageChangeKey) => void;

/**
 * 저장소 어댑터 인터페이스.
 * backend는 Supabase; localStorage는 mirror/cache·device-only·outbox용 (독립 SoT 아님).
 * sync API 유지, hydrate만 async.
 */
export interface IStorageAdapter {
  readonly backend: 'supabase';

  getItem<T>(key: StorageKey, defaultValue: T): T;
  setItem<T>(key: StorageKey, value: T): void;
  removeItem(key: StorageKey): void;

  subscribe(listener: StorageListener): () => void;

  /** org 선택 시 원격 → 메모리 cache (+ local mirror 갱신 경로는 구현체) */
  hydrate(organizationId: string, industryType?: string | null): Promise<void>;

  /** org 전환/로그아웃 시 메모리 캐시 초기화. localStorage 업무 스냅샷은 유지 */
  clearOrganization(): void;

  /** 명시적 로그아웃 — 모든 조직 업무 cache + pending + outbox 삭제 */
  clearBusinessCachesOnSignOut?(): void;

  isHydrated(): boolean;
  isHydrating(): boolean;
  /** 원격 hydrate 실패 후 localStorage offline snapshot으로 기동 중 */
  isOfflineHydrated?(): boolean;

  /** 지정 키의 debounce persist를 즉시 실행. false면 원격 반영 실패(또는 abort) → outbox */
  flushPersist?(keys: StorageKey[]): Promise<boolean>;

  /** org 스코프 outbox pending key 재 persist */
  flushSyncOutbox?(): Promise<void>;

  /** local write만 있고 server commit이 끝나지 않은 mutation이 있는지 */
  hasUncommittedWrites?(): boolean;

  /** 로그아웃 전 flush. blocked면 pending을 지우지 말고 로그아웃을 중단한다. */
  prepareSignOut?(options?: { discardUnsynced?: boolean }): Promise<'ready' | 'blocked'>;

  /**
   * cache + localStorage만 갱신. persist / diff-delete를 예약하지 않음.
   * RPC 후 해당 row mirror 전용 — 전체 snapshot sync 경로가 아님.
   */
  writeLocalMirror?<T>(key: StorageKey, value: T): void;
}

/** Supabase staff ↔ Teacher 매핑용 metadata */
export interface StaffMetadata {
  hireDate?: string;
  specialty?: string;
  salary?: number;
  hourlyRate?: number;
  payType?: 'hourly' | 'attendance' | 'work_hours' | 'monthly' | 'none';
  color?: string;
  memo?: string;
  classIds?: string[];
  grants?: import('@/core/staff/staffGrants').StaffGrants;
}

/** organizations.settings JSONB에 저장되는 학원 설정 */
export type OrganizationSettingsPayload = AcademySettings;

export type { Teacher };
