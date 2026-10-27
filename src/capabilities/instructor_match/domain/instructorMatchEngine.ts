/**
 * 강사·담당자 배정 엔진 (Pure Function Domain)
 *
 * 대상: PT 트레이너, 피아노 개인 레슨, 맞춤 공방 강사
 * 순수 로직: 강사별 스케줄 중복(Double-booking) 방어 판정식, 강사별 월간 세션 수행 건수 집계
 */

export interface LessonSession {
  id: string;
  instructorId: string;
  customerId: string;
  startAt: string; // ISO 8601 String
  endAt: string; // ISO 8601 String
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  durationMinutes: number;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingSessionIds: string[];
}

export function detectScheduleConflict(
  existingSessions: LessonSession[],
  targetSession: {
    id?: string;
    instructorId: string;
    startAt: string;
    endAt: string;
  }
): ConflictCheckResult {
  const targetStart = new Date(targetSession.startAt).getTime();
  const targetEnd = new Date(targetSession.endAt).getTime();

  if (targetStart >= targetEnd) {
    throw new Error('시작 시각은 종료 시각보다 앞서야 합니다.');
  }

  const conflictingSessionIds = existingSessions
    .filter((s) => {
      // 본인 세션은 제외
      if (targetSession.id && s.id === targetSession.id) return false;
      // 취소된 세션은 충돌 대상 제외
      if (s.status === 'CANCELLED') return false;
      // 동일 강사만 대상
      if (s.instructorId !== targetSession.instructorId) return false;

      const sStart = new Date(s.startAt).getTime();
      const sEnd = new Date(s.endAt).getTime();

      // 시간 겹침 검사: (StartA < EndB) && (EndA > StartB)
      return targetStart < sEnd && targetEnd > sStart;
    })
    .map((s) => s.id);

  return {
    hasConflict: conflictingSessionIds.length > 0,
    conflictingSessionIds,
  };
}

export interface MonthlyInstructorPerformance {
  instructorId: string;
  yearMonth: string; // YYYY-MM
  totalScheduled: number;
  totalCompleted: number;
  totalCancelled: number;
  totalMinutesCompleted: number;
  uniqueCustomersCount: number;
}

export function aggregateMonthlyInstructorSessions(
  sessions: LessonSession[],
  instructorId: string,
  yearMonth: string // YYYY-MM
): MonthlyInstructorPerformance {
  const filtered = sessions.filter(
    (s) => s.instructorId === instructorId && s.startAt.startsWith(yearMonth)
  );

  let totalScheduled = 0;
  let totalCompleted = 0;
  let totalCancelled = 0;
  let totalMinutesCompleted = 0;
  const customersSet = new Set<string>();

  for (const session of filtered) {
    if (session.status === 'SCHEDULED') {
      totalScheduled += 1;
    } else if (session.status === 'COMPLETED') {
      totalCompleted += 1;
      totalMinutesCompleted += session.durationMinutes;
      customersSet.add(session.customerId);
    } else if (session.status === 'CANCELLED') {
      totalCancelled += 1;
    }
  }

  return {
    instructorId,
    yearMonth,
    totalScheduled,
    totalCompleted,
    totalCancelled,
    totalMinutesCompleted,
    uniqueCustomersCount: customersSet.size,
  };
}

/**
 * ============================================================================
 * [문화센터/평생교육원] 강사 스펙(프로필) 및 원클릭 A4 홍보 포스터 도메인 엔진
 * ============================================================================
 */

export interface MajorCourseInfo {
  courseName: string;
  targetAudience: string; // e.g. "성인 입문/취미", "주부/직장인 저녁반"
  scheduleSummary: string; // e.g. "매주 화/목 10:00~11:30 (12주)"
  curriculumHighlights: string[]; // e.g. ["1주: 반죽 기초 및 발효", "2주: 크루아상"]
}

export interface InstructorProfile {
  staffId: string;
  staffName: string;
  headlineTitle: string; // e.g. "프랑스 르꼬르동블루 출신 파티시에의 홈베이킹"
  academicBackground: string; // e.g. "프랑스 르 꼬르동 블루 제과 디플로마 수석 졸업"
  careerHistory: string[]; // e.g. ["전) 호텔신라 베이커리 선임 파티시에", "현) 아뜰리에 브레드 대표"]
  certifications: string[]; // e.g. ["제과기능장", "제빵기능사", "바리스타 1급"]
  awards: string[]; // e.g. ["2023 대한민국 베이커리 페스티벌 금상"]
  introduction: string; // 강사 소개글
  profileImageUrl: string;
  specialties: string[]; // e.g. ["홈베이킹", "천연발효종", "디저트 플레이팅"]
  majorCourses: MajorCourseInfo[];
  rating?: number;
  totalReviews?: number;
}

export interface PrintableLeafletData {
  header: {
    instructorName: string;
    headlineTitle: string;
    profileImageUrl: string;
    specialtiesBadge: string[];
  };
  credentials: {
    academic: string;
    careers: string[];
    certifications: string[];
    awards: string[];
  };
  introduction: string;
  courses: MajorCourseInfo[];
  footer: {
    centerName: string;
    contactPhone: string;
    locationInfo: string;
    qrPayload: string;
  };
}

/**
 * 강사 스펙 입력값 유효성 검증
 */
export function validateInstructorProfile(
  profile: Partial<InstructorProfile>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!profile.staffName || profile.staffName.trim() === '') {
    errors.push('강사 성명은 필수입니다.');
  }
  if (!profile.headlineTitle || profile.headlineTitle.trim() === '') {
    errors.push('대표 강의 타이틀은 필수입니다.');
  }
  if (!profile.introduction || profile.introduction.trim().length < 10) {
    errors.push('강사 소개글은 최소 10자 이상 입력해야 합니다.');
  }
  if (!profile.specialties || profile.specialties.length === 0) {
    errors.push('전문 강의 분야를 최소 1개 이상 지정해야 합니다.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * A4 인쇄용 포스터 및 모바일 안내 카드 데이터 정형화
 */
export function generatePrintableLeafletData(
  profile: InstructorProfile,
  centerInfo?: { centerName?: string; phone?: string; location?: string }
): PrintableLeafletData {
  const centerName = centerInfo?.centerName || '모아 평생교육원 & 문화센터';
  const contactPhone = centerInfo?.phone || '02-555-1234';
  const locationInfo = centerInfo?.location || '문화센터 본관 3층 안내데스크';

  // 모바일 공유 및 QR 탑재용 간이 URL 페이로드
  const qrPayload = `https://moa.center/instructors/${profile.staffId}`;

  return {
    header: {
      instructorName: profile.staffName,
      headlineTitle: profile.headlineTitle,
      profileImageUrl: profile.profileImageUrl || '/placeholder-instructor.png',
      specialtiesBadge: profile.specialties,
    },
    credentials: {
      academic: profile.academicBackground || '전문 분야 수학',
      careers: profile.careerHistory || [],
      certifications: profile.certifications || [],
      awards: profile.awards || [],
    },
    introduction: profile.introduction,
    courses: profile.majorCourses || [],
    footer: {
      centerName,
      contactPhone,
      locationInfo,
      qrPayload,
    },
  };
}
