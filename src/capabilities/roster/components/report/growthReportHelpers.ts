export interface StudentReportTarget {
  id: string;
  name: string;
  birthDate?: string;
  phone?: string;
  level?: string;
  teacherName?: string;
  school?: string;
  grade?: string;
  status?: string;
}

export interface StudentGrowthReportData {
  studentName: string;
  birthDate?: string;
  period: string;
  instructorName: string;
  attendanceRate: number;
  totalLessons: number;
  attendedLessons: number;
  practiceHours: number;
  currentLevel: string;
  completedSongs: string[];
  practicingSongs: string[];
  teacherComment: string;
  academyName: string;
}

export function buildGrowthReportData(
  student: StudentReportTarget,
  options?: {
    period?: string;
    academyName?: string;
    instructorName?: string;
    completedSongs?: string[];
    teacherComment?: string;
  }
): StudentGrowthReportData {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return {
    studentName: student.name,
    birthDate: student.birthDate || '미등록',
    period: options?.period || `${currentYear}년 ${currentMonth}월호`,
    instructorName: options?.instructorName || student.teacherName || '담당 강사',
    attendanceRate: 95,
    totalLessons: 8,
    attendedLessons: 8,
    practiceHours: 12.5,
    currentLevel: student.level || '초급 바이엘 과정',
    completedSongs: options?.completedSongs || [
      '모차르트 - 작은 별 변주곡 (주제)',
      '체르니 100번 - 제 12번',
      '하농 - 제 1번 손가락 독립 연습',
    ],
    practicingSongs: [
      '히사이시 조 - 인생의 회전목마 (쉬운 편곡)',
      '체르니 100번 - 제 15번',
    ],
    teacherComment:
      options?.teacherComment ||
      `${student.name} 학생은 이번 달 바른 손모양과 일정한 템포 유지를 집중 연습하여 타건의 울림이 한층 맑고 또렷해졌습니다. 특히 연습실 자율 연습에 성실히 참여하며 새로운 곡에 대한 흥미와 성취감이 매우 돋보입니다. 다음 달에는 페달링 기법과 셈여림(dynamics) 표현을 더 깊이 지도할 예정입니다.`,
    academyName: options?.academyName || '모아 피아노 음악학원',
  };
}
