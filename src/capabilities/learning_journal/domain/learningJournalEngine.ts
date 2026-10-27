/**
 * 수업 일지 및 성장 포트폴리오 피드 도메인 엔진 (Pure Domain Function)
 * 일지 유효성 검증, 학부모 안심 확인 상태 머신, 확인율 통계
 */

export interface LearningJournal {
  id: string;
  organization_id: string;
  student_id: string;
  author_staff_id: string;
  lesson_date: string; // YYYY-MM-DD
  title: string;
  content: string;
  practice_homework?: string | null;
  media_urls: string[];
  parent_viewed_at?: string | null;
  parent_acknowledgement: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningJournalComment {
  id: string;
  journal_id: string;
  author_id: string;
  author_role: 'staff' | 'parent';
  author_name: string;
  content: string;
  created_at: string;
}

export interface JournalValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 수업 일지 작성/수정 유효성 검증
 */
export function validateJournalEntry(entry: {
  title: string;
  content: string;
  lesson_date: string;
  student_id: string;
}): JournalValidationResult {
  if (!entry.student_id || entry.student_id.trim() === '') {
    return { valid: false, error: '수업 대상 원생(학생)을 선택해야 합니다.' };
  }
  if (!entry.title || entry.title.trim().length < 2) {
    return { valid: false, error: '수업 일지 제목을 최소 2자 이상 입력해주세요.' };
  }
  if (!entry.content || entry.content.trim().length < 5) {
    return { valid: false, error: '수업 내용 및 피드백을 최소 5자 이상 입력해주세요.' };
  }
  if (!entry.lesson_date || isNaN(Date.parse(entry.lesson_date))) {
    return { valid: false, error: '유효한 수업 일자를 지정해주세요.' };
  }

  return { valid: true };
}

/**
 * 학부모 안심 확인(읽음/서명) 상태머신
 */
export function acknowledgeJournalByParent(
  journal: LearningJournal,
  viewedAt: string = new Date().toISOString()
): LearningJournal {
  return {
    ...journal,
    parent_viewed_at: journal.parent_viewed_at ?? viewedAt,
    parent_acknowledgement: true,
    updated_at: viewedAt,
  };
}

export interface JournalStats {
  totalJournals: number;
  acknowledgedCount: number;
  acknowledgementRate: number; // 학부모 확인율 (%)
  withHomeworkCount: number; // 과제 포함 일지 수
}

/**
 * 학부모 피드 확인율 및 통계 집계
 */
export function calculateJournalStats(journals: LearningJournal[]): JournalStats {
  const total = journals.length;
  if (total === 0) {
    return {
      totalJournals: 0,
      acknowledgedCount: 0,
      acknowledgementRate: 0,
      withHomeworkCount: 0,
    };
  }

  let acknowledged = 0;
  let withHomework = 0;

  journals.forEach((j) => {
    if (j.parent_acknowledgement) acknowledged += 1;
    if (j.practice_homework && j.practice_homework.trim().length > 0) withHomework += 1;
  });

  const acknowledgementRate = Math.round((acknowledged / total) * 1000) / 10;

  return {
    totalJournals: total,
    acknowledgedCount: acknowledged,
    acknowledgementRate,
    withHomeworkCount: withHomework,
  };
}

/**
 * 댓글 작성 유효성 검사
 */
export function validateJournalComment(content: string, authorName: string): JournalValidationResult {
  if (!authorName || authorName.trim() === '') {
    return { valid: false, error: '작성자 이름이 누락되었습니다.' };
  }
  if (!content || content.trim().length === 0) {
    return { valid: false, error: '댓글 내용을 입력해주세요.' };
  }
  if (content.length > 500) {
    return { valid: false, error: '댓글은 최대 500자까지 작성할 수 있습니다.' };
  }
  return { valid: true };
}
