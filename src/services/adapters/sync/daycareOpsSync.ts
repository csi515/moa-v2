/**
 * Daycare 운영 7종 hydrate/persist.
 * 로컬 기존 행은 remote에 없을 때만 병합해 유실하지 않는다.
 */
import { getCoreClient } from '@/lib/supabase';
import { readLocal, writeLocal } from '../localStorageEngine';
import { applyDirtyListMerge } from '../pendingMutations';
import { STORAGE_KEYS, type StorageKey } from '../storageKeys';
import type { PersistAbortGuard, SyncCache } from './syncTypes';
import { checkHydrateErrors, requireCacheList, runRowUpserts, upsertThenDiffDelete } from './persistHelpers';
import {
  careIncidentToRow,
  cctvRequestToRow,
  childLegalRecordToRow,
  mealSampleToRow,
  pickupLogToRow,
  rowToCareIncident,
  rowToCctvRequest,
  rowToChildLegalRecord,
  rowToMealSample,
  rowToPickupLog,
  rowToSafetyLog,
  rowToStaffHealthCert,
  safetyLogToRow,
  staffHealthCertToRow,
} from './daycareOpsMappers';

export const DAYCARE_OPS_KEYS: readonly StorageKey[] = [
  STORAGE_KEYS.CARE_CHILD_RECORDS,
  STORAGE_KEYS.CARE_INCIDENTS,
  STORAGE_KEYS.CARE_STAFF_HEALTH_CERTS,
  STORAGE_KEYS.CARE_SAFETY_LOGS,
  STORAGE_KEYS.CARE_MEAL_SAMPLES,
  STORAGE_KEYS.CARE_CCTV_REQUESTS,
  STORAGE_KEYS.CARE_PICKUP_LOGS,
];

function mergeLocalExtras<T extends { id: string }>(
  key: StorageKey,
  remote: T[],
  naturalKey?: (row: T) => string
): T[] {
  const local = readLocal<T[]>(key, []);
  const remoteIds = new Set(remote.map((row) => row.id));
  const remoteKeys = new Set(naturalKey ? remote.map(naturalKey) : []);
  const extras = local.filter((row) => {
    if (remoteIds.has(row.id)) return false;
    if (naturalKey && remoteKeys.has(naturalKey(row))) return false;
    return true;
  });
  return applyDirtyListMerge(key, [...remote, ...extras]);
}

export async function hydrateDaycareOpsEntities(
  organizationId: string,
  cache: SyncCache
): Promise<void> {
  const client = getCoreClient();
  const [
    childRecords,
    incidents,
    healthCerts,
    safetyLogs,
    mealSamples,
    cctvRequests,
    pickupLogs,
  ] = await Promise.all([
    client.from('care_child_records').select('*').eq('organization_id', organizationId),
    client.from('care_incidents').select('*').eq('organization_id', organizationId),
    client.from('care_staff_health_certs').select('*').eq('organization_id', organizationId),
    client.from('care_safety_logs').select('*').eq('organization_id', organizationId),
    client.from('care_meal_samples').select('*').eq('organization_id', organizationId),
    client.from('care_cctv_requests').select('*').eq('organization_id', organizationId),
    client.from('care_pickup_logs').select('*').eq('organization_id', organizationId),
  ]);

  const missingOk = (error: unknown) => {
    const message = error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: string }).message)
      : '';
    const code = error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code)
      : '';
    return code === '42P01' || /does not exist/i.test(message);
  };

  checkHydrateErrors(
    {
      careChildRecords: missingOk(childRecords.error) ? null : childRecords.error,
      careIncidents: missingOk(incidents.error) ? null : incidents.error,
      careStaffHealthCerts: missingOk(healthCerts.error) ? null : healthCerts.error,
      careSafetyLogs: missingOk(safetyLogs.error) ? null : safetyLogs.error,
      careMealSamples: missingOk(mealSamples.error) ? null : mealSamples.error,
      careCctvRequests: missingOk(cctvRequests.error) ? null : cctvRequests.error,
      carePickupLogs: missingOk(pickupLogs.error) ? null : pickupLogs.error,
    },
    'daycare-ops'
  );

  const entities: [StorageKey, unknown][] = [
    [
      STORAGE_KEYS.CARE_CHILD_RECORDS,
      mergeLocalExtras(
        STORAGE_KEYS.CARE_CHILD_RECORDS,
        (childRecords.data || []).map(rowToChildLegalRecord),
        (row) => row.studentId
      ),
    ],
    [
      STORAGE_KEYS.CARE_INCIDENTS,
      mergeLocalExtras(STORAGE_KEYS.CARE_INCIDENTS, (incidents.data || []).map(rowToCareIncident)),
    ],
    [
      STORAGE_KEYS.CARE_STAFF_HEALTH_CERTS,
      mergeLocalExtras(
        STORAGE_KEYS.CARE_STAFF_HEALTH_CERTS,
        (healthCerts.data || []).map(rowToStaffHealthCert),
        (row) => row.teacherId
      ),
    ],
    [
      STORAGE_KEYS.CARE_SAFETY_LOGS,
      mergeLocalExtras(STORAGE_KEYS.CARE_SAFETY_LOGS, (safetyLogs.data || []).map(rowToSafetyLog)),
    ],
    [
      STORAGE_KEYS.CARE_MEAL_SAMPLES,
      mergeLocalExtras(STORAGE_KEYS.CARE_MEAL_SAMPLES, (mealSamples.data || []).map(rowToMealSample)),
    ],
    [
      STORAGE_KEYS.CARE_CCTV_REQUESTS,
      mergeLocalExtras(STORAGE_KEYS.CARE_CCTV_REQUESTS, (cctvRequests.data || []).map(rowToCctvRequest)),
    ],
    [
      STORAGE_KEYS.CARE_PICKUP_LOGS,
      mergeLocalExtras(
        STORAGE_KEYS.CARE_PICKUP_LOGS,
        (pickupLogs.data || []).map(rowToPickupLog),
        (row) => `${row.studentId}:${row.pickupDate}`
      ),
    ],
  ];

  for (const [key, value] of entities) {
    cache.set(key, value);
    writeLocal(key, value);
  }
}

