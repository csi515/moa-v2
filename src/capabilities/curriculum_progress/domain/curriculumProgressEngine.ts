/**
 * 교육·레슨 학습 진도 및 성장 리포트 순수 도메인 엔진 (Pure Functions)
 *
 * 대상 업종: 교육 8종 (피아노, 미술, 어학, 태권도, 코딩 등) 및 레슨형 스포츠 (수영, 골프, PT)
 * 주요 기능:
 *  1. 단원/교재별 진도율 및 마스터 뱃지 산출
 *  2. 급수/승급 심사 조건 평가 (태권도 띠, 체르니 레벨, 수영 영법 마스터)
 *  3. 월간 학습/운동 성장 리포트 통계 집계 및 리포트 요약문 생성
 */

export interface CurriculumItemDefinition {
  id: string;
  levelId: string;
  title: string;
  sortOrder: number;
  required?: boolean;
  metadata?: Record<string, unknown>; // 음악·체육 등 업종별 JSONB 확장 메타데이터 (e.g. { composer, songKey, bookTitle })
}

export interface StudentProgressRecord {
  curriculumItemId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'mastered';
  score?: number; // 0 ~ 100
  completedAt?: string;
  notes?: string;
  metadata?: Record<string, unknown>; // 승인·스탬프 등 업종별 확장 메타데이터 (e.g. { stampsCount, approvedBy, audioUrl })
}

export interface CurriculumProgressSummary {
  totalItems: number;
  completedItems: number;
  masteredItems: number;
  progressPercent: number; // 0 ~ 100
  isLevelCompleted: boolean;
  earnedBadge?: string;
}

export interface AdvancementCriteria {
  minProgressPercent: number; // e.g. 80%
  requireAllMandatory: boolean;
  minMasteredCount?: number;
  badgeOnPass?: string;
}

export interface AdvancementResult {
  passed: boolean;
  reason: string;
  currentPercent: number;
  missingMandatoryItemIds: string[];
  awardedBadge?: string;
}

export interface MonthlyGrowthInput {
  studentName: string;
  yearMonth: string; // YYYY-MM
  attendanceRate: number; // 0 ~ 100
  practiceMinutes: number;
  lessonsCount: number;
  completedItemsCount: number;
  instructorComment?: string;
}

export interface MonthlyGrowthReportSummary {
  studentName: string;
  yearMonth: string;
  headline: string;
  performanceGrade: 'EXCELLENT' | 'GOOD' | 'NEEDS_EFFORT';
  summaryText: string;
  metrics: {
    attendanceRate: number;
    practiceHours: number;
    lessonsCount: number;
    completedItemsCount: number;
  };
}

/**
 * 1. 단원/교재별 진도율 및 마스터 상태 계산 (순수 함수)
 */
export function calculateCurriculumProgress(
  items: readonly CurriculumItemDefinition[],
  progressList: readonly StudentProgressRecord[]
): CurriculumProgressSummary {
  if (!items || items.length === 0) {
    return {
      totalItems: 0,
      completedItems: 0,
      masteredItems: 0,
      progressPercent: 0,
      isLevelCompleted: true,
    };
  }

  const progressMap = new Map<string, StudentProgressRecord>();
  progressList.forEach((p) => progressMap.set(p.curriculumItemId, p));

  let completedCount = 0;
  let masteredCount = 0;

  for (const item of items) {
    const record = progressMap.get(item.id);
    if (!record) continue;

    if (record.status === 'completed') {
      completedCount++;
    } else if (record.status === 'mastered') {
      completedCount++;
      masteredCount++;
    }
  }

  const progressPercent = Math.min(100, Math.round((completedCount / items.length) * 100));
  const isLevelCompleted = completedCount >= items.length;

  let earnedBadge: string | undefined;
  if (masteredCount >= items.length) {
    earnedBadge = 'PERFECT_MASTER';
  } else if (isLevelCompleted) {
    earnedBadge = 'COURSE_COMPLETED';
  }

  return {
    totalItems: items.length,
    completedItems: completedCount,
    masteredItems: masteredCount,
    progressPercent,
    isLevelCompleted,
    earnedBadge,
  };
}

