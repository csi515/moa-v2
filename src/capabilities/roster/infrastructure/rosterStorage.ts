import { createCustomerStorage } from '@/services/storage/customerStorage';
import { createStaffClassStorage } from '@/services/storage/staffClassStorage';
import type { StorageApi } from '@/services/storage/helpers';
import { storageApi } from '@/services/storage/storageApi';

/** Roster persistence facade. 기존 customer/staff-class factory를 연결한다. */
export function createRosterCapabilityStorage(api: StorageApi) {
  return {
    ...createCustomerStorage(api),
    ...createStaffClassStorage(),
  };
}

export type RosterCapabilityStorage = ReturnType<typeof createRosterCapabilityStorage>;

/** Roster persist SoT. 신규 코드는 StorageService가 아니라 이 싱글톤을 쓴다. */
export const rosterStorage = createRosterCapabilityStorage(storageApi);