type OpsTable =
  | 'care_child_records'
  | 'care_incidents'
  | 'care_staff_health_certs'
  | 'care_safety_logs'
  | 'care_meal_samples'
  | 'care_cctv_requests'
  | 'care_pickup_logs';

async function persistOpsTable(
  table: OpsTable,
  orgId: string,
  cache: SyncCache,
  storageKey: StorageKey,
  toRows: (items: unknown[]) => { id: string }[],
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
    currentIds: rows.map((row) => row.id),
    isAborted,
    upsertAll: () =>
      runRowUpserts(
        rows,
        isAborted,
        (row) => client.from(table).upsert(row as never),
        (error) => console.error(`Failed to upsert core.${table}:`, error)
      ),
    fetchRemoteIds: async () => {
      const { data, error } = await client.from(table).select('id').eq('organization_id', orgId);
      return { ids: (data || []).map((row) => row.id), error };
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

/** 운영 키면 boolean, 아니면 null */
export async function persistDaycareOpsEntity(
  key: StorageKey,
  organizationId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean | null> {
  switch (key) {
    case STORAGE_KEYS.CARE_CHILD_RECORDS:
      return persistOpsTable(
        'care_child_records',
        organizationId,
        cache,
        key,
        (items) => items.map((item) => childLegalRecordToRow(item as never, organizationId)),
        isAborted
      );
    case STORAGE_KEYS.CARE_INCIDENTS:
      return persistOpsTable(
        'care_incidents',
        organizationId,
        cache,
        key,
        (items) => items.map((item) => careIncidentToRow(item as never, organizationId)),
        isAborted
      );
    case STORAGE_KEYS.CARE_STAFF_HEALTH_CERTS:
      return persistOpsTable(
        'care_staff_health_certs',
        organizationId,
        cache,
        key,
        (items) => items.map((item) => staffHealthCertToRow(item as never, organizationId)),
        isAborted
      );
    case STORAGE_KEYS.CARE_SAFETY_LOGS:
      return persistOpsTable(
        'care_safety_logs',
        organizationId,
        cache,
        key,
        (items) => items.map((item) => safetyLogToRow(item as never, organizationId)),
        isAborted
      );
    case STORAGE_KEYS.CARE_MEAL_SAMPLES:
      return persistOpsTable(
        'care_meal_samples',
        organizationId,
        cache,
        key,
        (items) => items.map((item) => mealSampleToRow(item as never, organizationId)),
        isAborted
      );
    case STORAGE_KEYS.CARE_CCTV_REQUESTS:
      return persistOpsTable(
        'care_cctv_requests',
        organizationId,
        cache,
        key,
        (items) => items.map((item) => cctvRequestToRow(item as never, organizationId)),
        isAborted
      );
    case STORAGE_KEYS.CARE_PICKUP_LOGS:
      return persistOpsTable(
        'care_pickup_logs',
        organizationId,
        cache,
        key,
        (items) => items.map((item) => pickupLogToRow(item as never, organizationId)),
        isAborted
      );
    default:
      return null;
  }
}
