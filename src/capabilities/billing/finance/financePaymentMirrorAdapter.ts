import { getStorageAdapter, type StorageKey } from '@/services/adapters';
import type { FinanceMirrorPort } from './financePaymentMirror';

/** 기존 adapter.writeLocalMirror에 묶는다. persist/outbox 경로를 타지 않는다. */
export function createAdapterFinanceMirrorPort(): FinanceMirrorPort {
  return {
    readList<T>(key: string): T[] {
      return getStorageAdapter().getItem<T[]>(key as StorageKey, []);
    },
    writeList<T>(key: string, value: T[]): void {
      const adapter = getStorageAdapter();
      if (!adapter.writeLocalMirror) {
        throw new Error('local mirror writer unavailable');
      }
      adapter.writeLocalMirror(key as StorageKey, value);
    },
  };
}
