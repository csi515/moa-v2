import type { CareJournal, MedicationRequest } from '@/industries/daycare/care/types';
import { getCoreClient } from '@/lib/supabase';
import { writeLocal } from '../localStorageEngine';
import { DAYCARE_SYNC_KEYS, STORAGE_KEYS, type StorageKey } from '../storageKeys';
import type { PersistAbortGuard, SyncCache } from './syncTypes';
import {
  careJournalToRow,
  medicationRequestToRow,
  rowToCareJournal,
  rowToMedicationRequest,
} from './daycareEntityMappers';
import {
  checkHydrateErrors,
  requireCacheList,
  runRowUpserts,
  upsertThenDiffDelete,
} from './persistHelpers';
import { hydrateDaycareOpsEntities, persistDaycareOpsEntity } from './daycareOpsSync';

/** 어린이집 알림장·투약 hydrate */
export async function hydrateDaycareEntities(
  organizationId: string,
  cache: SyncCache
): Promise<void> {
  const client = getCoreClient();

  const [journalsResult, medicationsResult] = await Promise.all([
    client.from('care_journals').select('*').eq('organization_id', organizationId),
    client.from('medication_requests').select('*').eq('organization_id', organizationId),
  ]);

  checkHydrateErrors(
    {
      careJournals: journalsResult.error,
      medicationRequests: medicationsResult.error,
    },
    'daycare'
  );

  const entities: [StorageKey, unknown][] = [
    [STORAGE_KEYS.CARE_JOURNALS, (journalsResult.data || []).map(rowToCareJournal)],
    [STORAGE_KEYS.MEDICATION_REQUESTS, (medicationsResult.data || []).map(rowToMedicationRequest)],
  ];

  for (const [key, value] of entities) {
    cache.set(key, value);
    writeLocal(key, value);
  }

  await hydrateDaycareOpsEntities(organizationId, cache);
}

/** 어린이집 알림장·투약 persist — false면 soft-fail(outbox 유지) */
export async function persistDaycareEntity(
  key: StorageKey,
  organizationId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard = () => false
): Promise<boolean> {
  if (!DAYCARE_SYNC_KEYS.has(key)) return true;
  if (isAborted()) return false;

  const ops = await persistDaycareOpsEntity(key, organizationId, cache, isAborted);
  if (ops !== null) return ops;

  switch (key) {
    case STORAGE_KEYS.CARE_JOURNALS:
      return persistDaycareTable(
        'care_journals',
        organizationId,
        cache,
        STORAGE_KEYS.CARE_JOURNALS,
        (items) => (items as CareJournal[]).map((j) => careJournalToRow(j, organizationId)),
        isAborted
      );
    case STORAGE_KEYS.MEDICATION_REQUESTS:
      return persistDaycareTable(
        'medication_requests',
        organizationId,
        cache,
        STORAGE_KEYS.MEDICATION_REQUESTS,
        (items) =>
          (items as MedicationRequest[]).map((r) => medicationRequestToRow(r, organizationId)),
        isAborted
      );
    default:
      return true;
  }
}

async function persistDaycareTable<T extends { id: string }>(
  table: 'care_journals' | 'medication_requests',
  orgId: string,
  cache: SyncCache,
  storageKey: StorageKey,
  toRows: (items: unknown[]) => T[],
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  const items = requireCacheList<unknown>(cache, storageKey, `daycare.${table}`);
  if (!items) return false;

  const client = getCoreClient();
  const rows = toRows(items);

  const ok = await upsertThenDiffDelete({
    context: `daycare.${table}`,
    cachePresent: true,
    currentIds: rows.map((r) => r.id),
    isAborted,
    upsertAll: () =>
      runRowUpserts(
        rows,
        isAborted,
        (row) => client.from(table).upsert(row as never),
        (error) => console.error(`Failed to upsert core.${table}:`, error)
      ),
    fetchRemoteIds: async () => {
      const { data: existing, error } = await client
        .from(table)
        .select('id')
        .eq('organization_id', orgId);
      return { ids: (existing || []).map((r) => r.id), error };
    },
    deleteIds: async (ids) => {
      const { error } = await client.from(table).delete().in('id', ids);
      return { error };
    },
  });

  if (isAborted()) return false;
  writeLocal(storageKey, items);
  return ok;
}
