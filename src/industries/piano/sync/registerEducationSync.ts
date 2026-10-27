import { registerIndustrySyncCapability } from '@/services/adapters/industrySyncRegistry';
import { PIANO_SYNC_KEYS } from '@/services/adapters/storageKeys';
import {
  hydrateEducationEntities,
  persistEducationEntity,
} from '@/services/adapters/sync/educationEntitySync';

/** piano plugin이 소유하는 education hydrate/persist. 새 core/capability로 승격하지 않는다. */
registerIndustrySyncCapability({
  id: 'education',
  hydrate: hydrateEducationEntities,
  persist: persistEducationEntity,
  persistKeys: PIANO_SYNC_KEYS,
});
