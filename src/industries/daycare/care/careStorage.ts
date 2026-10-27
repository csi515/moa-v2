import { STORAGE_KEYS } from '@/services/adapters';
import { generateEntityId, getItem, setItem, type StorageApi } from '@/services/storage/helpers';
import { storageApi } from '@/services/storage/storageApi';
import type {
  CareIncident,
  CareJournal,
  CarePickupLog,
  CctvViewRequest,
  ChildLegalRecord,
  MealSampleLog,
  MedicationRequest,
  SafetyInspectionLog,
  StaffHealthCert,
} from './types';

function upsertById<T extends { id: string; createdAt?: string; updatedAt?: string }>(
  list: T[],
  input: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  },
  idPrefix: string
): { list: T[]; saved: T } {
  const now = new Date().toISOString();
  let saved: T;

  if (input.id) {
    const idx = list.findIndex((item) => item.id === input.id);
    if (idx >= 0) {
      saved = { ...list[idx], ...input, id: input.id, updatedAt: now };
      list[idx] = saved;
    } else {
      saved = { ...(input as T), id: input.id, createdAt: now, updatedAt: now };
      list.unshift(saved);
    }
  } else {
    saved = {
      ...(input as T),
      id: generateEntityId(idPrefix),
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(saved);
  }

  return { list, saved };
}

function deleteById<T extends { id: string }>(list: T[], id: string): T[] | null {
  const filtered = list.filter((item) => item.id !== id);
  return filtered.length === list.length ? null : filtered;
}

/** 어린이집 보육 기록 CRUD. local은 cache, SoT는 core.care_* */
export function createDaycareCareStorage(_api: StorageApi) {
  return {
    getCareJournals(): CareJournal[] {
      return getItem<CareJournal[]>(STORAGE_KEYS.CARE_JOURNALS, []);
    },

    saveCareJournal(
      input: Omit<CareJournal, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): CareJournal {
      const current = getItem<CareJournal[]>(STORAGE_KEYS.CARE_JOURNALS, []);
      const { list, saved } = upsertById(current, input, 'cj');
      setItem(STORAGE_KEYS.CARE_JOURNALS, list);
      return saved;
    },

    deleteCareJournal(id: string): boolean {
      const current = getItem<CareJournal[]>(STORAGE_KEYS.CARE_JOURNALS, []);
      const next = deleteById(current, id);
      if (!next) return false;
      setItem(STORAGE_KEYS.CARE_JOURNALS, next);
      return true;
    },

    getMedicationRequests(): MedicationRequest[] {
      return getItem<MedicationRequest[]>(STORAGE_KEYS.MEDICATION_REQUESTS, []);
    },

    saveMedicationRequest(
      input: Omit<MedicationRequest, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): MedicationRequest {
      const current = getItem<MedicationRequest[]>(STORAGE_KEYS.MEDICATION_REQUESTS, []);
      const { list, saved } = upsertById(current, input, 'med');
      setItem(STORAGE_KEYS.MEDICATION_REQUESTS, list);
      return saved;
    },

    deleteMedicationRequest(id: string): boolean {
      const current = getItem<MedicationRequest[]>(STORAGE_KEYS.MEDICATION_REQUESTS, []);
      const next = deleteById(current, id);
      if (!next) return false;
      setItem(STORAGE_KEYS.MEDICATION_REQUESTS, next);
      return true;
    },

    getChildLegalRecords(): ChildLegalRecord[] {
      return getItem<ChildLegalRecord[]>(STORAGE_KEYS.CARE_CHILD_RECORDS, []);
    },

    saveChildLegalRecord(
      input: Omit<ChildLegalRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): ChildLegalRecord {
      const current = getItem<ChildLegalRecord[]>(STORAGE_KEYS.CARE_CHILD_RECORDS, []);
      const existingId =
        input.id || current.find((record) => record.studentId === input.studentId)?.id;
      const pickups = (input.authorizedPickups || [])
        .map((person) => ({
          name: person.name.trim(),
          relation: person.relation.trim(),
          phone: person.phone.trim(),
        }))
        .filter((person) => person.name);
      const { list, saved } = upsertById(
        current,
        { ...input, id: existingId, authorizedPickups: pickups },
        'clr'
      );
      setItem(STORAGE_KEYS.CARE_CHILD_RECORDS, list);
      return saved;
    },

    getCareIncidents(): CareIncident[] {
      return getItem<CareIncident[]>(STORAGE_KEYS.CARE_INCIDENTS, []);
    },

    saveCareIncident(
      input: Omit<CareIncident, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): CareIncident {
      const current = getItem<CareIncident[]>(STORAGE_KEYS.CARE_INCIDENTS, []);
      const { list, saved } = upsertById(current, input, 'inc');
      setItem(STORAGE_KEYS.CARE_INCIDENTS, list);
      return saved;
    },

    deleteCareIncident(id: string): boolean {
      const current = getItem<CareIncident[]>(STORAGE_KEYS.CARE_INCIDENTS, []);
      const next = deleteById(current, id);
      if (!next) return false;
      setItem(STORAGE_KEYS.CARE_INCIDENTS, next);
      return true;
    },

    getStaffHealthCerts(): StaffHealthCert[] {
      return getItem<StaffHealthCert[]>(STORAGE_KEYS.CARE_STAFF_HEALTH_CERTS, []);
    },

    saveStaffHealthCert(
      input: Omit<StaffHealthCert, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): StaffHealthCert {
      const current = getItem<StaffHealthCert[]>(STORAGE_KEYS.CARE_STAFF_HEALTH_CERTS, []);
      const existingId =
        input.id || current.find((item) => item.teacherId === input.teacherId)?.id;
      const { list, saved } = upsertById(current, { ...input, id: existingId }, 'shc');
      setItem(STORAGE_KEYS.CARE_STAFF_HEALTH_CERTS, list);
      return saved;
    },

    getSafetyInspectionLogs(): SafetyInspectionLog[] {
      return getItem<SafetyInspectionLog[]>(STORAGE_KEYS.CARE_SAFETY_LOGS, []);
    },

    saveSafetyInspectionLog(
      input: Omit<SafetyInspectionLog, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): SafetyInspectionLog {
      const current = getItem<SafetyInspectionLog[]>(STORAGE_KEYS.CARE_SAFETY_LOGS, []);
      const { list, saved } = upsertById(current, input, 'saf');
      setItem(STORAGE_KEYS.CARE_SAFETY_LOGS, list);
      return saved;
    },

    deleteSafetyInspectionLog(id: string): boolean {
      const current = getItem<SafetyInspectionLog[]>(STORAGE_KEYS.CARE_SAFETY_LOGS, []);
      const next = deleteById(current, id);
      if (!next) return false;
      setItem(STORAGE_KEYS.CARE_SAFETY_LOGS, next);
      return true;
    },

    getMealSampleLogs(): MealSampleLog[] {
      return getItem<MealSampleLog[]>(STORAGE_KEYS.CARE_MEAL_SAMPLES, []);
    },

    saveMealSampleLog(
      input: Omit<MealSampleLog, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): MealSampleLog {
      const current = getItem<MealSampleLog[]>(STORAGE_KEYS.CARE_MEAL_SAMPLES, []);
      const { list, saved } = upsertById(current, input, 'mls');
      setItem(STORAGE_KEYS.CARE_MEAL_SAMPLES, list);
      return saved;
    },

    deleteMealSampleLog(id: string): boolean {
      const current = getItem<MealSampleLog[]>(STORAGE_KEYS.CARE_MEAL_SAMPLES, []);
      const next = deleteById(current, id);
      if (!next) return false;
      setItem(STORAGE_KEYS.CARE_MEAL_SAMPLES, next);
      return true;
    },

    getCctvViewRequests(): CctvViewRequest[] {
      return getItem<CctvViewRequest[]>(STORAGE_KEYS.CARE_CCTV_REQUESTS, []);
    },

    getCarePickupLogs(): CarePickupLog[] {
      return getItem<CarePickupLog[]>(STORAGE_KEYS.CARE_PICKUP_LOGS, []);
    },

    saveCarePickupLog(
      input: Omit<CarePickupLog, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): CarePickupLog {
      const current = getItem<CarePickupLog[]>(STORAGE_KEYS.CARE_PICKUP_LOGS, []);
      const existingId =
        input.id ||
        current.find(
          (item) => item.studentId === input.studentId && item.pickupDate === input.pickupDate
        )?.id;
      const { list, saved } = upsertById(current, { ...input, id: existingId }, 'pkp');
      setItem(STORAGE_KEYS.CARE_PICKUP_LOGS, list);
      return saved;
    },

    saveCctvViewRequest(
      input: Omit<CctvViewRequest, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): CctvViewRequest {
      const current = getItem<CctvViewRequest[]>(STORAGE_KEYS.CARE_CCTV_REQUESTS, []);
      const { list, saved } = upsertById(current, input, 'cct');
      setItem(STORAGE_KEYS.CARE_CCTV_REQUESTS, list);
      return saved;
    },
  };
}

/** Daycare care persist SoT. StorageService bind는 호환층. */
export const careStorage = createDaycareCareStorage(storageApi);
