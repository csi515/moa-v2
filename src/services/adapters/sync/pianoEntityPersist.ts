import { peekPendingMutations, pendingDeleteIds } from '../pendingMutations';
import type {
  Student,
  TextbookPayment,
} from '../../../types';
import { getPianoClient } from '../../../lib/supabase/pianoClient';
import { writeLocal } from '../localStorageEngine';
import { STORAGE_KEYS, type StorageKey } from '../storageKeys';
import type { PersistAbortGuard, SyncCache } from './syncTypes';
import {
  paymentToPianoRow,
  studentToPianoCustomerRow,
} from './pianoEntityMappers';
import {
  requireCacheList,
  runRowUpserts,
  upsertThenDiffDelete,
  upsertThenDiffDeleteByKeys,
} from './persistHelpers';

function classMemberKey(serviceId: string, customerId: string): string {
  return `${serviceId}:${customerId}`;
}

export async function persistPianoCustomers(
  orgId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  const students = requireCacheList<Student>(cache, STORAGE_KEYS.STUDENTS, 'piano.customers');
  if (!students) return false;

  const client = getPianoClient();

  const customersOk = await upsertThenDiffDelete({
    context: 'piano.customers',
    cachePresent: true,
    currentIds: students.map((s) => s.id),
    isAborted,
    upsertAll: () =>
      runRowUpserts(
        students,
        isAborted,
        (student) => client.from('customers').upsert(studentToPianoCustomerRow(student, orgId)),
        (error) => console.error('Failed to upsert piano customer:', error)
      ),
    tombstoneIds: pendingDeleteIds(STORAGE_KEYS.STUDENTS, orgId),
    deleteIds: async (ids) => {
      const { error } = await client.from('customers').delete().eq('organization_id', orgId).in('customer_id', ids);
      return { error };
    },
  });
  if (!customersOk || isAborted()) return false;

  const memberRows = students.flatMap((s) =>
    (s.classIds || []).map((classId) => ({
      organization_id: orgId,
      service_id: classId,
      customer_id: s.id,
    }))
  );
  const currentMemberKeys = memberRows.map((r) => classMemberKey(r.service_id, r.customer_id));

  // 이 기기에서 명시적으로 편집/삭제한 학생의 반 배정만 삭제 후보 — 부재만으로 삭제 추론 금지
  const editedStudentIds = new Set(
    peekPendingMutations(orgId)
      .filter((row) => row.key === STORAGE_KEYS.STUDENTS && row.entityId)
      .map((row) => row.entityId as string)
  );

  const membersOk = await upsertThenDiffDeleteByKeys({
    context: 'piano.class_members',
    cachePresent: true,
    currentKeys: currentMemberKeys,
    isExplicitDelete: (key) => editedStudentIds.has(key.split(':')[1] ?? ''),
    isAborted,
    upsertAll: () =>
      runRowUpserts(
        memberRows,
        isAborted,
        (row) =>
          client.from('class_members').upsert(row, {
            onConflict: 'service_id,customer_id',
          }),
        (error) => console.error('Failed to upsert class member:', error)
      ),
    fetchRemoteKeys: async () => {
      const { data: existingMembers, error } = await client
        .from('class_members')
        .select('service_id, customer_id')
        .eq('organization_id', orgId);
      return {
        keys: (existingMembers || []).map((r) => classMemberKey(r.service_id, r.customer_id)),
        error,
      };
    },
    deleteKey: async (key) => {
      const [serviceId, customerId] = key.split(':');
      if (!serviceId || !customerId) return { error: null };
      const { error } = await client
        .from('class_members')
        .delete()
        .eq('organization_id', orgId)
        .eq('service_id', serviceId)
        .eq('customer_id', customerId);
      return { error };
    },
  });

  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.STUDENTS, students);
  return membersOk;
}

export async function persistPianoPayments(
  orgId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  const payments = requireCacheList<TextbookPayment>(
    cache,
    STORAGE_KEYS.TEXTBOOK_PAYMENTS,
    'textbook_payments'
  );
  if (!payments) return false;

  const client = getPianoClient();

  const ok = await upsertThenDiffDelete({
    context: 'piano.textbook_payments',
    cachePresent: true,
    currentIds: payments.map((p) => p.id),
    isAborted,
    upsertAll: () =>
      runRowUpserts(
        payments,
        isAborted,
        (payment) => client.from('textbook_payments').upsert(paymentToPianoRow(payment, orgId)),
        (error) => console.error('Failed to upsert textbook payment:', error)
      ),
    tombstoneIds: pendingDeleteIds(STORAGE_KEYS.TEXTBOOK_PAYMENTS, orgId),
    deleteIds: async (ids) => {
      const { error } = await client.from('textbook_payments').delete().eq('organization_id', orgId).in('id', ids);
      return { error };
    },
  });

  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.TEXTBOOK_PAYMENTS, payments);
  return ok;
}

export async function persistPianoTable<T extends { id: string }>(
  table:
    | 'attendance'
    | 'lesson_records'
    | 'practice_records'
    | 'textbooks'
    | 'textbook_sales'
    | 'textbook_inventory_transactions'
    | 'songs'
    | 'expenses'
    | 'events'
    | 'performance_videos',
  orgId: string,
  cache: SyncCache,
  storageKey: StorageKey,
  toRows: (items: unknown[]) => T[],
  isAborted: PersistAbortGuard,
  options?: { allowDiffDelete?: boolean }
): Promise<boolean> {
  if (isAborted()) return false;
  const items = requireCacheList<unknown>(cache, storageKey, `piano.${table}`);
  if (!items) return false;

  const client = getPianoClient();
  const rows = toRows(items);

  if (options?.allowDiffDelete === false) {
    const upsertOk = await runRowUpserts(
      rows,
      isAborted,
      (row) => client.from(table).upsert(row as never),
      (error) => console.error(`Failed to upsert piano.${table}:`, error)
    );
    if (isAborted()) return false;
    writeLocal(storageKey, items);
    return upsertOk;
  }

  const ok = await upsertThenDiffDelete({
    context: `piano.${table}`,
    cachePresent: true,
    currentIds: rows.map((r) => r.id),
    isAborted,
    upsertAll: () =>
      runRowUpserts(
        rows,
        isAborted,
        (row) => client.from(table).upsert(row as never),
        (error) => console.error(`Failed to upsert piano.${table}:`, error)
      ),
    tombstoneIds: pendingDeleteIds(storageKey, orgId),
    deleteIds: async (ids) => {
      const { error } = await client.from(table).delete().eq('organization_id', orgId).in('id', ids);
      return { error };
    },
  });

  if (isAborted()) return false;
  writeLocal(storageKey, items);
  return ok;
}