/**
 * 2. 급수·승급 심사 조건 평가 (순수 함수)
 */
export function evaluateLevelAdvancement(
  items: readonly CurriculumItemDefinition[],
  progressList: readonly StudentProgressRecord[],
  criteria: AdvancementCriteria
): AdvancementResult {
  const summary = calculateCurriculumProgress(items, progressList);
  const progressMap = new Map<string, StudentProgressRecord>();
  progressList.forEach((p) => progressMap.set(p.curriculumItemId, p));

  const missingMandatoryItemIds: string[] = [];

  if (criteria.requireAllMandatory) {
    for (const item of items) {
      if (item.required) {
        const record = progressMap.get(item.id);
        const isDone = record?.status === 'completed' || record?.status === 'mastered';
        if (!isDone) {
          missingMandatoryItemIds.push(item.id);
        }
      }
    }
  }

  if (missingMandatoryItemIds.length > 0) {
    return {
      passed: false,
      reason: `필수 단원 ${missingMandatoryItemIds.length}개가 아직 미완료 상태입니다.`,
      currentPercent: summary.progressPercent,
      missingMandatoryItemIds,
    };
  }

  if (summary.progressPercent < criteria.minProgressPercent) {
    return {
      passed: false,
      reason: `진도율이 기준치(${criteria.minProgressPercent}%)에 미달합니다. (현재: ${summary.progressPercent}%)`,
      currentPercent: summary.progressPercent,
      missingMandatoryItemIds,
    };
  }

  if (criteria.minMasteredCount && summary.masteredItems < criteria.minMasteredCount) {
    return {
      passed: false,
      reason: `마스터 단원 수(${summary.masteredItems}개)가 기준(${criteria.minMasteredCount}개)에 미달합니다.`,
      currentPercent: summary.progressPercent,
      missingMandatoryItemIds,
    };
  }

  return {
    passed: true,
    reason: '승급 심사 기준을 모두 만족하였습니다.',
    currentPercent: summary.progressPercent,
    missingMandatoryItemIds: [],
    awardedBadge: criteria.badgeOnPass,
  };
}

/**
 * 3. 월간 학습 성장 리포트 자동 집계 (순수 함수)
 */
export function generateMonthlyGrowthReport(input: MonthlyGrowthInput): MonthlyGrowthReportSummary {
  const practiceHours = Math.round((input.practiceMinutes / 60) * 10) / 10;

  let performanceGrade: 'EXCELLENT' | 'GOOD' | 'NEEDS_EFFORT';
  if (input.attendanceRate >= 90 && input.completedItemsCount >= 2) {
    performanceGrade = 'EXCELLENT';
  } else if (input.attendanceRate >= 70) {
    performanceGrade = 'GOOD';
  } else {
    performanceGrade = 'NEEDS_EFFORT';
  }

  let headline: string;
  let summaryText: string;

  if (performanceGrade === 'EXCELLENT') {
    headline = `${input.studentName} 학생은 이번 달 뛰어난 집중력과 성취를 보여주었습니다!`;
    summaryText = `${input.yearMonth} 기간 동안 출석률 ${input.attendanceRate}%, 총 ${practiceHours}시간의 연습을 기록하였으며, ${input.completedItemsCount}개의 단원을 마스터하였습니다.`;
  } else if (performanceGrade === 'GOOD') {
    headline = `${input.studentName} 학생은 꾸준한 페이스로 안정적인 성장을 이어가고 있습니다.`;
    summaryText = `${input.yearMonth} 기간 동안 출석률 ${input.attendanceRate}%, ${input.lessonsCount}회의 정규 수업을 성실히 이수하였습니다.`;
  } else {
    headline = `${input.studentName} 학생의 다음 달 학습 동기 부여와 출석 독려가 권장됩니다.`;
    summaryText = `${input.yearMonth} 기간 출석률 ${input.attendanceRate}%로, 다음 달에는 정기 레슨 참석과 연습 시간 확대를 목표로 지도할 계획입니다.`;
  }

  if (input.instructorComment?.trim()) {
    summaryText += `\n[강사 총평] ${input.instructorComment.trim()}`;
  }

  return {
    studentName: input.studentName,
    yearMonth: input.yearMonth,
    headline,
    performanceGrade,
    summaryText,
    metrics: {
      attendanceRate: input.attendanceRate,
      practiceHours,
      lessonsCount: input.lessonsCount,
      completedItemsCount: input.completedItemsCount,
    },
  };
}

