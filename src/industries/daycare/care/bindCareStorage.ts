import { StorageService } from '@/services/storage';
import { careStorage } from './careStorage';

let bound = false;

/**
 * Daycare 전용 care storage를 StorageService에 연결한다.
 * services/storage.ts가 Industry를 import하지 않도록 composition/plugin에서 호출한다.
 * cache/hydration/sync 의미는 기존 Object.assign 슬라이스와 동일하다.
 */
export function bindDaycareCareStorage(): void {
  if (bound) return;
  bound = true;
  Object.assign(StorageService, careStorage);
}

bindDaycareCareStorage();
