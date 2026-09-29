import type {
  AcademySettings,
  Parent,
  Student,
  Teacher,
} from '../../../types';
import { readLocal, writeLocal } from '../localStorageEngine';
import { STORAGE_KEYS } from '../storageKeys';
import {
  parentToCustomerRow,
  studentContactRow,
  studentToCustomerRow,
  teacherToStaffRow,
} from './entityMappers';
import type { ParentStudentLink } from '../../../core/parent/types';
import { linkToRow } from './parentLinkEntityMappers';
import type { PersistAbortGuard, SyncCache } from './syncTypes';
import { requireCacheList, runRowUpserts, upsertThenDiffDeleteByKeys } from './persistHelpers';
import type { CoreClient } from './corePersistSyncTable';
import { syncTable } from './corePersistSyncTable';

export async function persistSettings(
  client: CoreClient,
  orgId: string,
  cache: SyncCache
): Promise<boolean> {
  const settings = cache.get<AcademySettings>(STORAGE_KEYS.SETTINGS);
  if (!settings) return true;

  const slotRecruitments =
    readLocal<NonNullable<AcademySettings['slotRecruitments']>>(
      STORAGE_KEYS.SLOT_RECRUITMENTS,
      settings.slotRecruitments || []
    );
  const payload: AcademySettings = { ...settings, slotRecruitments };

  const { error } = await client
    .from('organizations')
    .update({ settings: payload as never })
    .eq('id', orgId);

  // local mirror 유지 + 원격 실패 시 false → outbox 재시도 (로컬이 SoT가 아님)
  writeLocal(STORAGE_KEYS.SETTINGS, payload);
  writeLocal(STORAGE_KEYS.SLOT_RECRUITMENTS, slotRecruitments);

  if (error) {
    console.error('Failed to persist settings:', error);
    return false;
  }
  return true;
}

function linkCompositeKey(parentId: string, studentId: string): string {
  return `${parentId}:${studentId}`;
}

export async function persistStaff(
  client: CoreClient,
  orgId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  const teachers = requireCacheList<Teacher>(cache, STORAGE_KEYS.TEACHERS, 'staff');
  if (!teachers) return false;

  const ok = await syncTable(
    client,
    'staff',
    orgId,
    teachers.map((t) => t.id),
    () =>
      runRowUpserts(
        teachers,
        isAborted,
        (teacher) => client.from('staff').upsert(teacherToStaffRow(teacher, orgId)),
        (error) => console.error('Failed to upsert staff:', error)
      ),
    { cachePresent: true, context: 'staff', isAborted }
  );
  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.TEACHERS, teachers);
  return ok;
}

export async function persistCustomers(
  client: CoreClient,
  orgId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  if (!cache.has(STORAGE_KEYS.STUDENTS) || !cache.has(STORAGE_KEYS.PARENTS)) {
    console.error('[sync] Refusing customers persist: STUDENTS/PARENTS cache incomplete');
    return false;
  }
  const students = cache.get<Student[]>(STORAGE_KEYS.STUDENTS) || [];
  const parents = cache.get<Parent[]>(STORAGE_KEYS.PARENTS) || [];
  const allIds = [...students.map((s) => s.id), ...parents.map((p) => p.id)];

  const ok = await syncTable(
    client,
    'customers',
    orgId,
    allIds,
    async () => {
      const pinMap = new Map(
        (cache.get<{ customerId: string; pinHash: string }[]>(STORAGE_KEYS.CUSTOMER_PINS) || []).map(
          (p) => [p.customerId, p.pinHash]
        )
      );
      const links = cache.get<ParentStudentLink[]>(STORAGE_KEYS.PARENT_STUDENT_LINKS) || [];
      let upsertOk = true;

      for (const student of students) {
        if (isAborted()) return false;
        const row = {
          ...studentToCustomerRow(student, orgId),
          check_in_pin_hash: pinMap.get(student.id) ?? null,
        };
        const { error } = await client.from('customers').upsert(row);
        if (error) {
          upsertOk = false;
          console.error('Failed to upsert student:', error);
        }

        const primaryLink =
          links.find((l) => l.studentId === student.id && l.isPrimary) ||
          links.find((l) => l.studentId === student.id);
        const parentRecord = primaryLink
          ? parents.find((p) => p.id === primaryLink.parentId)
          : parents.find((p) => p.id === student.parentId);
        const contact = studentContactRow(
          student,
          orgId,
          undefined,
          parentRecord
            ? { name: parentRecord.name, phone: parentRecord.phone, email: parentRecord.email }
            : undefined
        );
        if (contact) {
          const { data: existing } = await client
            .from('customer_contacts')
            .select('id')
            .eq('customer_id', student.id)
            .eq('is_primary', true)
            .maybeSingle();

          const contactRow = { ...contact, id: existing?.id || contact.id };
          const { error: contactError } = await client.from('customer_contacts').upsert(contactRow);
          if (contactError) {
            upsertOk = false;
            console.error('Failed to upsert contact:', contactError);
          }
        }
      }

      for (const parent of parents) {
        if (isAborted()) return false;
        const { error } = await client.from('customers').upsert(parentToCustomerRow(parent, orgId));
        if (error) {
          upsertOk = false;
          console.error('Failed to upsert parent:', error);
        }
      }
      return upsertOk;
    },
    { cachePresent: true, context: 'customers', isAborted }
  );

  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.STUDENTS, students);
  writeLocal(STORAGE_KEYS.PARENTS, parents);
  return ok;
}

