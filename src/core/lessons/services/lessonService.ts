import { StorageService } from '@/services/storage';
import type { LessonRecord } from '@/types';

/**
 * 레슨 기록 도메인 파사드.
 * UI는 StorageService 대신 이 Service를 사용한다.
 */
export const LessonService = {
  getLessonRecords(): LessonRecord[] {
    return StorageService.getLessonRecords();
  },

  getLessonRecordsByStudent(studentId: string): LessonRecord[] {
    return StorageService.getLessonRecords().filter((r) => r.studentId === studentId);
  },

  getLessonRecordsByTeacher(teacherId: string, yearMonth?: string): LessonRecord[] {
    return StorageService.getLessonRecords().filter((r) => {
      if (r.teacherId !== teacherId) return false;
      if (yearMonth && !r.date.startsWith(yearMonth)) return false;
      return true;
    });
  },

  getLessonRecordById(id: string): LessonRecord | undefined {
    return StorageService.getLessonRecords().find((r) => r.id === id);
  },

  saveLessonRecord(
    record: Omit<LessonRecord, 'id' | 'createdAt'> & { id?: string }
  ): LessonRecord {
    return StorageService.saveLessonRecord(record);
  },

  deleteLessonRecord(id: string): boolean {
    return StorageService.deleteLessonRecord(id);
  },
};
