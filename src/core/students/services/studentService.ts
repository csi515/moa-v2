import { StorageService } from '@/services/storage';
import type { Parent, Student } from '@/types';

/**
 * 원생(고객) 도메인 파사드.
 * 내부는 StorageService 동기화 경로를 쓰며, UI는 이 Service만 호출한다.
 * (점진 이전: Component → StudentService → Storage → sync)
 */
export const StudentService = {
  getStudents(): Student[] {
    return StorageService.getStudents();
  },

  getStudentById(id: string): Student | undefined {
    return StorageService.getStudents().find((s) => s.id === id);
  },

  getActiveStudents(): Student[] {
    return StorageService.getStudents().filter((s) => s.status === 'active');
  },

  saveStudent(
    student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Student {
    return StorageService.saveStudent(student);
  },

  deleteStudent(id: string): boolean {
    return StorageService.deleteStudent(id);
  },

  getParents(): Parent[] {
    return StorageService.getParents();
  },

  getParentById(id: string): Parent | undefined {
    return StorageService.getParents().find((p) => p.id === id);
  },
};