export interface LessonJournalEntry {
  id: string;
  studentId: string;
  studentName: string;
  lessonDate: string; // YYYY-MM-DD
  instructorName: string;
  title: string; // e.g. "체르니 100번 12번곡 양손 밸런스 지도", "수채화 명암 표현"
  notes: string; // 수업 내용 및 칭찬 코멘트
  photoUrls: string[]; // 수업/완성작 사진 (최대 4장)
  videoUrl?: string; // 연주/자세 클립 링크
  skillsPracticed?: string[]; // 연습 테크닉 (예: ["스타카토", "페달링", "손목 힘빼기"])
  homePracticeGuide?: string; // 가정 내 10분 연습 가이드
  guardianFeedback?: {
    comment: string;
    respondedAt: string;
  };
  createdAt: string;
}

export interface MonthlyJournalGroup {
  yearMonth: string; // YYYY-MM
  count: number;
  entries: LessonJournalEntry[];
}

/**
 * 4. 레슨 저널(수업 알림장) 엔트리 생성 및 검증 (순수 함수)
 */
export function createLessonJournalEntry(params: {
  id?: string;
  studentId: string;
  studentName: string;
  lessonDate: string;
  instructorName: string;
  title: string;
  notes: string;
  photoUrls?: readonly string[];
  videoUrl?: string;
  skillsPracticed?: readonly string[];
  homePracticeGuide?: string;
  createdAt?: string;
}): LessonJournalEntry {
  const cleanPhotos = (params.photoUrls ?? [])
    .map((u) => u.trim())
    .filter((u) => u.length > 0)
    .slice(0, 4);

  const cleanSkills = (params.skillsPracticed ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return {
    id: params.id ?? `jnl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    studentId: params.studentId,
    studentName: params.studentName,
    lessonDate: params.lessonDate.slice(0, 10),
    instructorName: params.instructorName.trim(),
    title: params.title.trim() || '오늘의 수업 알림장',
    notes: params.notes.trim(),
    photoUrls: cleanPhotos,
    videoUrl: params.videoUrl?.trim(),
    skillsPracticed: cleanSkills,
    homePracticeGuide: params.homePracticeGuide?.trim(),
    createdAt: params.createdAt ?? new Date().toISOString(),
  };
}

/**
 * 5. 학생별 레슨 저널 타임라인 월별 그룹핑 (순수 함수)
 */
export function groupJournalEntriesByMonth(
  entries: readonly LessonJournalEntry[],
  studentId?: string
): MonthlyJournalGroup[] {
  const filtered = studentId ? entries.filter((e) => e.studentId === studentId) : entries;
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.lessonDate).getTime() - new Date(a.lessonDate).getTime()
  );

  const map = new Map<string, LessonJournalEntry[]>();
  for (const entry of sorted) {
    const ym = entry.lessonDate.slice(0, 7);
    const list = map.get(ym) ?? [];
    list.push(entry);
    map.set(ym, list);
  }

  return Array.from(map.entries()).map(([yearMonth, list]) => ({
    yearMonth,
    count: list.length,
    entries: list,
  }));
}

/**
 * 6. 학부모 감사/응원 코멘트 작성 (순수 함수)
 */
export function attachGuardianFeedback(
  entry: LessonJournalEntry,
  comment: string,
  respondedAt: string = new Date().toISOString()
): LessonJournalEntry {
  return {
    ...entry,
    guardianFeedback: {
      comment: comment.trim(),
      respondedAt,
    },
  };
}

