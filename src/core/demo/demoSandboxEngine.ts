import { StorageService } from '@/services/storage';

export interface DemoStudentTemplate {
  name: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  school: string;
  grade: string;
  tuitionFee: number;
  course: string;
  status: 'active' | 'paused';
}

export const DEMO_STUDENT_PRESETS: DemoStudentTemplate[] = [
  {
    name: '이지원',
    phone: '010-3456-7891',
    parentName: '이현우',
    parentPhone: '010-9876-1234',
    school: '예원초등학교',
    grade: '3학년',
    tuitionFee: 180000,
    course: '바이엘 4권 / 체르니 100 준비',
    status: 'active',
  },
  {
    name: '김민준',
    phone: '010-4567-8912',
    parentName: '김상철',
    parentPhone: '010-8765-2345',
    school: '솔빛초등학교',
    grade: '4학년',
    tuitionFee: 200000,
    course: '체르니 30 / 소나티네 앨범',
    status: 'active',
  },
  {
    name: '박서현',
    phone: '010-5678-9123',
    parentName: '박진영',
    parentPhone: '010-7654-3456',
    school: '은빛중학교',
    grade: '1학년',
    tuitionFee: 220000,
    course: '체르니 40 / 쇼팽 왈츠',
    status: 'active',
  },
  {
    name: '정시우',
    phone: '010-6789-1234',
    parentName: '정동원',
    parentPhone: '010-6543-4567',
    school: '한빛초등학교',
    grade: '2학년',
    tuitionFee: 180000,
    course: '바이엘 2권 / 피아노 어드벤처',
    status: 'active',
  },
  {
    name: '최유진',
    phone: '010-7890-2345',
    parentName: '최문선',
    parentPhone: '010-5432-5678',
    school: '솔빛초등학교',
    grade: '5학년',
    tuitionFee: 220000,
    course: '콩쿠르 입상 대비 특별 마스터 클래스',
    status: 'active',
  },
  {
    name: '강도윤',
    phone: '010-8901-3456',
    parentName: '강태석',
    parentPhone: '010-4321-6789',
    school: '청담성인음악교실',
    grade: '성인 취미반',
    tuitionFee: 240000,
    course: '이루마 뉴에이지 / OST 명곡집',
    status: 'active',
  },
  {
    name: '윤하은',
    phone: '010-9012-4567',
    parentName: '윤재호',
    parentPhone: '010-3210-7890',
    school: '예원초등학교',
    grade: '1학년',
    tuitionFee: 160000,
    course: '유아 기초 피아노 / 리듬 놀이',
    status: 'active',
  },
  {
    name: '임채원',
    phone: '010-1122-3344',
    parentName: '임종석',
    parentPhone: '010-2109-8901',
    school: '솔빛초등학교',
    grade: '6학년',
    tuitionFee: 200000,
    course: '하농 테크닉 / 바흐 인벤션',
    status: 'active',
  },
];

const DEMO_TAG = '[DEMO_SANDBOX]';
const DEMO_STATUS_KEY = 'moa_demo_sandbox_active';

export const DemoSandboxEngine = {
  isDemoActive(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(DEMO_STATUS_KEY) === 'true';
  },

  /**
   * 데모 샌드박스 데이터 1클릭 주입
   */
  injectDemoData(): { insertedStudents: number } {
    let count = 0;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // 1. 학생 8명 생성
    for (const p of DEMO_STUDENT_PRESETS) {
      try {
        const student = StorageService.saveStudent({
          name: p.name,
          phone: p.phone,
          parentName: p.parentName,
          parentPhone: p.parentPhone,
          school: p.school,
          grade: p.grade,
          tuitionFee: p.tuitionFee,
          status: p.status,
          joinDate: todayStr,
          notes: `${DEMO_TAG} ${p.course}`,
        } as any);

        if (student?.id) {
          count++;

          // 2. 출결 기록 1건씩 생성
          StorageService.saveAttendanceRecord({
            studentId: student.id,
            date: todayStr,
            status: 'present',
            time: '15:30',
            note: `${DEMO_TAG} 정규 레슨 등원 완료`,
          } as any);
        }
      } catch (err) {
        console.error('[DemoSandboxEngine] Failed to inject item', err);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(DEMO_STATUS_KEY, 'true');
    }

    return { insertedStudents: count };
  },

  /**
   * 주입된 데모 데이터만 1클릭으로 깨끗하게 롤백/초기화
   */
  clearDemoData(): { removedCount: number } {
    let removed = 0;
    try {
      const students = StorageService.getStudents();
      const demoStudents = students.filter(
        (s) => s.notes && s.notes.includes(DEMO_TAG)
      );

      for (const ds of demoStudents) {
        StorageService.deleteStudent(ds.id);
        removed++;
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem(DEMO_STATUS_KEY);
      }
    } catch (e) {
      console.error('[DemoSandboxEngine] Clear failed', e);
    }
    return { removedCount: removed };
  },
};
