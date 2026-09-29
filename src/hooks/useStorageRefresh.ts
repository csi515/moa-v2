import { useEffect, useRef, useState } from 'react';
import { StorageService } from '@/services/storage';
import { STORAGE_KEYS, type StorageKey } from '@/services/adapters/storageKeys';
import { shouldRefreshForStorageChange } from './storageRefreshMatch';

export { shouldRefreshForStorageChange } from './storageRefreshMatch';

/** 자주 쓰는 domain 키 묶음 — 화면별 구독 범위를 좁힐 때 사용 */
export const STORAGE_REFRESH_DOMAINS = {
  students: [
    STORAGE_KEYS.STUDENTS,
    STORAGE_KEYS.PARENTS,
    STORAGE_KEYS.PARENT_STUDENT_LINKS,
  ],
  bookings: [STORAGE_KEYS.SCHEDULES, STORAGE_KEYS.SESSION_PASSES, STORAGE_KEYS.STUDENTS],
  sessionPasses: [STORAGE_KEYS.SESSION_PASSES, STORAGE_KEYS.STUDENTS],
  classes: [STORAGE_KEYS.CLASSES, STORAGE_KEYS.TEACHERS, STORAGE_KEYS.STUDENTS],
  attendance: [
    STORAGE_KEYS.ATTENDANCE,
    STORAGE_KEYS.ATTENDANCE_SESSIONS,
    STORAGE_KEYS.STUDENTS,
    STORAGE_KEYS.CLASSES,
  ],
  lessons: [
    STORAGE_KEYS.LESSON_RECORDS,
    STORAGE_KEYS.STUDENTS,
    STORAGE_KEYS.TEACHERS,
    STORAGE_KEYS.CLASSES,
  ],
  finance: [
    STORAGE_KEYS.INVOICES,
    STORAGE_KEYS.TUITION_PAYMENTS,
    STORAGE_KEYS.EXPENSES,
    STORAGE_KEYS.INCOME_ENTRIES,
    STORAGE_KEYS.TEACHER_PAYROLL_SETTLEMENTS,
  ],
  settings: [STORAGE_KEYS.SETTINGS, STORAGE_KEYS.TEACHERS],
  textbooks: [
    STORAGE_KEYS.TEXTBOOKS,
    STORAGE_KEYS.TEXTBOOK_SALES,
    STORAGE_KEYS.TEXTBOOK_PAYMENTS,
    STORAGE_KEYS.TEXTBOOK_INVENTORY_TRANSACTIONS,
    STORAGE_KEYS.STUDENTS,
  ],
} as const satisfies Record<string, readonly StorageKey[]>;

export type StorageRefreshDomain = keyof typeof STORAGE_REFRESH_DOMAINS;

export type UseStorageRefreshOptions =
  | readonly StorageKey[]
  | StorageKey
  | StorageRefreshDomain
  | undefined;

function resolveWatchKeys(options: UseStorageRefreshOptions): readonly StorageKey[] | undefined {
  if (options == null) return undefined;
  if (typeof options === 'string') {
    if (options in STORAGE_REFRESH_DOMAINS) {
      return STORAGE_REFRESH_DOMAINS[options as StorageRefreshDomain];
    }
    return [options as StorageKey];
  }
  return options;
}

/**
 * StorageService 변경 시 화면 갱신.
 * watchKeys/domain을 주면 해당 키(또는 hydrate '*')만 반영 — 타 domain 변경으로 재렌더하지 않음.
 * 인자 없으면 기존처럼 모든 변경에 반응(레거시).
 */
export function useStorageRefresh(watch?: UseStorageRefreshOptions): number {
  const [refreshKey, setRefreshKey] = useState(0);
  const watchRef = useRef(resolveWatchKeys(watch));
  watchRef.current = resolveWatchKeys(watch);

  useEffect(() => {
    return StorageService.subscribe((changedKey) => {
      if (shouldRefreshForStorageChange(changedKey, watchRef.current)) {
        setRefreshKey((k) => k + 1);
      }
    });
  }, []);

  return refreshKey;
}
