import type { Student } from '@/types';
import { registerStudentWithParent } from '../services/studentRegistrationService';
import { StorageService } from '@/services/storage';
import type { StudentImportNormalizedRow } from './types';

export interface BulkImportProgress {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
}

export interface BulkImportRowResult {
  rowNumber: number;
  ok: boolean;
  studentId?: string;
  error?: string;
}

export interface BulkImportRunResult {
  results: BulkImportRowResult[];
  succeeded: number;
  failed: number;
}

function resolveClassIds(courseSubject: string): string[] {
  const name = courseSubject.trim();
  if (!name) return [];
  const classes = StorageService.getClasses();
  const normalized = name.replace(/\s+/g, '').toLowerCase();
  const matched = classes.filter((c) => {
    const cn = (c.name || '').replace(/\s+/g, '').toLowerCase();
    return cn === normalized || cn.includes(normalized) || normalized.includes(cn);
  });
  return matched.map((c) => c.id);
}

function toStudentPayload(
  row: StudentImportNormalizedRow,
  defaults: {
    teacherId: string;
    teacherName: string;
    tuitionFee: number;
    paymentDay: number;
    level: Student['level'];
  }
): Omit<Student, 'id' | 'createdAt' | 'updatedAt'> {
  const classIds = resolveClassIds(row.courseSubject);
  const memoParts = [row.memo, row.courseSubject && !classIds.length ? `과목: ${row.courseSubject}` : '']
    .map((s) => s?.trim())
    .filter(Boolean);

  return {
    studentNumber: '',
    name: row.name,
    gender: row.gender || 'M',
    birthDate: row.birthDate || '2000-01-01',
    school: row.school || '',
    grade: row.grade || '',
    phone: row.phone || undefined,
    joinDate: row.joinDate,
    status: 'active',
    teacherId: defaults.teacherId,
    teacherName: defaults.teacherName,
    classIds,
    level: defaults.level,
    billingMode: 'monthly',
    tuitionFee: row.tuitionFee ?? defaults.tuitionFee,
    paymentDay: row.paymentDay ?? defaults.paymentDay,
    specialNotes: memoParts.join(' · ') || undefined,
    memo: memoParts.join(' · ') || undefined,
  };
}

/**
 * 검증된 행을 순차 등록 → StudentService/Supabase students(+보호자) 반영
 * (청크 사이 이벤트 루프 양보)
 */
export async function runStudentBulkImport(
  rows: StudentImportNormalizedRow[],
  options: {
    organizationId: string;
    chunkSize?: number;
    onProgress?: (progress: BulkImportProgress) => void;
  }
): Promise<BulkImportRunResult> {
  const settings = StorageService.getSettings();
  const teachers = StorageService.getTeachers();
  const teacher = teachers[0];
  const defaults = {
    teacherId: teacher?.id || '',
    teacherName: teacher?.name || '',
    tuitionFee: settings.defaultTuitionFee || 180000,
    paymentDay: settings.defaultPaymentDay || 10,
    level: 'beginner' as Student['level'],
  };

  const chunkSize = options.chunkSize ?? 5;
  const results: BulkImportRowResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const payload = toStudentPayload(row, defaults);
      const result = await registerStudentWithParent(payload, {
        organizationId: options.organizationId,
        autoGeneratePin: true,
        guardians: row.isAdultSelf
          ? []
          : [
              {
                mode: 'new',
                name: row.guardianName,
                phone: row.guardianPhone,
                email: row.guardianEmail || undefined,
                relationship: row.relationship,
                isPrimary: true,
                invite: false,
              },
            ],
      });
      results.push({ rowNumber: row.rowNumber, ok: true, studentId: result.student.id });
      succeeded++;
    } catch (err) {
      results.push({
        rowNumber: row.rowNumber,
        ok: false,
        error: err instanceof Error ? err.message : '등록 실패',
      });
      failed++;
    }

    options.onProgress?.({
      total: rows.length,
      completed: i + 1,
      succeeded,
      failed,
    });

    if ((i + 1) % chunkSize === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return { results, succeeded, failed };
}
