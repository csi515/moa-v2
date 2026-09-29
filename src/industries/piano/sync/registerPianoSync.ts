import { registerIndustrySyncCapability } from '@/services/adapters/industrySyncRegistry';
import { PIANO_SYNC_KEYS } from '@/services/adapters/storageKeys';
import { hydratePianoEntities, persistPianoEntity } from '@/services/adapters/sync/pianoEntitySync';

registerIndustrySyncCapability({
  id: 'piano',
  hydrate: hydratePianoEntities,
  persist: persistPianoEntity,
  persistKeys: PIANO_SYNC_KEYS,
});
