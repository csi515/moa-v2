import { getStorageAdapter, type StorageKey } from '../adapters';
import type { AcademySettings } from '../../types';

export const DEFAULT_SETTINGS: AcademySettings = {
  name: '',
  address: '',
  phone: '',
  directorName: '',
  defaultTuitionFee: 180000,
  defaultPaymentDay: 25,
  defaultLessonMinutes: 50,
  consultationSlotMinutes: 30,
  features: {
    attendance: {
      enabled: false,
    },
  },
};

export function getItem<T>(key: StorageKey, defaultValue: T): T {
  return getStorageAdapter().getItem(key, defaultValue);
}

export function setItem<T>(key: StorageKey, value: T): void {
  getStorageAdapter().setItem(key, value);
}

export function generateEntityId(_prefix: string): string {
  return crypto.randomUUID();
}

export type UpsertPosition = 'start' | 'end';

/** id 기반 목록 upsert — save* 메서드 공통 패턴 */
export function upsertById<T extends { id: string }>(
  list: T[],
  item: { id?: string } & Partial<T>,
  build: (resolvedId: string | undefined) => T,
  position: UpsertPosition = 'end'
): T {
  if (item.id) {
    const idx = list.findIndex((entry) => entry.id === item.id);
    if (idx >= 0) {
      const saved = { ...list[idx], ...item, id: item.id };
      list[idx] = saved;
      return saved;
    }
    const saved = build(item.id);
    if (position === 'start') list.unshift(saved);
    else list.push(saved);
    return saved;
  }

  const saved = build(undefined);
  if (position === 'start') list.unshift(saved);
  else list.push(saved);
  return saved;
}

export function deleteById<T extends { id: string }>(list: T[], id: string): boolean {
  const next = list.filter((entry) => entry.id !== id);
  if (next.length === list.length) return false;
  list.length = 0;
  list.push(...next);
  return true;
}

/** 순환 참조 없이 도메인 모듈이 StorageService API를 참조 */
export type StorageApi = Record<string, (...args: unknown[]) => unknown>;
