import { registerIndustrySyncCapability } from '@/services/adapters/industrySyncRegistry';
import { DAYCARE_SYNC_KEYS } from '@/services/adapters/storageKeys';
import {
  hydrateDaycareEntities,
  persistDaycareEntity,
} from '@/services/adapters/sync/daycareEntitySync';

registerIndustrySyncCapability({
  id: 'daycare',
  hydrate: hydrateDaycareEntities,
  persist: persistDaycareEntity,
  persistKeys: DAYCARE_SYNC_KEYS,
});
