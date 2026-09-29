import type { ClassItem, Student, Teacher } from '../../types';
import { STORAGE_KEYS } from '../adapters';
import { deleteById, generateEntityId, getItem, setItem } from './helpers';

/** 강사·반 CRUD */
export function createStaffClassStorage() {
  return {
    getTeachers(): Teacher[] {
      return getItem<Teacher[]>(STORAGE_KEYS.TEACHERS, []);
    },

    saveTeacher(teacher: Omit<Teacher, 'id'> & { id?: string }): Teacher {
      const list = this.getTeachers();
      let saved: Teacher;

      if (teacher.id) {
        const idx = list.findIndex((entry) => entry.id === teacher.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...teacher, id: teacher.id };
          list[idx] = saved;
        } else {
          saved = { ...teacher, id: teacher.id };
          list.push(saved);
        }
      } else {
        saved = { ...teacher, id: generateEntityId('t') };
        list.push(saved);
      }

      setItem(STORAGE_KEYS.TEACHERS, list);
      return saved;
    },

    deleteTeacher(id: string): boolean {
      const list = this.getTeachers();
      if (!deleteById(list, id)) return false;
      setItem(STORAGE_KEYS.TEACHERS, list);
      return true;
    },

    getClasses(): ClassItem[] {
      return getItem<ClassItem[]>(STORAGE_KEYS.CLASSES, []);
    },

    saveClass(cls: Omit<ClassItem, 'id'> & { id?: string }): ClassItem {
      const list = this.getClasses();
      let saved: ClassItem;

      if (cls.id) {
        const idx = list.findIndex((entry) => entry.id === cls.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...cls, id: cls.id };
          list[idx] = saved;
        } else {
          saved = { ...cls, id: cls.id };
          list.push(saved);
        }
      } else {
        saved = { ...cls, id: generateEntityId('c') };
        list.push(saved);
      }

      setItem(STORAGE_KEYS.CLASSES, list);
      return saved;
    },

    deleteClass(id: string): boolean {
      const list = this.getClasses();
      if (!deleteById(list, id)) return false;
      setItem(STORAGE_KEYS.CLASSES, list);

      const students = getItem<Student[]>(STORAGE_KEYS.STUDENTS, []);
      let changed = false;
      const nextStudents = students.map((student) => {
        if (!student.classIds?.includes(id)) return student;
        changed = true;
        return {
          ...student,
          classIds: student.classIds.filter((classId) => classId !== id),
        };
      });
      if (changed) {
        setItem(STORAGE_KEYS.STUDENTS, nextStudents);
      }
      return true;
    },
  };
}
