import { createPracticeRoomBookingStorage } from '@/services/storage/practiceRoomBookingStorage';
import type { StorageApi } from '@/services/storage/helpers';
import { storageApi } from '@/services/storage/storageApi';

/** Resources persistence facade. 기존 practice-room factory를 연결한다. */
export function createResourcesCapabilityStorage(api: StorageApi) {
  return createPracticeRoomBookingStorage(api);
}

export type ResourcesCapabilityStorage = ReturnType<typeof createResourcesCapabilityStorage>;

/** @deprecated 로컬 연습실 읽기 폴백. 신규 쓰기는 reservation service. */
export const resourcesStorage = createResourcesCapabilityStorage(storageApi);
