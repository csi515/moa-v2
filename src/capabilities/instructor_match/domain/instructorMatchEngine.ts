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
