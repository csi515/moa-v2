import type { Parent, Student } from '../../types';
import { STORAGE_KEYS } from '../adapters';
import { deleteById, generateEntityId, getItem, setItem, type StorageApi } from './helpers';
import { isMonthlyBillingStudent } from '../../core/academy/utils/billingMode';

/** 원생·학부모 CRUD */
export function createCustomerStorage(api: StorageApi) {
  return {
    getStudents(): Student[] {
      const raw = getItem<Student[]>(STORAGE_KEYS.STUDENTS, []);
      return raw.map((student) =>
        (api.deriveStudentGuardians as (s: Student) => Student)(student)
      );
    },

    getStudentsRaw(): Student[] {
      return getItem<Student[]>(STORAGE_KEYS.STUDENTS, []);
    },

    deriveStudentGuardians(student: Student): Student {
      const links = (api.getParentStudentLinks as () => { studentId: string; parentId: string; isPrimary?: boolean }[])()
        .filter((link) => link.studentId === student.id);
      const primary = links.find((link) => link.isPrimary) || links[0];
      if (!primary) return student;
      const parent = (api.getParents as () => Parent[])().find((entry) => entry.id === primary.parentId);
      if (!parent) return student;
      return {
        ...student,
        parentId: parent.id,
        parentName: parent.name,
        parentPhone: parent.phone,
      };
    },

    getStudentById(id: string): Student | undefined {
      return (api.getStudents as () => Student[])().find((student) => student.id === id);
    },

    saveStudent(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Student {
      const list = (api.getStudentsRaw as () => Student[])();
      const now = new Date().toISOString();
      let saved: Student;

      if (student.id) {
        const idx = list.findIndex((entry) => entry.id === student.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...student, id: student.id, updatedAt: now };
          list[idx] = saved;
        } else {
          saved = { ...student, id: student.id, createdAt: now, updatedAt: now };
          list.unshift(saved);
        }
      } else {
        const autoNum = `P-${new Date().getFullYear()}-${String(list.length + 1).padStart(3, '0')}`;
        saved = {
          ...student,
          id: generateEntityId('s'),
          studentNumber: student.studentNumber || autoNum,
          createdAt: now,
          updatedAt: now,
        };
        list.unshift(saved);
      }

      if (!student.id && saved.status === 'active' && isMonthlyBillingStudent(saved)) {
        (api.createInvoiceForStudent as (s: Student) => void)(saved);
      }

      setItem(STORAGE_KEYS.STUDENTS, list);
      return saved;
    },

    deleteStudent(id: string): boolean {
      const list = (api.getStudentsRaw as () => Student[])();
      if (!deleteById(list, id)) return false;
      setItem(STORAGE_KEYS.STUDENTS, list);
      return true;
    },

    getParents(): Parent[] {
      return getItem<Parent[]>(STORAGE_KEYS.PARENTS, []);
    },

    saveParent(parent: Omit<Parent, 'id' | 'createdAt'> & { id?: string }): Parent {
      const list = (api.getParents as () => Parent[])();
      let saved: Parent;

      if (parent.id) {
        const idx = list.findIndex((entry) => entry.id === parent.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...parent, id: parent.id };
          list[idx] = saved;
        } else {
          saved = { ...parent, id: parent.id, createdAt: new Date().toISOString().slice(0, 10) };
          list.unshift(saved);
        }
      } else {
        saved = {
          ...parent,
          id: generateEntityId('p'),
          createdAt: new Date().toISOString().slice(0, 10),
        };
        list.unshift(saved);
      }

      setItem(STORAGE_KEYS.PARENTS, list);
      return saved;
    },

    deleteParent(id: string): boolean {
      const list = (api.getParents as () => Parent[])();
      if (!deleteById(list, id)) return false;
      setItem(STORAGE_KEYS.PARENTS, list);
      return true;
    },
  };
}
