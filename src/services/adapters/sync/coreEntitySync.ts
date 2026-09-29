/** Core 엔티티 sync — 하위 모듈 re-export (supabaseAdapter 호환) */
export { hydrateCoreEntities } from './coreEntityHydrate';
export { persistCoreEntity } from './coreEntityPersist';
export type { PersistAbortGuard, SyncCache } from './syncTypes';
