import type { Consultation, LessonRecord, PracticeRecord, Student } from '../../types';
import { STORAGE_KEYS } from '../adapters';
import { deleteById, generateEntityId, getItem, setItem, type StorageApi } from './helpers';

/** 상담·연습·레슨 기록 CRUD */
export function createRecordsStorage(api: StorageApi) {
  return {
    getConsultations(): Consultation[] {
      const list = getItem<Consultation[]>(STORAGE_KEYS.CONSULTATIONS, []);
      const students = (api.getStudents as () => Student[])();
      const studentMap = new Map(students.map((student) => [student.id, student]));
      return list.map((consultation) => {
        const student = studentMap.get(consultation.studentId);
        if (!student?.parentName) return consultation;
        return { ...consultation, parentName: student.parentName };
      });
    },

    saveConsultation(
      consultation: Omit<Consultation, 'id' | 'createdAt'> & { id?: string }
    ): Consultation {
      const list = getItem<Consultation[]>(STORAGE_KEYS.CONSULTATIONS, []);
      const now = new Date().toISOString();
      let saved: Consultation;

      if (consultation.id) {
        const idx = list.findIndex((entry) => entry.id === consultation.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...consultation, id: consultation.id };
          list[idx] = saved;
        } else {
          saved = { ...consultation, id: consultation.id, createdAt: now };
          list.unshift(saved);
        }
      } else {
        saved = { ...consultation, id: generateEntityId('cst'), createdAt: now };
        list.unshift(saved);
      }

      setItem(STORAGE_KEYS.CONSULTATIONS, list);
      return saved;
    },

    deleteConsultation(id: string): boolean {
      const list = getItem<Consultation[]>(STORAGE_KEYS.CONSULTATIONS, []);
      if (!deleteById(list, id)) return false;
      setItem(STORAGE_KEYS.CONSULTATIONS, list);
      return true;
    },

    getPracticeRecords(): PracticeRecord[] {
      return getItem<PracticeRecord[]>(STORAGE_KEYS.PRACTICE_RECORDS, []);
    },

    savePracticeRecord(
      record: Omit<PracticeRecord, 'id' | 'createdAt'> & { id?: string }
    ): PracticeRecord {
      const list = this.getPracticeRecords();
      const now = new Date().toISOString();
      let saved: PracticeRecord;

      if (record.id) {
        const idx = list.findIndex((entry) => entry.id === record.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...record, id: record.id };
          list[idx] = saved;
        } else {
          saved = { ...record, id: record.id, createdAt: now };
          list.unshift(saved);
        }
      } else {
        saved = { ...record, id: generateEntityId('pr'), createdAt: now };
        list.unshift(saved);
      }

      setItem(STORAGE_KEYS.PRACTICE_RECORDS, list);
      return saved;
    },

    deletePracticeRecord(id: string): boolean {
      const list = this.getPracticeRecords();
      if (!deleteById(list, id)) return false;
      setItem(STORAGE_KEYS.PRACTICE_RECORDS, list);
      return true;
    },

    getLessonRecords(): LessonRecord[] {
      return getItem<LessonRecord[]>(STORAGE_KEYS.LESSON_RECORDS, []);
    },

    saveLessonRecord(record: Omit<LessonRecord, 'id' | 'createdAt'> & { id?: string }): LessonRecord {
      const list = this.getLessonRecords();
      const now = new Date().toISOString();
      let saved: LessonRecord;

      const naturalKeyIdx = list.findIndex(
        (entry) =>
          entry.date === record.date &&
          entry.studentId === record.studentId &&
          (entry.classId || '') === (record.classId || '')
      );

      if (record.id) {
        const idx = list.findIndex((entry) => entry.id === record.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...record, id: record.id };
          list[idx] = saved;
        } else if (naturalKeyIdx >= 0) {
          const existingId = list[naturalKeyIdx].id;
          saved = { ...list[naturalKeyIdx], ...record, id: existingId };
          list[naturalKeyIdx] = saved;
        } else {
          saved = { ...record, id: record.id, createdAt: now };
          list.unshift(saved);
        }
      } else if (naturalKeyIdx >= 0) {
        const existingId = list[naturalKeyIdx].id;
        saved = { ...list[naturalKeyIdx], ...record, id: existingId };
        list[naturalKeyIdx] = saved;
      } else {
        saved = { ...record, id: generateEntityId('lr'), createdAt: now };
        list.unshift(saved);
      }

      setItem(STORAGE_KEYS.LESSON_RECORDS, list);
      return saved;
    },

    deleteLessonRecord(id: string): boolean {
      const list = this.getLessonRecords();
      if (!deleteById(list, id)) return false;
      setItem(STORAGE_KEYS.LESSON_RECORDS, list);
      return true;
    },
  };
}
