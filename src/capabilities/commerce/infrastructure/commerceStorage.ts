import { createTextbookStorage } from '@/services/storage/textbookStorage';
import type { StorageApi } from '@/services/storage/helpers';
import { storageApi } from '@/services/storage/storageApi';

/** Commerce persistence facade. 기존 textbook/catalog factory를 연결한다. */
export function createCommerceCapabilityStorage(api: StorageApi) {
  return createTextbookStorage(api);
}

export type CommerceCapabilityStorage = ReturnType<typeof createCommerceCapabilityStorage>;

/** Piano 교재 persist SoT. Retail RPC commerce와 합치지 않는다. */
export const commerceStorage = createCommerceCapabilityStorage(storageApi);