export async function persistCustomerPins(
  client: CoreClient,
  orgId: string,
  cache: SyncCache
): Promise<boolean> {
  if (!cache.has(STORAGE_KEYS.CUSTOMER_PINS)) return true;
  const pins = cache.get<{ customerId: string; pinHash: string }[]>(STORAGE_KEYS.CUSTOMER_PINS) || [];
  const pinMap = new Map(pins.map((p) => [p.customerId, p.pinHash]));

  let ok = true;
  for (const [customerId, pinHash] of pinMap) {
    const { error } = await client
      .from('customers')
      .update({ check_in_pin_hash: pinHash })
      .eq('id', customerId)
      .eq('organization_id', orgId);
    if (error) {
      ok = false;
      console.error('Failed to update customer PIN:', error);
    }
  }

  writeLocal(STORAGE_KEYS.CUSTOMER_PINS, pins);
  return ok;
}

export async function persistParentStudentLinks(
  client: CoreClient,
  orgId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  const links = requireCacheList<ParentStudentLink>(
    cache,
    STORAGE_KEYS.PARENT_STUDENT_LINKS,
    'parent_student_links'
  );
  if (!links) return false;

  const rows = links.map((l) => linkToRow(l, orgId));
  const currentKeys = rows.map((r) =>
    linkCompositeKey(r.parent_customer_id, r.student_customer_id)
  );

  const ok = await upsertThenDiffDeleteByKeys({
    context: 'parent_student_links',
    cachePresent: true,
    currentKeys,
    isAborted,
    upsertAll: () =>
      runRowUpserts(
        rows,
        isAborted,
        (row) =>
          client.from('parent_student_links').upsert(row, {
            onConflict: 'organization_id,parent_customer_id,student_customer_id',
          }),
        (error) => console.error('Failed to upsert parent_student_link:', error)
      ),
    fetchRemoteKeys: async () => {
      const { data: existing, error } = await client
        .from('parent_student_links')
        .select('parent_customer_id, student_customer_id')
        .eq('organization_id', orgId);
      return {
        keys: (existing || []).map((r) =>
          linkCompositeKey(r.parent_customer_id, r.student_customer_id)
        ),
        error,
      };
    },
    deleteKey: async (key) => {
      const [parentId, studentId] = key.split(':');
      if (!parentId || !studentId) return { error: null };
      const { error } = await client
        .from('parent_student_links')
        .delete()
        .eq('organization_id', orgId)
        .eq('parent_customer_id', parentId)
        .eq('student_customer_id', studentId);
      return { error };
    },
  });

  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.PARENT_STUDENT_LINKS, links);
  return ok;
}
