import { useEffect, useState } from 'react';
import { StorageService } from '@/services/storage';
import { STORAGE_KEYS } from '@/services/adapters/storageKeys';
import type { User } from '@/types';

/**
 * ACTIVE_USER 미러. AppContext.currentUser와 동일한 StorageService 구독이다.
 * 새 user store / React Context를 만들지 않는다.
 */
export function useActiveUser(): User {
  const [currentUser, setCurrentUser] = useState<User>(() => StorageService.getActiveUser());

  useEffect(() => {
    return StorageService.subscribe((changedKey) => {
      if (changedKey === '*' || changedKey === STORAGE_KEYS.ACTIVE_USER) {
        setCurrentUser(StorageService.getActiveUser());
      }
    });
  }, []);

  return currentUser;
}
